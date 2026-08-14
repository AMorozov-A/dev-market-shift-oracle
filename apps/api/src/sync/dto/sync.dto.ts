import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateSyncRunDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Query profile codes to sync',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  profileCodes?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Source codes, e.g. HH, REMOTIVE',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sourceCodes?: string[];

  @ApiPropertyOptional({
    description: 'Force refresh vacancy details ignoring freshness window',
  })
  @IsOptional()
  @IsBoolean()
  forceRefresh?: boolean;
}

export class ListSyncRunsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  pageSize?: number = 20;
}
