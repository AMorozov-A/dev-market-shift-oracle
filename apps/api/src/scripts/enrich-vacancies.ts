/**
 * One-off backfill: classify + extract skills for vacancies missing role-classifier-v1.
 * Usage: pnpm --filter @dev-market-oracle/api exec ts-node -r tsconfig-paths/register src/scripts/enrich-vacancies.ts
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { VacancyEnrichmentService } from '../vacancies/vacancy-enrichment.service';
import { VacanciesRepository } from '../vacancies/vacancies.repository';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const enrichment = app.get(VacancyEnrichmentService);
    const vacancies = app.get(VacanciesRepository);
    const result = await enrichment.enrichAll(1000);
    const counts = await vacancies.countByCluster();

    console.log(
      JSON.stringify(
        { enriched: result.processed, byCluster: counts },
        null,
        2,
      ),
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
