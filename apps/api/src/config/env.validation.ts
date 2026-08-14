import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_URL: z.string().optional(),

  REMOTEOK_BASE_URL: z.string().url().default('https://remoteok.com'),
  REMOTEOK_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15000),
  REMOTEOK_MAX_CONCURRENCY: z.coerce.number().int().positive().default(1),
  REMOTEOK_DETAILS_LIMIT_PER_RUN: z.coerce
    .number()
    .int()
    .positive()
    .default(200),
  REMOTEOK_REFRESH_AFTER_HOURS: z.coerce.number().int().positive().default(24),

  JOBICY_BASE_URL: z.string().url().default('https://jobicy.com'),
  JOBICY_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  JOBICY_MAX_CONCURRENCY: z.coerce.number().int().positive().default(1),
  JOBICY_DETAILS_LIMIT_PER_RUN: z.coerce.number().int().positive().default(200),
  JOBICY_REFRESH_AFTER_HOURS: z.coerce.number().int().positive().default(24),

  SYNC_MIN_HISTORY_DAYS_FOR_FORECAST: z.coerce
    .number()
    .int()
    .positive()
    .default(14),
  SYNC_FORECAST_HORIZON_DAYS: z.coerce.number().int().positive().default(30),
  SYNC_DEFAULT_SOURCE_CODES: z.string().default('REMOTEOK,JOBICY'),
  SYNC_MAX_PROFILES_PER_RUN: z.coerce.number().int().positive().default(24),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment variables: ${details}`);
  }
  return parsed.data;
}
