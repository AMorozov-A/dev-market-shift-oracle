import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RoleCluster } from '@prisma/client';
import {
  MARKET_ROLE_CLUSTERS,
  addUtcDays,
  median,
  mean,
  salaryMidpoint,
  toUtcDateOnly,
} from '../common/utils/market.util';
import { AnalyticsRepository } from './analytics.repository';

interface RoleBucket {
  vacancyCount: number;
  classifiedVacancyCount: number;
  employers: Set<string>;
  confidences: number[];
  salaryMidpoints: number[];
  salaryCurrencies: Map<string, number>;
}

interface SkillBucket {
  vacancyIds: Set<string>;
}

@Injectable()
export class MetricsAggregationService {
  private readonly logger = new Logger(MetricsAggregationService.name);

  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async recalculate(): Promise<{
    roleMetricRows: number;
    skillMetricRows: number;
    vacancyCount: number;
  }> {
    const vacancies = await this.analyticsRepository.loadVacanciesForMetrics();
    const roleMap = new Map<string, RoleBucket>();
    const skillMap = new Map<string, SkillBucket>();
    const classifiedPerDaySource = new Map<string, number>();

    for (const vacancy of vacancies) {
      const day = toUtcDateOnly(vacancy.publishedAt);
      const dayKey = day.toISOString().slice(0, 10);
      const cluster = vacancy.primaryRoleCluster ?? RoleCluster.UNCLASSIFIED;
      const areaId = '';
      const roleKey = `${dayKey}|${vacancy.sourceId}|${cluster}|${areaId}`;

      let bucket = roleMap.get(roleKey);
      if (!bucket) {
        bucket = {
          vacancyCount: 0,
          classifiedVacancyCount: 0,
          employers: new Set(),
          confidences: [],
          salaryMidpoints: [],
          salaryCurrencies: new Map(),
        };
        roleMap.set(roleKey, bucket);
      }

      bucket.vacancyCount += 1;
      if (cluster !== RoleCluster.UNCLASSIFIED) {
        bucket.classifiedVacancyCount += 1;
        const classifiedKey = `${dayKey}|${vacancy.sourceId}`;
        classifiedPerDaySource.set(
          classifiedKey,
          (classifiedPerDaySource.get(classifiedKey) ?? 0) + 1,
        );
      }
      if (vacancy.employerName) {
        bucket.employers.add(vacancy.employerName);
      }
      if (vacancy.classificationConfidence !== null) {
        bucket.confidences.push(Number(vacancy.classificationConfidence));
      }

      const mid = salaryMidpoint(
        vacancy.salaryFrom === null ? null : Number(vacancy.salaryFrom),
        vacancy.salaryTo === null ? null : Number(vacancy.salaryTo),
      );
      if (mid !== null && vacancy.salaryCurrency) {
        bucket.salaryMidpoints.push(mid);
        bucket.salaryCurrencies.set(
          vacancy.salaryCurrency,
          (bucket.salaryCurrencies.get(vacancy.salaryCurrency) ?? 0) + 1,
        );
      }

      if (cluster !== RoleCluster.UNCLASSIFIED) {
        for (const skill of vacancy.skills) {
          const skillKey = `${dayKey}|${cluster}|${skill.skillId}`;
          let skillBucket = skillMap.get(skillKey);
          if (!skillBucket) {
            skillBucket = { vacancyIds: new Set() };
            skillMap.set(skillKey, skillBucket);
          }
          skillBucket.vacancyIds.add(vacancy.id);
        }
      }
    }

    // Fill calendar gaps with explicit zeros for market clusters.
    // Missing day = no publications in sample that day (real observation, not synthetic demand).
    this.densifyMarketClusterDays(roleMap);

    const roleRows: Prisma.DailyRoleMetricCreateManyInput[] = [];
    for (const [key, bucket] of roleMap.entries()) {
      const [dayKey, sourceId, cluster, areaId] = key.split('|') as [
        string,
        string,
        RoleCluster,
        string,
      ];
      const classifiedTotal =
        classifiedPerDaySource.get(`${dayKey}|${sourceId}`) ?? 0;
      const marketShare =
        cluster === RoleCluster.UNCLASSIFIED || classifiedTotal === 0
          ? 0
          : bucket.classifiedVacancyCount / classifiedTotal;

      const salaryStats = this.salaryStats(bucket);
      const avgConfidence = mean(bucket.confidences);

      roleRows.push({
        metricDate: new Date(`${dayKey}T00:00:00.000Z`),
        sourceId,
        roleCluster: cluster,
        areaId,
        vacancyCount: bucket.vacancyCount,
        classifiedVacancyCount: bucket.classifiedVacancyCount,
        marketShare: new Prisma.Decimal(marketShare.toFixed(6)),
        salarySampleSize: salaryStats.sampleSize,
        salaryCoverageRate: new Prisma.Decimal(
          (bucket.vacancyCount === 0
            ? 0
            : salaryStats.sampleSize / bucket.vacancyCount
          ).toFixed(6),
        ),
        medianSalaryMidpoint:
          salaryStats.median === null
            ? null
            : new Prisma.Decimal(salaryStats.median.toFixed(2)),
        averageSalaryMidpoint:
          salaryStats.average === null
            ? null
            : new Prisma.Decimal(salaryStats.average.toFixed(2)),
        uniqueEmployersCount: bucket.employers.size,
        avgClassificationConfidence:
          avgConfidence === null
            ? null
            : new Prisma.Decimal(avgConfidence.toFixed(4)),
        metadata: {
          salaryCurrency: salaryStats.currency,
          mixedCurrencySkipped: salaryStats.mixedCurrency,
          zeroFilled: bucket.vacancyCount === 0,
        },
      });
    }

    const clusterDayTotals = new Map<string, number>();
    for (const [key, bucket] of roleMap.entries()) {
      const [dayKey, , cluster] = key.split('|');
      if (!cluster || cluster === RoleCluster.UNCLASSIFIED) {
        continue;
      }
      const totalKey = `${dayKey}|${cluster}`;
      clusterDayTotals.set(
        totalKey,
        (clusterDayTotals.get(totalKey) ?? 0) + bucket.classifiedVacancyCount,
      );
    }

    const skillRows: Prisma.DailySkillMetricCreateManyInput[] = [];
    for (const [key, bucket] of skillMap.entries()) {
      const [dayKey, cluster, skillId] = key.split('|') as [
        string,
        RoleCluster,
        string,
      ];
      const clusterTotal = clusterDayTotals.get(`${dayKey}|${cluster}`) ?? 0;
      const vacancyCount = bucket.vacancyIds.size;
      const share = clusterTotal === 0 ? 0 : vacancyCount / clusterTotal;
      skillRows.push({
        metricDate: new Date(`${dayKey}T00:00:00.000Z`),
        roleCluster: cluster,
        skillId,
        vacancyCount,
        shareWithinCluster: new Prisma.Decimal(share.toFixed(6)),
      });
    }

    await this.analyticsRepository.replaceDailyRoleMetrics(roleRows);
    await this.analyticsRepository.replaceDailySkillMetrics(skillRows);

    this.logger.log(
      `Recalculated metrics: ${roleRows.length} role rows, ${skillRows.length} skill rows from ${vacancies.length} vacancies`,
    );

    return {
      roleMetricRows: roleRows.length,
      skillMetricRows: skillRows.length,
      vacancyCount: vacancies.length,
    };
  }

