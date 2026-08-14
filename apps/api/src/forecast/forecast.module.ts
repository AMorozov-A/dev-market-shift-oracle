import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ForecastController } from './forecast.controller';
import { ForecastRepository } from './forecast.repository';
import { ForecastService } from './forecast.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [ForecastController],
  providers: [ForecastRepository, ForecastService],
  exports: [ForecastService],
})
export class ForecastModule {}
