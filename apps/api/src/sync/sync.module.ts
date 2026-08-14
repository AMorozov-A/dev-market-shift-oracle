import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../config/env.validation';
import { SourcesModule } from '../sources/sources.module';
import { VacanciesModule } from '../vacancies/vacancies.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ForecastModule } from '../forecast/forecast.module';
import { SyncController } from './sync.controller';
import { SyncPipelineService } from './sync.pipeline.service';
import { SyncProcessor } from './sync.processor';
import { SyncRepository } from './sync.repository';
import { MARKET_SYNC_QUEUE, SyncService } from './sync.service';

@Module({
  imports: [
    SourcesModule,
    VacanciesModule,
    AnalyticsModule,
    ForecastModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => {
        const host = config.get('REDIS_HOST', { infer: true });
        const port = config.get('REDIS_PORT', { infer: true });
        return {
          connection: {
            host,
            port,
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: MARKET_SYNC_QUEUE,
    }),
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncRepository, SyncPipelineService, SyncProcessor],
  exports: [SyncService],
})
export class SyncModule {}
