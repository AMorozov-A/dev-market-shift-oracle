import { Injectable, Logger } from '@nestjs/common';
import { SkillsRepository } from '../skills/skills.repository';
import { SkillExtractorService } from '../skills/skill-extractor.service';
import { CLASSIFIER_VERSION } from '../taxonomy/role-classifier.config';
import { RoleClassifierService } from '../taxonomy/role-classifier.service';
import { VacanciesRepository } from './vacancies.repository';

@Injectable()
export class VacancyEnrichmentService {
  private readonly logger = new Logger(VacancyEnrichmentService.name);
  private skillIdByCode: Map<string, string> | null = null;

  constructor(
    private readonly classifier: RoleClassifierService,
    private readonly skillExtractor: SkillExtractorService,
    private readonly vacanciesRepository: VacanciesRepository,
    private readonly skillsRepository: SkillsRepository,
  ) {}

  async enrichVacancy(
    vacancyId: string,
    input: {
      title: string;
      description?: string | null;
      keySkills?: string[];
    },
  ): Promise<void> {
    const classification = this.classifier.classify(input);
    const skills = this.skillExtractor.extract(input);
    const skillIds = await this.getSkillIdMap();

    await this.vacanciesRepository.saveClassification(
      vacancyId,
      classification,
    );
    await this.vacanciesRepository.saveSkills(vacancyId, skills, skillIds);
  }

  async enrichAll(take = 500): Promise<{ processed: number }> {
    const vacancies =
      await this.vacanciesRepository.findManyForEnrichment(take);
    for (const vacancy of vacancies) {
      await this.enrichVacancy(vacancy.id, {
        title: vacancy.title,
        description: vacancy.description,
        keySkills: [],
      });
    }
    this.logger.log(`Enriched ${vacancies.length} vacancies`);
    return { processed: vacancies.length };
  }

  async enrichPending(take = 500): Promise<{ processed: number }> {
    const vacancies = await this.vacanciesRepository.findManyNeedingEnrichment(
      CLASSIFIER_VERSION,
      take,
    );
    for (const vacancy of vacancies) {
      await this.enrichVacancy(vacancy.id, {
        title: vacancy.title,
        description: vacancy.description,
        keySkills: [],
      });
    }
    if (vacancies.length > 0) {
      this.logger.log(
        `Backfilled enrichment for ${vacancies.length} vacancies`,
      );
    }
    return { processed: vacancies.length };
  }

  private async getSkillIdMap(): Promise<Map<string, string>> {
    if (this.skillIdByCode) {
      return this.skillIdByCode;
    }
    const skills = await this.skillsRepository.findAll();
    this.skillIdByCode = new Map(skills.map((skill) => [skill.code, skill.id]));
    return this.skillIdByCode;
  }
}
