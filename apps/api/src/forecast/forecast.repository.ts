import { Injectable } from '@nestjs/common';
import {
  Forecast,
  ForecastBacktest,
  ForecastPoint,
  ForecastStatus,
  ForecastTargetMetric,
  Prisma,
  RoleCluster,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ForecastRepository {
  constructor(private readonly prisma: PrismaService) {}

  async deleteAll(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.forecastPoint.deleteMany();
      await tx.forecast.deleteMany();
      await tx.forecastBacktest.deleteMany();
    });
  }

  createForecast(data: Prisma.ForecastCreateInput): Promise<Forecast> {
    return this.prisma.forecast.create({ data });
  }

  createPoints(
    data: Prisma.ForecastPointCreateManyInput[],
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.forecastPoint.createMany({ data });
  }

  createBacktest(
    data: Prisma.ForecastBacktestCreateInput,
  ): Promise<ForecastBacktest> {
    return this.prisma.forecastBacktest.create({ data });
  }

  findMany(filter: {
    cluster?: RoleCluster;
    targetMetric?: ForecastTargetMetric;
    horizonDays?: number;
    status?: ForecastStatus;
  }): Promise<Forecast[]> {
    return this.prisma.forecast.findMany({
      where: {
        roleCluster: filter.cluster,
        targetMetric: filter.targetMetric,
        horizonDays: filter.horizonDays,
        status: filter.status,
      },
      orderBy: [{ generatedAt: 'desc' }, { roleCluster: 'asc' }],
    });
  }

  findById(
    id: string,
  ): Promise<(Forecast & { points: ForecastPoint[] }) | null> {
    return this.prisma.forecast.findUnique({
      where: { id },
      include: { points: { orderBy: { forecastDate: 'asc' } } },
    });
  }

  findLatestBacktest(params: {
    roleCluster: RoleCluster;
    targetMetric: ForecastTargetMetric;
    modelName?: string;
  }): Promise<ForecastBacktest | null> {
    return this.prisma.forecastBacktest.findFirst({
      where: {
        roleCluster: params.roleCluster,
        targetMetric: params.targetMetric,
        modelName: params.modelName,
      },
      orderBy: { evaluatedAt: 'desc' },
    });
  }
}
