import { Module } from '@nestjs/common';
import { SkillsModule } from '../skills/skills.module';
import { TaxonomyModule } from '../taxonomy/taxonomy.module';
import { VacanciesRepository } from './vacancies.repository';
import { VacancyEnrichmentService } from './vacancy-enrichment.service';

@Module({
  imports: [TaxonomyModule, SkillsModule],
  providers: [VacanciesRepository, VacancyEnrichmentService],
  exports: [VacanciesRepository, VacancyEnrichmentService],
})
export class VacanciesModule {}
