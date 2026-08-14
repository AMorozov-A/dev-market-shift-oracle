import { Injectable } from '@nestjs/common';
import {
  DailyRoleMetric,
  DailySkillMetric,
  Prisma,
  RoleCluster,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { formatUtcDate, toUtcDateOnly } from '../common/utils/market.util';

export interface DailyRoleMetricFilter {
  from?: Date;
  to?: Date;
  sourceIds?: string[];
  clusters?: RoleCluster[];
  areaId?: string;
}

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceDailyRoleMetrics(
    rows: Prisma.DailyRoleMetricCreateManyInput[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.dailyRoleMetric.deleteMany();
      if (rows.length > 0) {
        await tx.dailyRoleMetric.createMany({ data: rows });
      }
    });
  }

  async replaceDailySkillMetrics(
    rows: Prisma.DailySkillMetricCreateManyInput[],
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.dailySkillMetric.deleteMany();
      if (rows.length > 0) {
        await tx.dailySkillMetric.createMany({ data: rows });
      }
    });
  }

  findDailyRoleMetrics(
    filter: DailyRoleMetricFilter,
  ): Promise<DailyRoleMetric[]> {
    return this.prisma.dailyRoleMetric.findMany({
      where: {
        metricDate: {
          gte: filter.from,
          lte: filter.to,
        },
        sourceId: filter.sourceIds ? { in: filter.sourceIds } : undefined,
        roleCluster: filter.clusters ? { in: filter.clusters } : undefined,
        areaId: filter.areaId ?? '',
      },
      orderBy: [{ metricDate: 'asc' }, { roleCluster: 'asc' }],
    });
  }

  findDailySkillMetrics(params: {
    from: Date;
    to: Date;
    clusters?: RoleCluster[];
  }): Promise<
    Array<DailySkillMetric & { skill: { code: string; name: string } }>
  > {
    return this.prisma.dailySkillMetric.findMany({
      where: {
        metricDate: { gte: params.from, lte: params.to },
        roleCluster: params.clusters ? { in: params.clusters } : undefined,
      },
      include: {
        skill: { select: { code: true, name: true } },
      },
      orderBy: [{ metricDate: 'asc' }, { vacancyCount: 'desc' }],
    });
  }

  async distinctMetricDays(sourceIds?: string[]): Promise<number> {
    const rows = await this.prisma.dailyRoleMetric.findMany({
      where: sourceIds ? { sourceId: { in: sourceIds } } : undefined,
      distinct: ['metricDate'],
      select: { metricDate: true },
    });
    return rows.length;
  }

  async metricDateBounds(sourceIds?: string[]): Promise<{
    min: Date | null;
    max: Date | null;
  }> {
    const agg = await this.prisma.dailyRoleMetric.aggregate({
      where: sourceIds ? { sourceId: { in: sourceIds } } : undefined,
      _min: { metricDate: true },
      _max: { metricDate: true },
    });
    return {
      min: agg._min.metricDate,
      max: agg._max.metricDate,
    };
  }

  async latestVacancyUpdatedAt(): Promise<Date | null> {
    const row = await this.prisma.vacancy.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });
    return row?.updatedAt ?? null;
  }

  loadVacanciesForMetrics(): Promise<
    Array<{
      id: string;
      sourceId: string;
      publishedAt: Date;
      primaryRoleCluster: RoleCluster | null;
      classificationConfidence: Prisma.Decimal | null;
      employerName: string | null;
      salaryFrom: Prisma.Decimal | null;
      salaryTo: Prisma.Decimal | null;
      salaryCurrency: string | null;
      areaId: string | null;
      skills: Array<{ skillId: string }>;
    }>
  > {
    return this.prisma.vacancy.findMany({
      select: {
        id: true,
        sourceId: true,
        publishedAt: true,
        primaryRoleCluster: true,
        classificationConfidence: true,
        employerName: true,
        salaryFrom: true,
        salaryTo: true,
        salaryCurrency: true,
        areaId: true,
        skills: { select: { skillId: true } },
      },
    });
  }

  countVacancies(): Promise<number> {
    return this.prisma.vacancy.count();
  }

  /** Debug helper for scripts. */
  formatDateKey(date: Date): string {
    return formatUtcDate(toUtcDateOnly(date));
  }
}
