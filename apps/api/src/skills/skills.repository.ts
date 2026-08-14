import { Injectable } from '@nestjs/common';
import { Skill, SkillCategory } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SkillsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  findByCategory(category: SkillCategory): Promise<Skill[]> {
    return this.prisma.skill.findMany({
      where: { category },
      orderBy: { name: 'asc' },
    });
  }

  findByCode(code: string): Promise<Skill | null> {
    return this.prisma.skill.findUnique({ where: { code } });
  }
}
