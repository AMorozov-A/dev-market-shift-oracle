export enum RoleCluster {
  FRONTEND = 'FRONTEND',
  FULLSTACK = 'FULLSTACK',
  BACKEND = 'BACKEND',
  MOBILE = 'MOBILE',
  DEVOPS = 'DEVOPS',
  ML_AI = 'ML_AI',
  AI_FIRST = 'AI_FIRST',
  DATA_ENGINEERING = 'DATA_ENGINEERING',
  UNCLASSIFIED = 'UNCLASSIFIED',
}

export enum SyncStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED',
  FAILED = 'FAILED',
}

export enum SkillCategory {
  FRONTEND = 'FRONTEND',
  BACKEND_FULLSTACK = 'BACKEND_FULLSTACK',
  MOBILE = 'MOBILE',
  DEVOPS = 'DEVOPS',
  ML_AI = 'ML_AI',
  AI_FIRST = 'AI_FIRST',
  DATA_ENGINEERING = 'DATA_ENGINEERING',
}

export type MarketPeriod = '7d' | '30d' | '90d';
export type SourceCode = 'REMOTEOK' | 'JOBICY' | 'ALL';

export enum ForecastTargetMetric {
  VACANCY_COUNT = 'VACANCY_COUNT',
  MARKET_SHARE = 'MARKET_SHARE',
}

export enum ForecastDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  STABLE = 'STABLE',
}

export enum ForecastStatus {
  READY = 'READY',
  INSUFFICIENT_HISTORY = 'INSUFFICIENT_HISTORY',
  FAILED = 'FAILED',
}

export interface ApiErrorBody {
  timestamp: string;
  path: string;
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
}

export interface DataWindow {
  start: string;
  end: string;
  daysRequested?: number;
  daysWithData: number;
}

export interface MarketOverviewResponse {
  lastUpdatedAt: string | null;
  period: MarketPeriod;
  source: string;
  dataWindow: DataWindow;
  coverage: {
    totalVacancies: number;
    classifiedVacanciesInPeriod: number;
    salaryCoverageRate: number;
    historyStatus: ForecastStatus | 'READY' | 'INSUFFICIENT_HISTORY';
    daysNeededForForecast: number;
  };
  roleClusters: Array<{
    roleCluster: RoleCluster;
    vacancyCount: number;
    marketShare: number;
    growthRate: number;
    sampleSize: number;
  }>;
  keyObservation: {
    code: string;
    roleCluster: RoleCluster | null;
    message: string;
  };
  caveats: string[];
}
