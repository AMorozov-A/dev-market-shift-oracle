import { RoleCluster } from '@prisma/client';

export const CLASSIFIER_VERSION = 'role-classifier-v1';

/** Minimum top score required to assign a primary cluster. */
export const CLASSIFIER_MIN_SCORE = 4;

/** If top1-top2 gap is below this, confidence is reduced. */
export const CLASSIFIER_CLOSE_GAP = 2.5;

export const FIELD_WEIGHT_MULTIPLIER = {
  TITLE: 3,
  SKILL: 2.2,
  DESCRIPTION: 1,
} as const;

export type ClassifierField = keyof typeof FIELD_WEIGHT_MULTIPLIER;

export interface ClassificationSignal {
  term: string;
  cluster: RoleCluster;
  /** Base weight before field multiplier. Phrases should be higher than words. */
  weight: number;
  /** Strong AI-first signals gate AI_FIRST assignment. */
  strongAiFirst?: boolean;
  /** Subtract contribution from the target cluster when matched. */
  negative?: boolean;
}

/**
 * Deterministic keyword signals. Matching is case-insensitive.
 * Longer phrases should be listed; matcher prefers longer terms first.
 */
export const CLASSIFICATION_SIGNALS: ClassificationSignal[] = [
  // Frontend phrases
  { term: 'frontend developer', cluster: RoleCluster.FRONTEND, weight: 4 },
  { term: 'front-end developer', cluster: RoleCluster.FRONTEND, weight: 4 },
  { term: 'frontend инженер', cluster: RoleCluster.FRONTEND, weight: 3.5 },
  { term: 'frontend разработчик', cluster: RoleCluster.FRONTEND, weight: 4 },
  { term: 'react developer', cluster: RoleCluster.FRONTEND, weight: 3.5 },
  { term: 'vue developer', cluster: RoleCluster.FRONTEND, weight: 3.5 },
  { term: 'angular developer', cluster: RoleCluster.FRONTEND, weight: 3.5 },
  { term: 'next.js', cluster: RoleCluster.FRONTEND, weight: 2.5 },
  { term: 'react native', cluster: RoleCluster.MOBILE, weight: 3.5 },
  { term: 'react', cluster: RoleCluster.FRONTEND, weight: 2.2 },
  { term: 'vue', cluster: RoleCluster.FRONTEND, weight: 2 },
  { term: 'angular', cluster: RoleCluster.FRONTEND, weight: 2 },
  { term: 'redux', cluster: RoleCluster.FRONTEND, weight: 1.5 },
  { term: 'typescript', cluster: RoleCluster.FRONTEND, weight: 1.2 },
  { term: 'javascript', cluster: RoleCluster.FRONTEND, weight: 1 },
  { term: 'css', cluster: RoleCluster.FRONTEND, weight: 1 },
  { term: 'html', cluster: RoleCluster.FRONTEND, weight: 1 },
  { term: 'webpack', cluster: RoleCluster.FRONTEND, weight: 1.2 },
  { term: 'vite', cluster: RoleCluster.FRONTEND, weight: 1.2 },
  { term: 'frontend', cluster: RoleCluster.FRONTEND, weight: 2.5 },
  { term: 'front-end', cluster: RoleCluster.FRONTEND, weight: 2.5 },

  // Fullstack
  { term: 'fullstack developer', cluster: RoleCluster.FULLSTACK, weight: 4.5 },
  { term: 'full stack developer', cluster: RoleCluster.FULLSTACK, weight: 4.5 },
  {
    term: 'fullstack разработчик',
    cluster: RoleCluster.FULLSTACK,
    weight: 4.5,
  },
  {
    term: 'full stack разработчик',
    cluster: RoleCluster.FULLSTACK,
    weight: 4.5,
  },
  { term: 'fullstack', cluster: RoleCluster.FULLSTACK, weight: 3.5 },
  { term: 'full-stack', cluster: RoleCluster.FULLSTACK, weight: 3.5 },
  { term: 'full stack', cluster: RoleCluster.FULLSTACK, weight: 3.5 },

  // Backend
  { term: 'backend developer', cluster: RoleCluster.BACKEND, weight: 4 },
  { term: 'backend разработчик', cluster: RoleCluster.BACKEND, weight: 4 },
  { term: 'backend engineer', cluster: RoleCluster.BACKEND, weight: 4 },
  { term: 'nestjs', cluster: RoleCluster.BACKEND, weight: 2.5 },
  { term: 'node.js', cluster: RoleCluster.BACKEND, weight: 2.2 },
  { term: 'nodejs', cluster: RoleCluster.BACKEND, weight: 2.2 },
  { term: 'express', cluster: RoleCluster.BACKEND, weight: 1.8 },
  { term: 'postgresql', cluster: RoleCluster.BACKEND, weight: 1.5 },
  { term: 'postgres', cluster: RoleCluster.BACKEND, weight: 1.5 },
  { term: 'mongodb', cluster: RoleCluster.BACKEND, weight: 1.4 },
  { term: 'redis', cluster: RoleCluster.BACKEND, weight: 1.2 },
  { term: 'kafka', cluster: RoleCluster.BACKEND, weight: 1.4 },
  { term: 'graphql', cluster: RoleCluster.BACKEND, weight: 1.3 },
  { term: 'prisma', cluster: RoleCluster.BACKEND, weight: 1.3 },
  { term: 'java developer', cluster: RoleCluster.BACKEND, weight: 3 },
  { term: 'spring boot', cluster: RoleCluster.BACKEND, weight: 2.8 },
  { term: 'spring', cluster: RoleCluster.BACKEND, weight: 2.2 },
  { term: 'golang', cluster: RoleCluster.BACKEND, weight: 2.5 },
  { term: 'go developer', cluster: RoleCluster.BACKEND, weight: 3 },
  { term: 'django', cluster: RoleCluster.BACKEND, weight: 2.2 },
  { term: 'fastapi', cluster: RoleCluster.BACKEND, weight: 2.2 },
  { term: 'microservices', cluster: RoleCluster.BACKEND, weight: 1.8 },
  { term: 'backend', cluster: RoleCluster.BACKEND, weight: 2.8 },

  // Mobile
  { term: 'mobile developer', cluster: RoleCluster.MOBILE, weight: 4 },
  { term: 'android developer', cluster: RoleCluster.MOBILE, weight: 4 },
  { term: 'ios developer', cluster: RoleCluster.MOBILE, weight: 4 },
  { term: 'flutter', cluster: RoleCluster.MOBILE, weight: 3 },
  { term: 'kotlin', cluster: RoleCluster.MOBILE, weight: 2.2 },
  { term: 'swift', cluster: RoleCluster.MOBILE, weight: 2.2 },
  { term: 'android', cluster: RoleCluster.MOBILE, weight: 2.5 },
  { term: 'ios', cluster: RoleCluster.MOBILE, weight: 2.5 },
  { term: 'mobile', cluster: RoleCluster.MOBILE, weight: 2.2 },

  // DevOps
  { term: 'devops engineer', cluster: RoleCluster.DEVOPS, weight: 4.5 },
  { term: 'site reliability', cluster: RoleCluster.DEVOPS, weight: 3.5 },
  { term: 'platform engineer', cluster: RoleCluster.DEVOPS, weight: 3.5 },
  { term: 'kubernetes', cluster: RoleCluster.DEVOPS, weight: 3 },
  { term: 'terraform', cluster: RoleCluster.DEVOPS, weight: 2.5 },
  { term: 'ansible', cluster: RoleCluster.DEVOPS, weight: 2 },
  { term: 'ci/cd', cluster: RoleCluster.DEVOPS, weight: 2 },
  { term: 'prometheus', cluster: RoleCluster.DEVOPS, weight: 1.8 },
  { term: 'devops', cluster: RoleCluster.DEVOPS, weight: 3.2 },
  { term: 'sre', cluster: RoleCluster.DEVOPS, weight: 2.8 },
  { term: 'docker', cluster: RoleCluster.DEVOPS, weight: 1.2 },
  { term: 'helm', cluster: RoleCluster.DEVOPS, weight: 2 },
  { term: 'github actions', cluster: RoleCluster.DEVOPS, weight: 2 },
  { term: 'gitlab ci', cluster: RoleCluster.DEVOPS, weight: 2 },
  { term: 'jenkins', cluster: RoleCluster.DEVOPS, weight: 1.8 },
  { term: 'aws', cluster: RoleCluster.DEVOPS, weight: 2 },
  { term: 'gcp', cluster: RoleCluster.DEVOPS, weight: 1.8 },
  { term: 'azure', cluster: RoleCluster.DEVOPS, weight: 1.8 },
  { term: 'grafana', cluster: RoleCluster.DEVOPS, weight: 1.5 },

  // ML / AI classical
  {
    term: 'machine learning engineer',
    cluster: RoleCluster.ML_AI,
    weight: 4.5,
  },
  { term: 'ml engineer', cluster: RoleCluster.ML_AI, weight: 4 },
  { term: 'data scientist', cluster: RoleCluster.ML_AI, weight: 4 },
  { term: 'model training', cluster: RoleCluster.ML_AI, weight: 3 },
  { term: 'pytorch', cluster: RoleCluster.ML_AI, weight: 3 },
  { term: 'tensorflow', cluster: RoleCluster.ML_AI, weight: 3 },
  { term: 'scikit-learn', cluster: RoleCluster.ML_AI, weight: 2.5 },
  { term: 'sklearn', cluster: RoleCluster.ML_AI, weight: 2.5 },
  { term: 'pandas', cluster: RoleCluster.ML_AI, weight: 1.5 },
  { term: 'mlflow', cluster: RoleCluster.ML_AI, weight: 2 },
  { term: 'machine learning', cluster: RoleCluster.ML_AI, weight: 3 },
  { term: 'deep learning', cluster: RoleCluster.ML_AI, weight: 2.8 },

  // AI-first (strong)
  {
    term: 'llm engineer',
    cluster: RoleCluster.AI_FIRST,
    weight: 5,
    strongAiFirst: true,
  },
  {
    term: 'rag engineer',
    cluster: RoleCluster.AI_FIRST,
    weight: 5,
    strongAiFirst: true,
  },
  {
    term: 'prompt engineer',
    cluster: RoleCluster.AI_FIRST,
    weight: 4.5,
    strongAiFirst: true,
  },
  {
    term: 'langchain',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    strongAiFirst: true,
  },
  {
    term: 'langgraph',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    strongAiFirst: true,
  },
  {
    term: 'mcp',
    cluster: RoleCluster.AI_FIRST,
    weight: 3.5,
    strongAiFirst: true,
  },
  {
    term: 'model context protocol',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    strongAiFirst: true,
  },
  {
    term: 'retrieval augmented',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    strongAiFirst: true,
  },
  {
    term: 'rag',
    cluster: RoleCluster.AI_FIRST,
    weight: 3.5,
    strongAiFirst: true,
  },
  {
    term: 'llm',
    cluster: RoleCluster.AI_FIRST,
    weight: 3.5,
    strongAiFirst: true,
  },
  {
    term: 'genai',
    cluster: RoleCluster.AI_FIRST,
    weight: 3.5,
    strongAiFirst: true,
  },
  {
    term: 'generative ai',
    cluster: RoleCluster.AI_FIRST,
    weight: 3.5,
    strongAiFirst: true,
  },
  {
    term: 'ai agent',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    strongAiFirst: true,
  },
  {
    term: 'ai agents',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    strongAiFirst: true,
  },
  {
    term: 'agents',
    cluster: RoleCluster.AI_FIRST,
    weight: 2.5,
    strongAiFirst: true,
  },
  {
    term: 'embeddings',
    cluster: RoleCluster.AI_FIRST,
    weight: 2.5,
    strongAiFirst: true,
  },
  {
    term: 'vector database',
    cluster: RoleCluster.AI_FIRST,
    weight: 3,
    strongAiFirst: true,
  },
  {
    term: 'openai',
    cluster: RoleCluster.AI_FIRST,
    weight: 2.2,
    strongAiFirst: true,
  },
  {
    term: 'anthropic',
    cluster: RoleCluster.AI_FIRST,
    weight: 2.2,
    strongAiFirst: true,
  },

  // Data engineering
  {
    term: 'data engineer',
    cluster: RoleCluster.DATA_ENGINEERING,
    weight: 4.5,
  },
  {
    term: 'data инженер',
    cluster: RoleCluster.DATA_ENGINEERING,
    weight: 4,
  },
  { term: 'etl developer', cluster: RoleCluster.DATA_ENGINEERING, weight: 3.5 },
  { term: 'apache spark', cluster: RoleCluster.DATA_ENGINEERING, weight: 3 },
  { term: 'spark', cluster: RoleCluster.DATA_ENGINEERING, weight: 2.5 },
  { term: 'dbt', cluster: RoleCluster.DATA_ENGINEERING, weight: 2.8 },
  { term: 'snowflake', cluster: RoleCluster.DATA_ENGINEERING, weight: 2.5 },
  { term: 'bigquery', cluster: RoleCluster.DATA_ENGINEERING, weight: 2.5 },
  { term: 'airflow', cluster: RoleCluster.DATA_ENGINEERING, weight: 2.8 },
  { term: 'etl', cluster: RoleCluster.DATA_ENGINEERING, weight: 2.5 },
  { term: 'elt', cluster: RoleCluster.DATA_ENGINEERING, weight: 2.2 },
  { term: 'data pipeline', cluster: RoleCluster.DATA_ENGINEERING, weight: 3 },

  // Weak AI mention — helps ML_AI slightly but NOT strong AI-first
  { term: 'ai engineer', cluster: RoleCluster.ML_AI, weight: 3 },
  { term: 'artificial intelligence', cluster: RoleCluster.ML_AI, weight: 2 },

  // Negative: casual product AI mentions should not push AI_FIRST
  {
    term: 'we use ai',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    negative: true,
  },
  {
    term: 'using ai',
    cluster: RoleCluster.AI_FIRST,
    weight: 3,
    negative: true,
  },
  {
    term: 'ai-powered product',
    cluster: RoleCluster.AI_FIRST,
    weight: 3.5,
    negative: true,
  },
  {
    term: 'ai in the product',
    cluster: RoleCluster.AI_FIRST,
    weight: 3.5,
    negative: true,
  },
  {
    term: 'используем ai',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    negative: true,
  },
  {
    term: 'используем искусственный интеллект',
    cluster: RoleCluster.AI_FIRST,
    weight: 4,
    negative: true,
  },
];

export function getSignalsSortedByTermLength(): ClassificationSignal[] {
  return [...CLASSIFICATION_SIGNALS].sort(
    (a, b) => b.term.length - a.term.length,
  );
}
