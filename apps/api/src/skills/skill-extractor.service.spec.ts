import { ClassificationField } from '@prisma/client';
import { SkillExtractorService } from './skill-extractor.service';

describe('SkillExtractorService', () => {
  const extractor = new SkillExtractorService();

  it('normalizes Node aliases to Node.js', () => {
    const result = extractor.extract({
      title: 'Backend Engineer',
      description:
        'Experience with Node and NodeJS required. Node.js services.',
      keySkills: ['Node'],
    });

    const node = result.find((skill) => skill.code === 'nodejs');
    expect(node?.name).toBe('Node.js');
  });

  it('is case-insensitive', () => {
    const result = extractor.extract({
      title: 'REACT developer',
      description: 'typescript and REDUX',
      keySkills: ['react'],
    });

    expect(result.map((skill) => skill.code).sort()).toEqual(
      expect.arrayContaining(['react', 'typescript', 'redux']),
    );
  });

  it('deduplicates skills across fields', () => {
    const result = extractor.extract({
      title: 'React Engineer',
      description: 'React React React',
      keySkills: ['React'],
    });

    expect(result.filter((skill) => skill.code === 'react')).toHaveLength(1);
  });

  it('prefers skill field confidence when present', () => {
    const result = extractor.extract({
      title: 'Engineer',
      description: 'Uses PostgreSQL',
      keySkills: ['PostgreSQL'],
    });

    const pg = result.find((skill) => skill.code === 'postgresql');
    expect(pg?.sourceField).toBe(ClassificationField.SKILL);
    expect(pg?.confidence).toBeGreaterThan(0.9);
  });
});
