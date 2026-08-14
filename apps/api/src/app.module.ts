import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppConfigModule } from './config/config.module';
import { DatabaseModule } from './database/prisma.module';
import { HealthModule } from './health/health.module';
import { SkillsModule } from './skills/skills.module';
import { SourcesModule } from './sources/sources.module';
import { SyncModule } from './sync/sync.module';
import { TaxonomyModule } from './taxonomy/taxonomy.module';
import { VacanciesModule } from './vacancies/vacancies.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ForecastModule } from './forecast/forecast.module';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        autoLogging: true,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    DatabaseModule,
    HealthModule,
    SourcesModule,
    TaxonomyModule,
    SkillsModule,
    VacanciesModule,
    AnalyticsModule,
    ForecastModule,
    SyncModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
