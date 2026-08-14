import { SkillCategory } from '@prisma/client';
import {
  SKILL_DICTIONARY,
  assertSkillDictionaryUnique,
  buildSkillAliasIndex,
  normalizeSkillAlias,
} from '../skills/skill-dictionary.config';

describe('skill-dictionary.config', () => {
  it('contains unique codes and aliases', () => {
    expect(() => assertSkillDictionaryUnique()).not.toThrow();
  });

  it('covers required skill categories', () => {
    const categories = new Set(SKILL_DICTIONARY.map((entry) => entry.category));
    expect(categories).toEqual(
      new Set([
        SkillCategory.FRONTEND,
        SkillCategory.BACKEND_FULLSTACK,
        SkillCategory.MOBILE,
        SkillCategory.DEVOPS,
        SkillCategory.ML_AI,
        SkillCategory.AI_FIRST,
        SkillCategory.DATA_ENGINEERING,
      ]),
    );
  });

  it('normalizes aliases in a case-insensitive way', () => {
    const index = buildSkillAliasIndex();
    expect(index.get(normalizeSkillAlias('Node'))?.code).toBe('nodejs');
    expect(index.get(normalizeSkillAlias('NodeJS'))?.code).toBe('nodejs');
    expect(index.get(normalizeSkillAlias('Node.js'))?.code).toBe('nodejs');
    expect(index.get(normalizeSkillAlias('node js'))?.code).toBe('nodejs');
  });

  it('includes backend and devops skills', () => {
    const codes = SKILL_DICTIONARY.map((entry) => entry.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'java',
        'spring',
        'golang',
        'kubernetes',
        'terraform',
        'helm',
        'aws',
        'databricks',
      ]),
    );
  });
});
