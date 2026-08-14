import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ForecastDirection,
  ForecastStatus,
  ForecastTargetMetric,
  Prisma,
  RoleCluster,
} from '@prisma/client';
import type { EnvConfig } from '../config/env.validation';
import { AnalyticsRepository } from '../analytics/analytics.repository';
import {
  MARKET_ROLE_CLUSTERS,
  addUtcDays,
  formatUtcDate,
  toUtcDateOnly,
} from '../common/utils/market.util';
import {
  fitLinearRegression,
  mae,
  predictLinear,
  rollingAverage,
  safeMape,
  stdDev,
} from '../common/utils/forecast-math.util';
import { ForecastRepository } from './forecast.repository';

const MODEL_VERSION = 'forecast-v1';
const STABLE_RELATIVE_THRESHOLD = 0.05;

type SeriesPoint = { date: Date; value: number };

@Injectable()
export class ForecastService {
  private readonly logger = new Logger(ForecastService.name);

  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly forecastRepository: ForecastRepository,
  ) {}

  async generateAll(): Promise<{ created: number; insufficient: number }> {
    const minHistory = this.config.get('SYNC_MIN_HISTORY_DAYS_FOR_FORECAST', {
      infer: true,
    });
    const horizon = this.config.get('SYNC_FORECAST_HORIZON_DAYS', {
      infer: true,
    });

    await this.forecastRepository.deleteAll();

    const activeSources = await this.analyticsRepository.findDailyRoleMetrics({
      clusters: MARKET_ROLE_CLUSTERS,
    });
    const sourceIds = [...new Set(activeSources.map((r) => r.sourceId))];

    let created = 0;
    let insufficient = 0;

    for (const cluster of MARKET_ROLE_CLUSTERS) {
      for (const targetMetric of [
        ForecastTargetMetric.VACANCY_COUNT,
        ForecastTargetMetric.MARKET_SHARE,
      ]) {
        const series = await this.buildSeries(cluster, targetMetric, sourceIds);
        const result = await this.generateOne({
          cluster,
          targetMetric,
          horizonDays: horizon,
          minHistory,
          series,
        });
        created += 1;
        if (result.status === ForecastStatus.INSUFFICIENT_HISTORY) {
          insufficient += 1;
        }
      }
    }

    this.logger.log(
      `Generated ${created} forecasts (${insufficient} insufficient history)`,
    );
    return { created, insufficient };
  }

  async list(query: {
    cluster?: RoleCluster;
    targetMetric?: ForecastTargetMetric;
    horizonDays?: number;
  }) {
    const items = await this.forecastRepository.findMany(query);
    return {
      items: items.map((item) => this.toListItem(item)),
      count: items.length,
    };
  }

  async getOne(id: string) {
    const forecast = await this.forecastRepository.findById(id);
    if (!forecast) {
      throw new NotFoundException(`Forecast not found: ${id}`);
    }
    const backtest = await this.forecastRepository.findLatestBacktest({
      roleCluster: forecast.roleCluster,
      targetMetric: forecast.targetMetric,
      modelName: forecast.modelName,
    });
    return {
      ...this.toListItem(forecast),
      points: forecast.points.map((point) => ({
        forecastDate: formatUtcDate(point.forecastDate),
        predictedValue: Number(point.predictedValue),
        lowerBound: point.lowerBound === null ? null : Number(point.lowerBound),
        upperBound: point.upperBound === null ? null : Number(point.upperBound),
        actualValue:
          point.actualValue === null ? null : Number(point.actualValue),
      })),
      backtest: backtest
        ? {
            id: backtest.id,
            mae: backtest.mae === null ? null : Number(backtest.mae),
            mape: backtest.mape === null ? null : Number(backtest.mape),
            sampleSize: backtest.sampleSize,
            evaluatedAt: backtest.evaluatedAt,
            trainStartDate: formatUtcDate(backtest.trainStartDate),
            trainEndDate: formatUtcDate(backtest.trainEndDate),
            testStartDate: formatUtcDate(backtest.testStartDate),
            testEndDate: formatUtcDate(backtest.testEndDate),
          }
        : null,
    };
  }

  async explain(id: string) {
    const detail = await this.getOne(id);
    return {
      forecastId: detail.id,
      status: detail.status,
      model: {
        name: detail.modelName,
        version: detail.modelVersion,
      },
      trainWindow: {
        start: detail.trainStartDate,
        end: detail.trainEndDate,
      },
      dataQuality: {
        sampleSize: detail.sampleSize,
        historyStatus: detail.status,
      },
      drivers: detail.explanation,
      risks: detail.riskFactors,
      backtest: detail.backtest,
      disclaimer:
        'Прогноз описывает ожидаемое изменение в доступной выборке вакансий, а не будущее всей профессии.',
    };
  }

  private async generateOne(input: {
    cluster: RoleCluster;
    targetMetric: ForecastTargetMetric;
    horizonDays: number;
    minHistory: number;
    series: SeriesPoint[];
  }): Promise<{ status: ForecastStatus }> {
    const generatedAt = new Date();
    const values = input.series.map((p) => p.value);
    const riskFactors: string[] = [];
    const explanation: {
      algorithm: string;
      targetMetric: ForecastTargetMetric;
      roleCluster: RoleCluster;
      reason?: string;
      daysWithData?: number;
      daysNeeded?: number;
      selectedModel?: string;
      backtestMae?: number;
      backtestMape?: number | null;
      lastActual?: number;
      predictedHorizonValue?: number;
      directionRule?: string;
    } = {
      algorithm: 'Select rolling_average vs linear_trend by backtest MAE',
      targetMetric: input.targetMetric,
      roleCluster: input.cluster,
    };

    if (input.series.length < input.minHistory) {
      riskFactors.push('insufficient_history');
      riskFactors.push(`days_with_data=${input.series.length}`);
      riskFactors.push(`days_needed=${input.minHistory}`);
      explanation.reason = 'INSUFFICIENT_HISTORY';
      explanation.daysWithData = input.series.length;
      explanation.daysNeeded = input.minHistory;

      const trainStart = input.series[0]?.date ?? toUtcDateOnly(generatedAt);
      const trainEnd =
        input.series[input.series.length - 1]?.date ?? trainStart;

      await this.forecastRepository.createForecast({
        roleCluster: input.cluster,
        targetMetric: input.targetMetric,
        horizonDays: input.horizonDays,
        modelName: 'none',
        modelVersion: MODEL_VERSION,
        trainStartDate: trainStart,
        trainEndDate: trainEnd,
        generatedAt,
        predictedValue: new Prisma.Decimal(0),
        lowerBound: null,
        upperBound: null,
        direction: ForecastDirection.STABLE,
        confidence: new Prisma.Decimal(0),
        sampleSize: input.series.length,
        riskFactors,
        explanation: explanation,
        status: ForecastStatus.INSUFFICIENT_HISTORY,
      });
      return { status: ForecastStatus.INSUFFICIENT_HISTORY };
    }

    const testSize = Math.max(
      3,
      Math.min(7, Math.floor(input.series.length / 3)),
    );
    const trainValues = values.slice(0, values.length - testSize);
    const testActual = values.slice(values.length - testSize);

    const rollingPred = this.predictRollingWindow(trainValues, testSize, 7);
    const linearPred = this.predictLinearWindow(trainValues, testSize);
    const rollingMae = mae(testActual, rollingPred) ?? Number.POSITIVE_INFINITY;
    const linearMae = mae(testActual, linearPred) ?? Number.POSITIVE_INFINITY;

    const useLinear = linearMae < rollingMae;
    const modelName = useLinear ? 'linear_trend' : 'rolling_average';
    const selectedPred = useLinear ? linearPred : rollingPred;
    const selectedMae = useLinear ? linearMae : rollingMae;
    const selectedMape = safeMape(testActual, selectedPred);

    const trainStart = input.series[0].date;
    const trainEnd = input.series[input.series.length - 1].date;
    const testStart = input.series[input.series.length - testSize].date;
    const testEnd = trainEnd;

    await this.forecastRepository.createBacktest({
      roleCluster: input.cluster,
      targetMetric: input.targetMetric,
      modelName,
      evaluatedAt: generatedAt,
      trainStartDate: trainStart,
      trainEndDate: input.series[input.series.length - testSize - 1].date,
      testStartDate: testStart,
      testEndDate: testEnd,
      sampleSize: testSize,
      mae: new Prisma.Decimal(selectedMae.toFixed(6)),
      mape:
        selectedMape === null
          ? null
          : new Prisma.Decimal(selectedMape.toFixed(6)),
      metadata: {
        candidateModels: {
          rolling_average: { mae: rollingMae },
          linear_trend: { mae: linearMae },
        },
        selected: modelName,
      },
    });

    const future = this.forecastForward(values, modelName, input.horizonDays);
    const lastActual = values[values.length - 1];
    const predictedValue = future[future.length - 1];
    const direction = this.directionFrom(lastActual, predictedValue);
    const residualStd = stdDev(testActual.map((a, i) => a - selectedPred[i]));
    const band = Math.max(residualStd * 1.96, Math.abs(predictedValue) * 0.05);

    if ((selectedMape ?? 1) > 0.35) {
      riskFactors.push('high_backtest_error');
    }
    if (stdDev(values) / Math.max(Math.abs(meanOrZero(values)), 1) > 0.5) {
      riskFactors.push('high_volatility');
    }
    if (input.series.length < input.minHistory * 2) {
      riskFactors.push('short_history');
    }
    if (
      lastActual < 3 &&
      input.targetMetric === ForecastTargetMetric.VACANCY_COUNT
    ) {
      riskFactors.push('small_sample');
    }

    const confidence = this.computeConfidence({
      days: input.series.length,
      minHistory: input.minHistory,
      mape: selectedMape,
      volatility: stdDev(values),
      level: Math.abs(meanOrZero(values)),
    });

    explanation.selectedModel = modelName;
    explanation.backtestMae = selectedMae;
    explanation.backtestMape = selectedMape;
    explanation.lastActual = lastActual;
    explanation.predictedHorizonValue = predictedValue;
    explanation.directionRule = `STABLE if |change| < ${STABLE_RELATIVE_THRESHOLD * 100}% of last actual`;

    const forecast = await this.forecastRepository.createForecast({
      roleCluster: input.cluster,
      targetMetric: input.targetMetric,
      horizonDays: input.horizonDays,
      modelName,
      modelVersion: MODEL_VERSION,
      trainStartDate: trainStart,
      trainEndDate: trainEnd,
      generatedAt,
      predictedValue: new Prisma.Decimal(predictedValue.toFixed(6)),
      lowerBound: new Prisma.Decimal(
        Math.max(0, predictedValue - band).toFixed(6),
      ),
      upperBound: new Prisma.Decimal((predictedValue + band).toFixed(6)),
      direction,
      confidence: new Prisma.Decimal(confidence.toFixed(4)),
      sampleSize: input.series.length,
      riskFactors,
      explanation: explanation,
      status: ForecastStatus.READY,
    });

    const points = future.map((value, index) => {
      const forecastDate = addUtcDays(trainEnd, index + 1);
      return {
        forecastId: forecast.id,
        forecastDate,
        predictedValue: new Prisma.Decimal(value.toFixed(6)),
        lowerBound: new Prisma.Decimal(Math.max(0, value - band).toFixed(6)),
        upperBound: new Prisma.Decimal((value + band).toFixed(6)),
      };
    });
    await this.forecastRepository.createPoints(points);

    return { status: ForecastStatus.READY };
  }

  private async buildSeries(
    cluster: RoleCluster,
    targetMetric: ForecastTargetMetric,
    sourceIds: string[],
  ): Promise<SeriesPoint[]> {
    const rows = await this.analyticsRepository.findDailyRoleMetrics({
      sourceIds: sourceIds.length ? sourceIds : undefined,
      clusters: [cluster],
    });

    const byDate = new Map<
      string,
      { vacancyCount: number; marketShareWeighted: number; weight: number }
    >();
    for (const row of rows) {
      const key = formatUtcDate(row.metricDate);
      const current = byDate.get(key) ?? {
        vacancyCount: 0,
        marketShareWeighted: 0,
        weight: 0,
      };
      current.vacancyCount += row.vacancyCount;
      current.marketShareWeighted += Number(row.marketShare) * row.vacancyCount;
      current.weight += row.vacancyCount;
      byDate.set(key, current);
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, agg]) => ({
        date: new Date(`${date}T00:00:00.000Z`),
        value:
          targetMetric === ForecastTargetMetric.VACANCY_COUNT
            ? agg.vacancyCount
            : agg.weight === 0
              ? 0
              : agg.marketShareWeighted / agg.weight,
      }));
  }

  private predictRollingWindow(
    train: number[],
    steps: number,
    window: number,
  ): number[] {
    const history = [...train];
    const out: number[] = [];
    for (let i = 0; i < steps; i += 1) {
      const next = rollingAverage(history, window);
      out.push(next);
      history.push(next);
    }
    return out;
  }

  private predictLinearWindow(train: number[], steps: number): number[] {
    const fit = fitLinearRegression(train);
    const out: number[] = [];
    for (let i = 0; i < steps; i += 1) {
      out.push(Math.max(0, predictLinear(fit, train.length + i)));
    }
    return out;
  }

  private forecastForward(
    values: number[],
    modelName: string,
    horizonDays: number,
  ): number[] {
    if (modelName === 'linear_trend') {
      return this.predictLinearWindow(values, horizonDays);
    }
    return this.predictRollingWindow(values, horizonDays, 7);
  }

  private directionFrom(
    lastActual: number,
    predicted: number,
  ): ForecastDirection {
    const base = Math.max(Math.abs(lastActual), 1e-6);
    const rel = (predicted - lastActual) / base;
    if (Math.abs(rel) < STABLE_RELATIVE_THRESHOLD) {
      return ForecastDirection.STABLE;
    }
    return rel > 0 ? ForecastDirection.UP : ForecastDirection.DOWN;
  }

  private computeConfidence(input: {
    days: number;
    minHistory: number;
    mape: number | null;
    volatility: number;
    level: number;
  }): number {
    const historyScore = Math.min(1, input.days / (input.minHistory * 2));
    const mapeScore =
      input.mape === null ? 0.4 : Math.max(0, 1 - Math.min(input.mape, 1));
    const volRatio = input.volatility / Math.max(input.level, 1e-6);
    const stabilityScore = Math.max(0, 1 - Math.min(volRatio, 1));
    return Number(
      Math.min(
        0.95,
        Math.max(
          0.1,
          0.35 * historyScore + 0.4 * mapeScore + 0.25 * stabilityScore,
        ),
      ).toFixed(4),
    );
  }

  private toListItem(forecast: {
    id: string;
    roleCluster: RoleCluster;
    targetMetric: ForecastTargetMetric;
    horizonDays: number;
    modelName: string;
    modelVersion: string;
    trainStartDate: Date;
    trainEndDate: Date;
    generatedAt: Date;
    predictedValue: Prisma.Decimal;
    lowerBound: Prisma.Decimal | null;
    upperBound: Prisma.Decimal | null;
    direction: ForecastDirection;
    confidence: Prisma.Decimal;
    sampleSize: number;
    riskFactors: Prisma.JsonValue;
    explanation: Prisma.JsonValue;
    status: ForecastStatus;
  }) {
    return {
      id: forecast.id,
      roleCluster: forecast.roleCluster,
      targetMetric: forecast.targetMetric,
      horizonDays: forecast.horizonDays,
      modelName: forecast.modelName,
      modelVersion: forecast.modelVersion,
      trainStartDate: formatUtcDate(forecast.trainStartDate),
      trainEndDate: formatUtcDate(forecast.trainEndDate),
      generatedAt: forecast.generatedAt,
      predictedValue: Number(forecast.predictedValue),
      lowerBound:
        forecast.lowerBound === null ? null : Number(forecast.lowerBound),
      upperBound:
        forecast.upperBound === null ? null : Number(forecast.upperBound),
      direction: forecast.direction,
      confidence: Number(forecast.confidence),
      sampleSize: forecast.sampleSize,
      riskFactors: forecast.riskFactors,
      explanation: forecast.explanation,
      status: forecast.status,
    };
  }
}

function meanOrZero(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
