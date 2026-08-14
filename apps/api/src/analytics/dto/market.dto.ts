import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoleCluster } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class MarketQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '30d' })
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  period?: '7d' | '30d' | '90d' = '30d';

  @ApiPropertyOptional({ description: 'Source code or ALL', example: 'ALL' })
  @IsOptional()
  @IsString()
  source?: string = 'ALL';

  @ApiPropertyOptional({ description: 'Area id filter; empty = all areas' })
  @IsOptional()
  @IsString()
  areaId?: string;
}

export class TrendsQueryDto extends MarketQueryDto {
  @ApiPropertyOptional({
    enum: ['vacancyCount', 'marketShare', 'medianSalary'],
    default: 'vacancyCount',
  })
  @IsOptional()
  @IsIn(['vacancyCount', 'marketShare', 'medianSalary'])
  metric?: 'vacancyCount' | 'marketShare' | 'medianSalary' = 'vacancyCount';

  @ApiPropertyOptional({
    type: [String],
    enum: RoleCluster,
    description: 'Role clusters to include',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): RoleCluster[] | undefined => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (Array.isArray(value)) {
      return value as RoleCluster[];
    }
    return [value as RoleCluster];
  })
  @IsArray()
  @IsEnum(RoleCluster, { each: true })
  clusters?: RoleCluster[];
}

export class CompareQueryDto extends MarketQueryDto {
  @ApiPropertyOptional({
    enum: ['vacancyCount', 'marketShare', 'medianSalary'],
    default: 'vacancyCount',
  })
  @IsOptional()
  @IsIn(['vacancyCount', 'marketShare', 'medianSalary'])
  metric?: 'vacancyCount' | 'marketShare' | 'medianSalary' = 'vacancyCount';
}

export class SkillsTrendingQueryDto {
  @ApiPropertyOptional({ enum: RoleCluster })
  @IsOptional()
  @IsEnum(RoleCluster)
  cluster?: RoleCluster;

  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '30d' })
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  period?: '7d' | '30d' | '90d' = '30d';

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class SkillsMatrixQueryDto {
  @ApiPropertyOptional({ enum: ['7d', '30d', '90d'], default: '30d' })
  @IsOptional()
  @IsIn(['7d', '30d', '90d'])
  period?: '7d' | '30d' | '90d' = '30d';

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limitPerCluster?: number = 10;
}
