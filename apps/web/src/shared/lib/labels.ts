import {
  ForecastDirection,
  ForecastStatus,
  ForecastTargetMetric,
  MarketPeriod,
  RoleCluster,
  SyncStatus,
} from '@dev-market-oracle/shared-types';

export const MARKET_CLUSTERS: RoleCluster[] = [
  RoleCluster.FRONTEND,
  RoleCluster.FULLSTACK,
  RoleCluster.BACKEND,
  RoleCluster.MOBILE,
  RoleCluster.DEVOPS,
  RoleCluster.ML_AI,
  RoleCluster.AI_FIRST,
  RoleCluster.DATA_ENGINEERING,
];

export const CLUSTER_LABELS: Record<RoleCluster, string> = {
  [RoleCluster.FRONTEND]: 'Frontend',
  [RoleCluster.FULLSTACK]: 'Fullstack',
  [RoleCluster.BACKEND]: 'Backend',
  [RoleCluster.MOBILE]: 'Mobile',
  [RoleCluster.DEVOPS]: 'DevOps',
  [RoleCluster.ML_AI]: 'ML / AI',
  [RoleCluster.AI_FIRST]: 'AI-first',
  [RoleCluster.DATA_ENGINEERING]: 'Data Engineering',
  [RoleCluster.UNCLASSIFIED]: 'Без класса',
};

export const PERIOD_OPTIONS: Array<{ value: MarketPeriod; label: string }> = [
  { value: '7d', label: '7 дней' },
  { value: '30d', label: '30 дней' },
  { value: '90d', label: '90 дней' },
];

export const SOURCE_OPTIONS = [
  { value: 'ALL', label: 'Все источники' },
  { value: 'REMOTEOK', label: 'RemoteOK' },
  { value: 'JOBICY', label: 'Jobicy' },
] as const;

export const DIRECTION_LABELS: Record<ForecastDirection, string> = {
  [ForecastDirection.UP]: 'Рост',
  [ForecastDirection.DOWN]: 'Снижение',
  [ForecastDirection.STABLE]: 'Стабилизация',
};

export const FORECAST_STATUS_LABELS: Record<ForecastStatus, string> = {
  [ForecastStatus.READY]: 'Готов',
  [ForecastStatus.INSUFFICIENT_HISTORY]: 'Недостаточно истории',
  [ForecastStatus.FAILED]: 'Ошибка',
};

export const TARGET_METRIC_LABELS: Record<ForecastTargetMetric, string> = {
  [ForecastTargetMetric.VACANCY_COUNT]: 'Число вакансий',
  [ForecastTargetMetric.MARKET_SHARE]: 'Доля рынка',
};

export const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  [SyncStatus.QUEUED]: 'В очереди',
  [SyncStatus.RUNNING]: 'Выполняется',
  [SyncStatus.COMPLETED]: 'Завершён',
  [SyncStatus.PARTIALLY_COMPLETED]: 'Частично',
  [SyncStatus.FAILED]: 'Ошибка',
};

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatGrowth(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'н/д';
  }
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatPercent(value)}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return new Date(value).toLocaleString('ru-RU');
}
