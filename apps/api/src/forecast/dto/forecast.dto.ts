import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ForecastStatus,
  ForecastTargetMetric,
  RoleCluster,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

export class ListForecastsQueryDto {
  @ApiPropertyOptional({ enum: RoleCluster })
  @IsOptional()
  @IsEnum(RoleCluster)
  cluster?: RoleCluster;

  @ApiPropertyOptional({ enum: ForecastTargetMetric })
  @IsOptional()
  @IsEnum(ForecastTargetMetric)
  targetMetric?: ForecastTargetMetric;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  horizonDays?: number;

  @ApiPropertyOptional({ enum: ForecastStatus })
  @IsOptional()
  @IsEnum(ForecastStatus)
  status?: ForecastStatus;
}
