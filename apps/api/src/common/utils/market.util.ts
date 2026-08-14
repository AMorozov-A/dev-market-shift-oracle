import { RoleCluster } from '@prisma/client';

/** Eight forecastable product clusters (excludes UNCLASSIFIED). */
export const MARKET_ROLE_CLUSTERS: RoleCluster[] = [
  RoleCluster.FRONTEND,
  RoleCluster.FULLSTACK,
  RoleCluster.BACKEND,
  RoleCluster.MOBILE,
  RoleCluster.DEVOPS,
  RoleCluster.ML_AI,
  RoleCluster.AI_FIRST,
  RoleCluster.DATA_ENGINEERING,
];

export type MarketPeriod = '7d' | '30d' | '90d';

export function periodToDays(period: MarketPeriod): number {
  switch (period) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
  }
}

/** UTC calendar date at 00:00:00.000Z */
export function toUtcDateOnly(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

export function addUtcDays(date: Date, days: number): Date {
  const next = toUtcDateOnly(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function formatUtcDate(date: Date): string {
  return toUtcDateOnly(date).toISOString().slice(0, 10);
}

export function startOfPeriodWindow(
  endInclusive: Date,
  periodDays: number,
): Date {
  return addUtcDays(toUtcDateOnly(endInclusive), -(periodDays - 1));
}

export function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function mean(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function growthRate(current: number, previous: number): number {
  return (current - previous) / Math.max(previous, 1);
}

export function salaryMidpoint(
  salaryFrom: number | null,
  salaryTo: number | null,
): number | null {
  if (salaryFrom !== null && salaryTo !== null) {
    return (salaryFrom + salaryTo) / 2;
  }
  if (salaryFrom !== null) {
    return salaryFrom;
  }
  if (salaryTo !== null) {
    return salaryTo;
  }
  return null;
}
