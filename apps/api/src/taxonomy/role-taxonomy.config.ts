import { RoleCluster } from '@prisma/client';

export type VacancySourceCode = 'REMOTEOK' | 'JOBICY';

export interface QueryProfileSeed {
  code: string;
  title: string;
  clusterHint: RoleCluster;
  searchText: string;
  sourceCode: VacancySourceCode;
  host: string;
  isActive: boolean;
}

const REMOTEOK = 'REMOTEOK' as const;
const JOBICY = 'JOBICY' as const;
const REMOTEOK_HOST = 'remoteok.com';
const JOBICY_HOST = 'jobicy.com';

function remoteok(
  code: string,
  title: string,
  clusterHint: RoleCluster,
  searchText: string,
  isActive = true,
): QueryProfileSeed {
  return {
    code,
    title,
    clusterHint,
    searchText,
    sourceCode: REMOTEOK,
    host: REMOTEOK_HOST,
    isActive,
  };
}

function jobicy(
  code: string,
  title: string,
  clusterHint: RoleCluster,
  searchText: string,
  isActive = true,
): QueryProfileSeed {
  return {
    code,
    title,
    clusterHint,
    searchText,
    sourceCode: JOBICY,
    host: JOBICY_HOST,
    isActive,
  };
}

/**
 * Search profiles for RemoteOK (tags) and Jobicy (tag).
 * Final classification is done later by RoleClassifierService.
 */
export const QUERY_PROFILES: QueryProfileSeed[] = [
  // Frontend
  remoteok('rok_fe_react', 'RemoteOK react', RoleCluster.FRONTEND, 'react'),
  remoteok(
    'rok_fe_frontend',
    'RemoteOK frontend',
    RoleCluster.FRONTEND,
    'frontend',
  ),
  jobicy('jcy_fe_react', 'Jobicy react', RoleCluster.FRONTEND, 'react'),
  jobicy(
    'jcy_fe_javascript',
    'Jobicy javascript',
    RoleCluster.FRONTEND,
    'javascript',
  ),

  // Fullstack
  remoteok(
    'rok_fs_fullstack',
    'RemoteOK fullstack',
    RoleCluster.FULLSTACK,
    'fullstack',
  ),
  jobicy(
    'jcy_fs_fullstack',
    'Jobicy fullstack',
    RoleCluster.FULLSTACK,
    'fullstack',
  ),

  // Backend
  remoteok(
    'rok_be_backend',
    'RemoteOK backend',
    RoleCluster.BACKEND,
    'backend',
  ),
  remoteok('rok_be_nodejs', 'RemoteOK node', RoleCluster.BACKEND, 'node'),
  remoteok('rok_be_java', 'RemoteOK java', RoleCluster.BACKEND, 'java'),
  remoteok('rok_be_golang', 'RemoteOK golang', RoleCluster.BACKEND, 'golang'),
  jobicy('jcy_be_backend', 'Jobicy backend', RoleCluster.BACKEND, 'backend'),
  jobicy('jcy_be_java', 'Jobicy java', RoleCluster.BACKEND, 'java'),
  jobicy('jcy_be_golang', 'Jobicy golang', RoleCluster.BACKEND, 'golang'),

  // Mobile
  remoteok('rok_mo_mobile', 'RemoteOK mobile', RoleCluster.MOBILE, 'mobile'),
  remoteok('rok_mo_android', 'RemoteOK android', RoleCluster.MOBILE, 'android'),
  jobicy('jcy_mo_mobile', 'Jobicy mobile', RoleCluster.MOBILE, 'mobile'),

  // DevOps
  remoteok('rok_do_devops', 'RemoteOK devops', RoleCluster.DEVOPS, 'devops'),
  remoteok(
    'rok_do_kubernetes',
    'RemoteOK kubernetes',
    RoleCluster.DEVOPS,
    'kubernetes',
  ),
  remoteok('rok_do_aws', 'RemoteOK aws', RoleCluster.DEVOPS, 'aws'),
  remoteok(
    'rok_do_terraform',
    'RemoteOK terraform',
    RoleCluster.DEVOPS,
    'terraform',
  ),
  jobicy('jcy_do_devops', 'Jobicy devops', RoleCluster.DEVOPS, 'devops'),
  jobicy('jcy_do_aws', 'Jobicy aws', RoleCluster.DEVOPS, 'aws'),
  jobicy(
    'jcy_do_kubernetes',
    'Jobicy kubernetes',
    RoleCluster.DEVOPS,
    'kubernetes',
  ),

  // ML / AI
  remoteok(
    'rok_ml_machine-learning',
    'RemoteOK ML',
    RoleCluster.ML_AI,
    'machine-learning',
  ),
  remoteok('rok_ml_python', 'RemoteOK python', RoleCluster.ML_AI, 'python'),
  jobicy('jcy_ml_python', 'Jobicy python', RoleCluster.ML_AI, 'python'),

  // AI-first
  remoteok('rok_ai_ai', 'RemoteOK ai', RoleCluster.AI_FIRST, 'ai'),
  remoteok('rok_ai_llm', 'RemoteOK llm', RoleCluster.AI_FIRST, 'llm'),
  jobicy('jcy_ai_ai', 'Jobicy ai', RoleCluster.AI_FIRST, 'ai'),

  // Data Engineering
  remoteok(
    'rok_de_data',
    'RemoteOK data',
    RoleCluster.DATA_ENGINEERING,
    'data',
  ),
  remoteok('rok_de_etl', 'RemoteOK etl', RoleCluster.DATA_ENGINEERING, 'etl'),
  remoteok(
    'rok_de_spark',
    'RemoteOK spark',
    RoleCluster.DATA_ENGINEERING,
    'spark',
  ),
  jobicy('jcy_de_data', 'Jobicy data', RoleCluster.DATA_ENGINEERING, 'data'),
  jobicy('jcy_de_etl', 'Jobicy etl', RoleCluster.DATA_ENGINEERING, 'etl'),
];

export function getQueryProfilesByCluster(
  cluster: RoleCluster,
): QueryProfileSeed[] {
  return QUERY_PROFILES.filter((profile) => profile.clusterHint === cluster);
}

export function getActiveQueryProfiles(): QueryProfileSeed[] {
  return QUERY_PROFILES.filter((profile) => profile.isActive);
}

export function getActiveQueryProfilesBySource(
  sourceCode: VacancySourceCode,
): QueryProfileSeed[] {
  return getActiveQueryProfiles().filter(
    (profile) => profile.sourceCode === sourceCode,
  );
}

export function assertQueryProfilesUnique(): void {
  const codes = QUERY_PROFILES.map((profile) => profile.code);
  if (new Set(codes).size !== codes.length) {
    throw new Error('Query profile codes must be unique');
  }
}
