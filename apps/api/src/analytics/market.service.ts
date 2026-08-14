import { Injectable, NotFoundException } from '@nestjs/common';
import { DailyRoleMetric, Prisma, RoleCluster } from '@prisma/client';
import { SourcesRepository } from '../sources/sources.repository';
import {
  MARKET_ROLE_CLUSTERS,
  addUtcDays,
  formatUtcDate,
  growthRate,
  periodToDays,
  startOfPeriodWindow,
  toUtcDateOnly,
  type MarketPeriod,
} from '../common/utils/market.util';
import { AnalyticsRepository } from './analytics.repository';

type TrendMetric = 'vacancyCount' | 'marketShare' | 'medianSalary';

@Injectable()
export class MarketService {
  constructor(
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  async getOverview(query: {
    period?: MarketPeriod;
    source?: string;
    areaId?: string;
  }) {
    const period = query.period ?? '30d';
    const { sourceIds, sourceLabel } = await this.resolveSources(query.source);
    const bounds = await this.analyticsRepository.metricDateBounds(sourceIds);
    const end = bounds.max
      ? toUtcDateOnly(bounds.max)
      : toUtcDateOnly(new Date());
    const days = periodToDays(period);
    const currentStart = startOfPeriodWindow(end, days);
    const previousEnd = addUtcDays(currentStart, -1);
    const previousStart = startOfPeriodWindow(previousEnd, days);

    const currentRows = await this.analyticsRepository.findDailyRoleMetrics({
      from: currentStart,
      to: end,
      sourceIds,
      areaId: query.areaId ?? '',
      clusters: MARKET_ROLE_CLUSTERS,
    });
    const previousRows = await this.analyticsRepository.findDailyRoleMetrics({
      from: previousStart,
      to: previousEnd,
      sourceIds,
      areaId: query.areaId ?? '',
      clusters: MARKET_ROLE_CLUSTERS,
    });

    const current = this.aggregateClusters(currentRows);
    const previous = this.aggregateClusters(previousRows);
    const daysWithData =
      await this.analyticsRepository.distinctMetricDays(sourceIds);
    const lastUpdatedAt =
      await this.analyticsRepository.latestVacancyUpdatedAt();
    const totalVacancies = await this.analyticsRepository.countVacancies();

    const roleClusters = MARKET_ROLE_CLUSTERS.map((cluster) => {
      const cur = current.get(cluster) ?? this.emptyAgg();
      const prev = previous.get(cluster) ?? this.emptyAgg();
      return {
        roleCluster: cluster,
        vacancyCount: cur.vacancyCount,
        marketShare: cur.marketShare,
        medianSalaryMidpoint: cur.medianSalaryMidpoint,
        averageSalaryMidpoint: cur.averageSalaryMidpoint,
        salaryCoverageRate: cur.salaryCoverageRate,
        salarySampleSize: cur.salarySampleSize,
        uniqueEmployersCount: cur.uniqueEmployersCount,
        avgClassificationConfidence: cur.avgClassificationConfidence,
        growthRate: growthRate(cur.vacancyCount, prev.vacancyCount),
        previousVacancyCount: prev.vacancyCount,
        sampleSize: cur.vacancyCount,
      };
    });

    const classified = roleClusters.reduce((s, r) => s + r.vacancyCount, 0);
    const caveats = this.buildCaveats({
      sourceLabel,
      daysWithData,
      classified,
      totalVacancies,
      salaryCoverage: this.weightedSalaryCoverage(roleClusters),
    });

    return {
      lastUpdatedAt,
      period,
      source: sourceLabel,
      dataWindow: {
        start: formatUtcDate(currentStart),
        end: formatUtcDate(end),
        daysRequested: days,
        daysWithData,
      },
      coverage: {
        totalVacancies,
        classifiedVacanciesInPeriod: classified,
        salaryCoverageRate: this.weightedSalaryCoverage(roleClusters),
        historyStatus: daysWithData >= 14 ? 'READY' : 'INSUFFICIENT_HISTORY',
        daysNeededForForecast: Math.max(0, 14 - daysWithData),
      },
      roleClusters,
      keyObservation: this.buildKeyObservation(roleClusters, daysWithData),
      caveats,
    };
  }

  async getTrends(query: {
    period?: MarketPeriod;
    source?: string;
    areaId?: string;
    metric?: TrendMetric;
    clusters?: RoleCluster[];
  }) {
    const period = query.period ?? '30d';
    const metric = query.metric ?? 'vacancyCount';
    const clusters =
      query.clusters && query.clusters.length > 0
        ? query.clusters.filter((c) => MARKET_ROLE_CLUSTERS.includes(c))
        : MARKET_ROLE_CLUSTERS;
    const { sourceIds, sourceLabel } = await this.resolveSources(query.source);
    const bounds = await this.analyticsRepository.metricDateBounds(sourceIds);
    const end = bounds.max
      ? toUtcDateOnly(bounds.max)
      : toUtcDateOnly(new Date());
    const days = periodToDays(period);
    const start = startOfPeriodWindow(end, days);
    const rows = await this.analyticsRepository.findDailyRoleMetrics({
      from: start,
      to: end,
      sourceIds,
      areaId: query.areaId ?? '',
      clusters,
    });

    const byDateCluster = new Map<string, DailyRoleMetric[]>();
    for (const row of rows) {
      const key = `${formatUtcDate(row.metricDate)}|${row.roleCluster}`;
      const list = byDateCluster.get(key) ?? [];
      list.push(row);
      byDateCluster.set(key, list);
    }

    const series = [...byDateCluster.entries()].map(([key, group]) => {
      const [date, roleCluster] = key.split('|') as [string, RoleCluster];
      return {
        date,
        roleCluster,
        value: this.metricValue(group, metric),
        sampleSize: group.reduce((s, r) => s + r.vacancyCount, 0),
      };
    });

    const daysWithData = new Set(series.map((p) => p.date)).size;

    return {
      metric,
      period,
      source: sourceLabel,
      dataWindow: {
        start: formatUtcDate(start),
        end: formatUtcDate(end),
        daysRequested: days,
        daysWithData,
      },
      historyStatus: daysWithData >= 2 ? 'READY' : 'INSUFFICIENT_HISTORY',
      series: series.sort((a, b) =>
        a.date === b.date
          ? a.roleCluster.localeCompare(b.roleCluster)
          : a.date.localeCompare(b.date),
      ),
      caveats: this.buildCaveats({
        sourceLabel,
        daysWithData,
        classified: series.reduce((s, p) => s + p.sampleSize, 0),
        totalVacancies: await this.analyticsRepository.countVacancies(),
        salaryCoverage: null,
      }),
    };
  }

  async getCompare(query: {
    period?: MarketPeriod;
    source?: string;
    areaId?: string;
    metric?: TrendMetric;
  }) {
    const overview = await this.getOverview(query);
    const metric = query.metric ?? 'vacancyCount';
    return {
      period: overview.period,
      source: overview.source,
      metric,
      dataWindow: overview.dataWindow,
      historyStatus: overview.coverage.historyStatus,
      rows: overview.roleClusters.map((row) => ({
        roleCluster: row.roleCluster,
        current: this.pickCompareValue(row, metric),
        previousVacancyCount: row.previousVacancyCount,
        growthRate: row.growthRate,
        marketShare: row.marketShare,
        sampleSize: row.sampleSize,
      })),
      caveats: overview.caveats,
    };
  }

  async getSkillsTrending(query: {
    cluster?: RoleCluster;
    period?: MarketPeriod;
    limit?: number;
  }) {
    const period = query.period ?? '30d';
    const limit = query.limit ?? 20;
    const bounds = await this.analyticsRepository.metricDateBounds();
    const end = bounds.max
      ? toUtcDateOnly(bounds.max)
      : toUtcDateOnly(new Date());
    const days = periodToDays(period);
    const currentStart = startOfPeriodWindow(end, days);
    const previousEnd = addUtcDays(currentStart, -1);
    const previousStart = startOfPeriodWindow(previousEnd, days);
    const clusters = query.cluster ? [query.cluster] : MARKET_ROLE_CLUSTERS;

    const current = await this.analyticsRepository.findDailySkillMetrics({
      from: currentStart,
      to: end,
      clusters,
    });
    const previous = await this.analyticsRepository.findDailySkillMetrics({
      from: previousStart,
      to: previousEnd,
      clusters,
    });

    const currentAgg = this.aggregateSkills(current);
    const previousAgg = this.aggregateSkills(previous);

    const items = [...currentAgg.entries()]
      .map(([key, cur]) => {
        const prev = previousAgg.get(key);
        const previousCount = prev?.vacancyCount ?? 0;
        const growth = growthRate(cur.vacancyCount, previousCount);
        const notes: string[] = [];
        if (cur.vacancyCount < 3) {
          notes.push('Small sample; growth is noisy.');
        }
        if (previousCount === 0 && cur.vacancyCount > 0) {
          notes.push(
            'No baseline in previous window; growth is not conclusive.',
          );
        }
        return {
          roleCluster: cur.roleCluster,
          skill: { code: cur.code, name: cur.name },
          currentCount: cur.vacancyCount,
          previousCount,
          growthRate:
            previousCount === 0 && cur.vacancyCount > 0 ? null : growth,
          shareWithinCluster: cur.share,
          dataNotes: notes,
        };
      })
      .sort((a, b) => b.currentCount - a.currentCount)
      .slice(0, limit);

    const daysWithData = await this.analyticsRepository.distinctMetricDays();

    return {
      period,
      cluster: query.cluster ?? 'ALL',
      dataWindow: {
        start: formatUtcDate(currentStart),
        end: formatUtcDate(end),
        daysWithData,
      },
      historyStatus: daysWithData >= 2 ? 'READY' : 'INSUFFICIENT_HISTORY',
      items,
      caveats: [
        'Skill frequency is measured from available vacancy descriptions and extracted dictionary matches only.',
      ],
    };
  }

  async getSkillsMatrix(query: {
    period?: MarketPeriod;
    limitPerCluster?: number;
  }) {
    const trending = await this.getSkillsTrending({
      period: query.period,
      limit: 500,
    });
    const limit = query.limitPerCluster ?? 10;
    const matrix = MARKET_ROLE_CLUSTERS.map((cluster) => ({
      roleCluster: cluster,
      skills: trending.items
        .filter((item) => item.roleCluster === cluster)
        .slice(0, limit)
        .map((item) => ({
          skill: item.skill,
          vacancyCount: item.currentCount,
          shareWithinCluster: item.shareWithinCluster,
        })),
    }));

    return {
      period: trending.period,
      dataWindow: trending.dataWindow,
      historyStatus: trending.historyStatus,
      matrix,
      caveats: trending.caveats,
    };
  }

  private async resolveSources(source?: string): Promise<{
    sourceIds: string[] | undefined;
    sourceLabel: string;
  }> {
    const code = (source ?? 'ALL').toUpperCase();
    if (code === 'ALL') {
      const sources = await this.sourcesRepository.findAll();
      const activeOrWithData = sources.filter((s) => s.isActive);
      return {
        sourceIds:
          activeOrWithData.length > 0
            ? activeOrWithData.map((s) => s.id)
            : sources.map((s) => s.id),
        sourceLabel: 'ALL',
      };
    }
    const found = await this.sourcesRepository.findByCode(code);
    if (!found) {
      throw new NotFoundException(`Unknown source code: ${code}`);
    }
    return { sourceIds: [found.id], sourceLabel: found.code };
  }

  private aggregateClusters(rows: DailyRoleMetric[]): Map<
    RoleCluster,
    {
      vacancyCount: number;
      marketShare: number;
      medianSalaryMidpoint: number | null;
      averageSalaryMidpoint: number | null;
      salaryCoverageRate: number;
      salarySampleSize: number;
      uniqueEmployersCount: number;
      avgClassificationConfidence: number | null;
    }
  > {
    const map = new Map<
      RoleCluster,
      {
        vacancyCount: number;
        marketShareNumerator: number;
        salaryWeighted: number[];
        salaryCoverageWeighted: number;
        salarySampleSize: number;
        employers: number;
        confidenceWeighted: number[];
      }
    >();

    const totalsByDate = new Map<string, number>();
    for (const row of rows) {
      if (!MARKET_ROLE_CLUSTERS.includes(row.roleCluster)) {
        continue;
      }
      const dateKey = formatUtcDate(row.metricDate);
      totalsByDate.set(
        dateKey,
        (totalsByDate.get(dateKey) ?? 0) + row.vacancyCount,
      );
    }

    for (const row of rows) {
      if (!MARKET_ROLE_CLUSTERS.includes(row.roleCluster)) {
        continue;
      }
      const current = map.get(row.roleCluster) ?? {
        vacancyCount: 0,
        marketShareNumerator: 0,
        salaryWeighted: [],
        salaryCoverageWeighted: 0,
        salarySampleSize: 0,
        employers: 0,
        confidenceWeighted: [],
      };
      current.vacancyCount += row.vacancyCount;
      current.marketShareNumerator += row.vacancyCount;
      current.employers += row.uniqueEmployersCount;
      current.salarySampleSize += row.salarySampleSize;
      current.salaryCoverageWeighted +=
        Number(row.salaryCoverageRate) * row.vacancyCount;
      if (row.medianSalaryMidpoint !== null && row.salarySampleSize > 0) {
        for (let i = 0; i < row.salarySampleSize; i += 1) {
          current.salaryWeighted.push(Number(row.medianSalaryMidpoint));
        }
      }
      if (row.avgClassificationConfidence !== null) {
        current.confidenceWeighted.push(
          Number(row.avgClassificationConfidence),
        );
      }
      map.set(row.roleCluster, current);
    }

    const classifiedTotal = [...map.values()].reduce(
      (s, v) => s + v.vacancyCount,
      0,
    );
    const result = new Map<
      RoleCluster,
      {
        vacancyCount: number;
        marketShare: number;
        medianSalaryMidpoint: number | null;
        averageSalaryMidpoint: number | null;
        salaryCoverageRate: number;
        salarySampleSize: number;
        uniqueEmployersCount: number;
        avgClassificationConfidence: number | null;
      }
    >();

    for (const cluster of MARKET_ROLE_CLUSTERS) {
      const raw = map.get(cluster);
      if (!raw) {
        result.set(cluster, this.emptyAgg());
        continue;
      }
      const salaryAvg =
        raw.salaryWeighted.length === 0
          ? null
          : raw.salaryWeighted.reduce((a, b) => a + b, 0) /
            raw.salaryWeighted.length;
      result.set(cluster, {
        vacancyCount: raw.vacancyCount,
        marketShare:
          classifiedTotal === 0 ? 0 : raw.vacancyCount / classifiedTotal,
        medianSalaryMidpoint: salaryAvg,
        averageSalaryMidpoint: salaryAvg,
        salaryCoverageRate:
          raw.vacancyCount === 0
            ? 0
            : raw.salaryCoverageWeighted / raw.vacancyCount,
        salarySampleSize: raw.salarySampleSize,
        uniqueEmployersCount: raw.employers,
        avgClassificationConfidence:
          raw.confidenceWeighted.length === 0
            ? null
            : raw.confidenceWeighted.reduce((a, b) => a + b, 0) /
              raw.confidenceWeighted.length,
      });
    }
    return result;
  }

  private emptyAgg() {
    return {
      vacancyCount: 0,
      marketShare: 0,
      medianSalaryMidpoint: null as number | null,
      averageSalaryMidpoint: null as number | null,
      salaryCoverageRate: 0,
      salarySampleSize: 0,
      uniqueEmployersCount: 0,
      avgClassificationConfidence: null as number | null,
    };
  }

  private metricValue(rows: DailyRoleMetric[], metric: TrendMetric): number {
    if (rows.length === 0) {
      return 0;
    }
    if (metric === 'vacancyCount') {
      return rows.reduce((s, r) => s + r.vacancyCount, 0);
    }
    if (metric === 'marketShare') {
      const total = rows.reduce((s, r) => s + r.vacancyCount, 0);
      const weighted = rows.reduce(
        (s, r) => s + Number(r.marketShare) * r.vacancyCount,
        0,
      );
      return total === 0 ? 0 : weighted / total;
    }
    const withSalary = rows.filter((r) => r.medianSalaryMidpoint !== null);
    if (withSalary.length === 0) {
      return 0;
    }
    const weighted = withSalary.reduce(
      (s, r) => s + Number(r.medianSalaryMidpoint) * r.salarySampleSize,
      0,
    );
    const weight = withSalary.reduce((s, r) => s + r.salarySampleSize, 0);
    return weight === 0 ? 0 : weighted / weight;
  }

  private pickCompareValue(
    row: {
      vacancyCount: number;
      marketShare: number;
      medianSalaryMidpoint: number | null;
    },
    metric: TrendMetric,
  ): number | null {
    if (metric === 'vacancyCount') {
      return row.vacancyCount;
    }
    if (metric === 'marketShare') {
      return row.marketShare;
    }
    return row.medianSalaryMidpoint;
  }

  private aggregateSkills(
    rows: Array<{
      roleCluster: RoleCluster;
      vacancyCount: number;
      shareWithinCluster: Prisma.Decimal;
      skill: { code: string; name: string };
    }>,
  ): Map<
    string,
    {
      roleCluster: RoleCluster;
      code: string;
      name: string;
      vacancyCount: number;
      share: number;
    }
  > {
    const map = new Map<
      string,
      {
        roleCluster: RoleCluster;
        code: string;
        name: string;
        vacancyCount: number;
        shareWeighted: number;
        days: number;
      }
    >();

    for (const row of rows) {
      const key = `${row.roleCluster}|${row.skill.code}`;
      const share = Number(row.shareWithinCluster);
      const current = map.get(key) ?? {
        roleCluster: row.roleCluster,
        code: row.skill.code,
        name: row.skill.name,
        vacancyCount: 0,
        shareWeighted: 0,
        days: 0,
      };
      current.vacancyCount += row.vacancyCount;
      current.shareWeighted += share;
      current.days += 1;
      map.set(key, current);
    }

    const result = new Map<
      string,
      {
        roleCluster: RoleCluster;
        code: string;
        name: string;
        vacancyCount: number;
        share: number;
      }
    >();
    for (const [key, value] of map.entries()) {
      result.set(key, {
        roleCluster: value.roleCluster,
        code: value.code,
        name: value.name,
        vacancyCount: value.vacancyCount,
        share: value.days === 0 ? 0 : value.shareWeighted / value.days,
      });
    }
    return result;
  }

  private buildKeyObservation(
    rows: Array<{
      roleCluster: RoleCluster;
      vacancyCount: number;
      marketShare: number;
      growthRate: number;
    }>,
    daysWithData: number,
  ): {
    code: string;
    roleCluster: RoleCluster | null;
    message: string;
  } {
    if (daysWithData === 0 || rows.every((r) => r.vacancyCount === 0)) {
      return {
        code: 'NO_DATA',
        roleCluster: null,
        message:
          'No classified vacancy metrics yet. Run a sync to populate the market overview.',
      };
    }
    if (daysWithData < 7) {
      const top = [...rows].sort((a, b) => b.vacancyCount - a.vacancyCount)[0];
      return {
        code: 'LIMITED_HISTORY_TOP_SHARE',
        roleCluster: top.roleCluster,
        message: `With only ${daysWithData} day(s) of history, ${top.roleCluster} currently leads by vacancy count (${top.vacancyCount}). Treat growth signals as provisional.`,
      };
    }
    const byGrowth = [...rows]
      .filter((r) => r.vacancyCount > 0)
      .sort((a, b) => b.growthRate - a.growthRate)[0];
    if (byGrowth) {
      return {
        code: 'HIGHEST_GROWTH',
        roleCluster: byGrowth.roleCluster,
        message: `${byGrowth.roleCluster} shows the highest vacancy-count change in the selected window (growthRate=${byGrowth.growthRate.toFixed(3)}, share=${(byGrowth.marketShare * 100).toFixed(1)}%).`,
      };
    }
    return {
      code: 'STABLE',
      roleCluster: null,
      message: 'No material segment growth detected in the selected window.',
    };
  }

  private buildCaveats(input: {
    sourceLabel: string;
    daysWithData: number;
    classified: number;
    totalVacancies: number;
    salaryCoverage: number | null;
  }): string[] {
    const caveats = [
      'Forecasts and KPIs describe the available multi-source vacancy sample, not the entire profession.',
      `Active source filter: ${input.sourceLabel}. RemoteOK/Jobicy are remote/global biased.`,
    ];
    if (input.daysWithData < 14) {
      caveats.push(
        `Only ${input.daysWithData} distinct metric day(s) collected; forecast requires more history.`,
      );
    }
    if (input.salaryCoverage !== null && input.salaryCoverage < 0.3) {
      caveats.push('Salary coverage is low; salary KPIs are incomplete.');
    }
    if (
      input.totalVacancies > 0 &&
      input.classified / input.totalVacancies < 0.5
    ) {
      caveats.push(
        'Many vacancies remain UNCLASSIFIED and are excluded from market share.',
      );
    }
    return caveats;
  }

  private weightedSalaryCoverage(
    rows: Array<{ vacancyCount: number; salaryCoverageRate: number }>,
  ): number {
    const total = rows.reduce((s, r) => s + r.vacancyCount, 0);
    if (total === 0) {
      return 0;
    }
    return (
      rows.reduce((s, r) => s + r.salaryCoverageRate * r.vacancyCount, 0) /
      total
    );
  }
}
