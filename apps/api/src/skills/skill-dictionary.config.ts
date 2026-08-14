import { SkillCategory } from '@prisma/client';

export interface SkillDictionaryEntry {
  code: string;
  name: string;
  category: SkillCategory;
  /** Lowercase aliases used for matching (canonical name is also matched). */
  aliases: string[];
}

export const SKILL_DICTIONARY: SkillDictionaryEntry[] = [
  // Frontend
  {
    code: 'react',
    name: 'React',
    category: SkillCategory.FRONTEND,
    aliases: ['react.js', 'reactjs'],
  },
  {
    code: 'typescript',
    name: 'TypeScript',
    category: SkillCategory.FRONTEND,
    aliases: ['ts'],
  },
  {
    code: 'javascript',
    name: 'JavaScript',
    category: SkillCategory.FRONTEND,
    aliases: ['js', 'ecmascript'],
  },
  {
    code: 'redux',
    name: 'Redux',
    category: SkillCategory.FRONTEND,
    aliases: [],
  },
  {
    code: 'rtk',
    name: 'RTK',
    category: SkillCategory.FRONTEND,
    aliases: ['redux toolkit', 'redux-toolkit'],
  },
  {
    code: 'nextjs',
    name: 'Next.js',
    category: SkillCategory.FRONTEND,
    aliases: ['next', 'nextjs'],
  },
  {
    code: 'vue',
    name: 'Vue',
    category: SkillCategory.FRONTEND,
    aliases: ['vue.js', 'vuejs'],
  },
  {
    code: 'angular',
    name: 'Angular',
    category: SkillCategory.FRONTEND,
    aliases: [],
  },
  {
    code: 'css',
    name: 'CSS',
    category: SkillCategory.FRONTEND,
    aliases: [],
  },
  {
    code: 'html',
    name: 'HTML',
    category: SkillCategory.FRONTEND,
    aliases: [],
  },
  {
    code: 'webpack',
    name: 'Webpack',
    category: SkillCategory.FRONTEND,
    aliases: [],
  },
  {
    code: 'vite',
    name: 'Vite',
    category: SkillCategory.FRONTEND,
    aliases: [],
  },

  // Backend / Fullstack
  {
    code: 'nodejs',
    name: 'Node.js',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['node', 'nodejs', 'node js'],
  },
  {
    code: 'nestjs',
    name: 'NestJS',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['nest', 'nest.js'],
  },
  {
    code: 'express',
    name: 'Express',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['express.js', 'expressjs'],
  },
  {
    code: 'postgresql',
    name: 'PostgreSQL',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['postgres', 'psql', 'pg'],
  },
  {
    code: 'mongodb',
    name: 'MongoDB',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['mongo'],
  },
  {
    code: 'redis',
    name: 'Redis',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'docker',
    name: 'Docker',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'kafka',
    name: 'Kafka',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['apache kafka'],
  },
  {
    code: 'graphql',
    name: 'GraphQL',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'rest',
    name: 'REST',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['rest api', 'restful'],
  },
  {
    code: 'prisma',
    name: 'Prisma',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'java',
    name: 'Java',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'spring',
    name: 'Spring',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['spring boot', 'springboot'],
  },
  {
    code: 'golang',
    name: 'Go',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['golang', 'go lang'],
  },
  {
    code: 'python_backend',
    name: 'Python (backend)',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'django',
    name: 'Django',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'fastapi',
    name: 'FastAPI',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['fast api'],
  },
  {
    code: 'flask',
    name: 'Flask',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'ruby',
    name: 'Ruby',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['ruby on rails', 'rails'],
  },
  {
    code: 'php',
    name: 'PHP',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['laravel', 'symfony'],
  },
  {
    code: 'csharp',
    name: 'C#',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['.net', 'dotnet', 'asp.net'],
  },
  {
    code: 'mysql',
    name: 'MySQL',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'elasticsearch',
    name: 'Elasticsearch',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['elastic search', 'opensearch'],
  },
  {
    code: 'rabbitmq',
    name: 'RabbitMQ',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['rabbit mq'],
  },
  {
    code: 'grpc',
    name: 'gRPC',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: [],
  },
  {
    code: 'microservices',
    name: 'Microservices',
    category: SkillCategory.BACKEND_FULLSTACK,
    aliases: ['microservice', 'micro services'],
  },

  // ML / AI
  {
    code: 'python',
    name: 'Python',
    category: SkillCategory.ML_AI,
    aliases: [],
  },
  {
    code: 'pytorch',
    name: 'PyTorch',
    category: SkillCategory.ML_AI,
    aliases: ['torch'],
  },
  {
    code: 'tensorflow',
    name: 'TensorFlow',
    category: SkillCategory.ML_AI,
    aliases: ['tf'],
  },
  {
    code: 'scikit_learn',
    name: 'scikit-learn',
    category: SkillCategory.ML_AI,
    aliases: ['sklearn', 'scikit learn'],
  },
  {
    code: 'pandas',
    name: 'pandas',
    category: SkillCategory.ML_AI,
    aliases: [],
  },
  {
    code: 'sql',
    name: 'SQL',
    category: SkillCategory.ML_AI,
    aliases: [],
  },
  {
    code: 'airflow',
    name: 'Airflow',
    category: SkillCategory.ML_AI,
    aliases: ['apache airflow'],
  },
  {
    code: 'mlflow',
    name: 'MLflow',
    category: SkillCategory.ML_AI,
    aliases: ['ml flow'],
  },

  // AI-first
  {
    code: 'llm',
    name: 'LLM',
    category: SkillCategory.AI_FIRST,
    aliases: ['large language model', 'large language models'],
  },
  {
    code: 'rag',
    name: 'RAG',
    category: SkillCategory.AI_FIRST,
    aliases: [
      'retrieval augmented generation',
      'retrieval-augmented generation',
    ],
  },
  {
    code: 'langchain',
    name: 'LangChain',
    category: SkillCategory.AI_FIRST,
    aliases: [],
  },
  {
    code: 'langgraph',
    name: 'LangGraph',
    category: SkillCategory.AI_FIRST,
    aliases: [],
  },
  {
    code: 'mcp',
    name: 'MCP',
    category: SkillCategory.AI_FIRST,
    aliases: ['model context protocol'],
  },
  {
    code: 'agents',
    name: 'agents',
    category: SkillCategory.AI_FIRST,
    aliases: ['ai agent', 'ai agents', 'agentic'],
  },
  {
    code: 'embeddings',
    name: 'embeddings',
    category: SkillCategory.AI_FIRST,
    aliases: ['embedding'],
  },
  {
    code: 'vector_database',
    name: 'vector database',
    category: SkillCategory.AI_FIRST,
    aliases: ['vector db', 'vectordb', 'vector store'],
  },
  {
    code: 'openai_api',
    name: 'OpenAI API',
    category: SkillCategory.AI_FIRST,
    aliases: ['openai'],
  },
  {
    code: 'anthropic',
    name: 'Anthropic',
    category: SkillCategory.AI_FIRST,
    aliases: ['claude'],
  },
  {
    code: 'prompt_engineering',
    name: 'prompt engineering',
    category: SkillCategory.AI_FIRST,
    aliases: ['prompt engineer'],
  },
  {
    code: 'genai',
    name: 'GenAI',
    category: SkillCategory.AI_FIRST,
    aliases: ['generative ai', 'gen ai'],
  },

  // Mobile
  {
    code: 'kotlin',
    name: 'Kotlin',
    category: SkillCategory.MOBILE,
    aliases: [],
  },
  {
    code: 'swift',
    name: 'Swift',
    category: SkillCategory.MOBILE,
    aliases: [],
  },
  {
    code: 'react_native',
    name: 'React Native',
    category: SkillCategory.MOBILE,
    aliases: ['react-native', 'rn'],
  },
  {
    code: 'flutter',
    name: 'Flutter',
    category: SkillCategory.MOBILE,
    aliases: ['dart'],
  },
  {
    code: 'android',
    name: 'Android',
    category: SkillCategory.MOBILE,
    aliases: [],
  },
  {
    code: 'ios',
    name: 'iOS',
    category: SkillCategory.MOBILE,
    aliases: [],
  },

  // DevOps
  {
    code: 'kubernetes',
    name: 'Kubernetes',
    category: SkillCategory.DEVOPS,
    aliases: ['k8s'],
  },
  {
    code: 'terraform',
    name: 'Terraform',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'ansible',
    name: 'Ansible',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'aws',
    name: 'AWS',
    category: SkillCategory.DEVOPS,
    aliases: ['amazon web services'],
  },
  {
    code: 'ci_cd',
    name: 'CI/CD',
    category: SkillCategory.DEVOPS,
    aliases: ['cicd', 'continuous integration'],
  },
  {
    code: 'prometheus',
    name: 'Prometheus',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'helm',
    name: 'Helm',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'github_actions',
    name: 'GitHub Actions',
    category: SkillCategory.DEVOPS,
    aliases: ['github actions', 'gh actions'],
  },
  {
    code: 'gitlab_ci',
    name: 'GitLab CI',
    category: SkillCategory.DEVOPS,
    aliases: ['gitlab ci', 'gitlab-ci'],
  },
  {
    code: 'jenkins',
    name: 'Jenkins',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'gcp',
    name: 'GCP',
    category: SkillCategory.DEVOPS,
    aliases: ['google cloud', 'google cloud platform'],
  },
  {
    code: 'azure',
    name: 'Azure',
    category: SkillCategory.DEVOPS,
    aliases: ['microsoft azure'],
  },
  {
    code: 'linux',
    name: 'Linux',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'nginx',
    name: 'Nginx',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'grafana',
    name: 'Grafana',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },
  {
    code: 'argocd',
    name: 'Argo CD',
    category: SkillCategory.DEVOPS,
    aliases: ['argo cd'],
  },
  {
    code: 'pulumi',
    name: 'Pulumi',
    category: SkillCategory.DEVOPS,
    aliases: [],
  },

  // Data Engineering
  {
    code: 'spark',
    name: 'Spark',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: ['apache spark'],
  },
  {
    code: 'dbt',
    name: 'dbt',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: [],
  },
  {
    code: 'snowflake',
    name: 'Snowflake',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: [],
  },
  {
    code: 'bigquery',
    name: 'BigQuery',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: ['big query'],
  },
  {
    code: 'etl',
    name: 'ETL',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: ['elt'],
  },
  {
    code: 'databricks',
    name: 'Databricks',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: [],
  },
  {
    code: 'redshift',
    name: 'Redshift',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: ['amazon redshift'],
  },
  {
    code: 'hive',
    name: 'Hive',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: ['apache hive'],
  },
  {
    code: 'flink',
    name: 'Flink',
    category: SkillCategory.DATA_ENGINEERING,
    aliases: ['apache flink'],
  },
];

export function normalizeSkillAlias(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildSkillAliasIndex(
  dictionary: SkillDictionaryEntry[] = SKILL_DICTIONARY,
): Map<string, SkillDictionaryEntry> {
  const index = new Map<string, SkillDictionaryEntry>();

  for (const entry of dictionary) {
    const keys = [entry.name, entry.code, ...entry.aliases].map(
      normalizeSkillAlias,
    );
    for (const key of keys) {
      if (!key) {
        continue;
      }
      const existing = index.get(key);
      if (existing && existing.code !== entry.code) {
        throw new Error(
          `Duplicate skill alias "${key}" for ${existing.code} and ${entry.code}`,
        );
      }
      index.set(key, entry);
    }
  }

  return index;
}

export function assertSkillDictionaryUnique(): void {
  const codes = SKILL_DICTIONARY.map((entry) => entry.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error('Skill dictionary codes must be unique');
  }
  buildSkillAliasIndex();
}