  /**
   * For each source, from min..max observed publishedAt day, ensure every
   * market role cluster has a bucket (zero if no vacancies that day).
   */
  densifyMarketClusterDays(roleMap: Map<string, RoleBucket>): void {
    const rangeBySource = new Map<string, { min: string; max: string }>();

    for (const key of roleMap.keys()) {
      const [dayKey, sourceId] = key.split('|');
      if (!dayKey || !sourceId) {
        continue;
      }
      const current = rangeBySource.get(sourceId);
      if (!current) {
        rangeBySource.set(sourceId, { min: dayKey, max: dayKey });
        continue;
      }
      if (dayKey < current.min) {
        current.min = dayKey;
      }
      if (dayKey > current.max) {
        current.max = dayKey;
      }
    }

    for (const [sourceId, range] of rangeBySource.entries()) {
      let cursor = new Date(`${range.min}T00:00:00.000Z`);
      const end = new Date(`${range.max}T00:00:00.000Z`);
      while (cursor.getTime() <= end.getTime()) {
        const dayKey = cursor.toISOString().slice(0, 10);
        for (const cluster of MARKET_ROLE_CLUSTERS) {
          const roleKey = `${dayKey}|${sourceId}|${cluster}|`;
          if (!roleMap.has(roleKey)) {
            roleMap.set(roleKey, this.emptyRoleBucket());
          }
        }
        cursor = addUtcDays(cursor, 1);
      }
    }
  }

  private emptyRoleBucket(): RoleBucket {
    return {
      vacancyCount: 0,
      classifiedVacancyCount: 0,
      employers: new Set(),
      confidences: [],
      salaryMidpoints: [],
      salaryCurrencies: new Map(),
    };
  }

  private salaryStats(bucket: RoleBucket): {
    sampleSize: number;
    median: number | null;
    average: number | null;
    currency: string | null;
    mixedCurrency: boolean;
  } {
    if (bucket.salaryCurrencies.size === 0) {
      return {
        sampleSize: 0,
        median: null,
        average: null,
        currency: null,
        mixedCurrency: false,
      };
    }

    if (bucket.salaryCurrencies.size > 1) {
      return {
        sampleSize: 0,
        median: null,
        average: null,
        currency: null,
        mixedCurrency: true,
      };
    }

    const currency = [...bucket.salaryCurrencies.keys()][0] ?? null;
    return {
      sampleSize: bucket.salaryMidpoints.length,
      median: median(bucket.salaryMidpoints),
      average: mean(bucket.salaryMidpoints),
      currency,
      mixedCurrency: false,
    };
  }

  listMarketClusters(): RoleCluster[] {
    return MARKET_ROLE_CLUSTERS;
  }
}
