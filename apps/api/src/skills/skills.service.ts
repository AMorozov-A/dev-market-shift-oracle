import { Injectable, NotFoundException } from '@nestjs/common';
import { Skill, SkillCategory } from '@prisma/client';
import { SkillsRepository } from './skills.repository';

@Injectable()
export class SkillsService {
  constructor(private readonly skillsRepository: SkillsRepository) {}

  listAll(): Promise<Skill[]> {
    return this.skillsRepository.findAll();
  }

  listByCategory(category: SkillCategory): Promise<Skill[]> {
    return this.skillsRepository.findByCategory(category);
  }

  async getByCodeOrThrow(code: string): Promise<Skill> {
    const skill = await this.skillsRepository.findByCode(code);
    if (!skill) {
      throw new NotFoundException(`Skill not found: ${code}`);
    }
    return skill;
  }
}
