import { Module } from '@nestjs/common';
import { SkillExtractorService } from './skill-extractor.service';
import { SkillsRepository } from './skills.repository';
import { SkillsService } from './skills.service';

@Module({
  providers: [SkillsRepository, SkillsService, SkillExtractorService],
  exports: [SkillsRepository, SkillsService, SkillExtractorService],
})
export class SkillsModule {}
