/**
 * Recalculate daily metrics and regenerate forecasts from current vacancies.
 * Usage: pnpm --filter @dev-market-oracle/api exec ts-node -r tsconfig-paths/register src/scripts/recalculate-analytics.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MetricsAggregationService } from '../analytics/metrics-aggregation.service';
import { ForecastService } from '../forecast/forecast.service';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const metrics = app.get(MetricsAggregationService);
    const forecasts = app.get(ForecastService);
    const metricsResult = await metrics.recalculate();
    const forecastResult = await forecasts.generateAll();

    console.log(JSON.stringify({ metricsResult, forecastResult }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
