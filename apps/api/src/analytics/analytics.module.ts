import { Module } from '@nestjs/common';
import { SourcesModule } from '../sources/sources.module';
import { AnalyticsRepository } from './analytics.repository';
import {
  MarketController,
  SkillsAnalyticsController,
} from './market.controller';
import { MarketService } from './market.service';
import { MetricsAggregationService } from './metrics-aggregation.service';

@Module({
  imports: [SourcesModule],
  controllers: [MarketController, SkillsAnalyticsController],
  providers: [AnalyticsRepository, MetricsAggregationService, MarketService],
  exports: [AnalyticsRepository, MetricsAggregationService, MarketService],
})
export class AnalyticsModule {}
