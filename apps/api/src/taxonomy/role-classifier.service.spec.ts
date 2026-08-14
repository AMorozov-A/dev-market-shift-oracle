import { ClassificationField, RoleCluster } from '@prisma/client';
import { RoleClassifierService } from './role-classifier.service';

describe('RoleClassifierService', () => {
  const classifier = new RoleClassifierService();

  it('classifies pure React frontend as FRONTEND', () => {
    const result = classifier.classify({
      title: 'React Frontend Developer',
      description: 'Build UI with React, TypeScript and Redux.',
      keySkills: ['React', 'TypeScript', 'Redux'],
    });

    expect(result.primaryCluster).toBe(RoleCluster.FRONTEND);
    expect(result.confidence).toBeGreaterThan(0.3);
    expect(result.matchedSignals.some((s) => s.matchedTerm === 'react')).toBe(
      true,
    );
  });

  it('classifies React + NestJS + PostgreSQL as FULLSTACK', () => {
    const result = classifier.classify({
      title: 'Software Engineer',
      description:
        'Work with React on the client and NestJS with PostgreSQL on the server.',
      keySkills: ['React', 'NestJS', 'PostgreSQL'],
    });

    expect(result.primaryCluster).toBe(RoleCluster.FULLSTACK);
  });

  it('classifies PyTorch / model training as ML_AI', () => {
    const result = classifier.classify({
      title: 'Machine Learning Engineer',
      description:
        'Train models with PyTorch and scikit-learn. Model training pipelines.',
      keySkills: ['PyTorch', 'Python'],
    });

    expect(result.primaryCluster).toBe(RoleCluster.ML_AI);
  });

  it('classifies LLM + RAG + LangChain + agents as AI_FIRST', () => {
    const result = classifier.classify({
      title: 'LLM Engineer',
      description: 'Build RAG systems with LangChain and autonomous agents.',
      keySkills: ['LLM', 'RAG', 'LangChain', 'agents'],
    });

    expect(result.primaryCluster).toBe(RoleCluster.AI_FIRST);
    expect(result.hasStrongAiFirstSignal).toBe(true);
  });

  it('does not auto-assign AI_FIRST for casual AI product mention', () => {
    const result = classifier.classify({
      title: 'Product Manager',
      description:
        'We use AI in the product to improve UX. No ML or LLM engineering required.',
      keySkills: ['Jira', 'Analytics'],
    });

    expect(result.primaryCluster).not.toBe(RoleCluster.AI_FIRST);
  });

  it('lowers confidence on conflicting FE vs BE signals', () => {
    const clear = classifier.classify({
      title: 'Frontend Developer (React)',
      description: 'React TypeScript CSS HTML',
      keySkills: ['React', 'TypeScript'],
    });

    const conflicting = classifier.classify({
      title: 'Engineer',
      description: 'React UI and also Kubernetes Terraform DevOps pipelines',
      keySkills: ['React', 'Kubernetes', 'Terraform'],
    });

    expect(clear.confidence).toBeGreaterThan(conflicting.confidence);
  });

  it('returns UNCLASSIFIED when signals are too weak', () => {
    const result = classifier.classify({
      title: 'Office Manager',
      description: 'Coordinate schedules and office supplies.',
      keySkills: [],
    });

    expect(result.primaryCluster).toBe(RoleCluster.UNCLASSIFIED);
    expect(result.confidence).toBe(0);
  });

  it('keeps evidence with field and contribution', () => {
    const result = classifier.classify({
      title: 'Backend Developer (Node.js)',
      description: 'NestJS and PostgreSQL services',
      keySkills: ['Node.js'],
    });

    expect(result.matchedSignals.length).toBeGreaterThan(0);
    expect(
      result.matchedSignals.every(
        (item) =>
          item.field === ClassificationField.TITLE ||
          item.field === ClassificationField.DESCRIPTION ||
          item.field === ClassificationField.SKILL,
      ),
    ).toBe(true);
    expect(result.classificationVersion).toBeTruthy();
  });
});
