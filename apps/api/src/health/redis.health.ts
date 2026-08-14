import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthIndicatorResult,
  HealthIndicatorService,
} from '@nestjs/terminus';
import Redis from 'ioredis';
import type { EnvConfig } from '../config/env.validation';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly healthIndicatorService: HealthIndicatorService,
  ) {}

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const indicator = this.healthIndicatorService.check(key);
    const host = this.config.get('REDIS_HOST', { infer: true });
    const port = this.config.get('REDIS_PORT', { infer: true });
    const redis = new Redis({
      host,
      port,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    try {
      await redis.connect();
      const pong = await redis.ping();
      if (pong !== 'PONG') {
        return indicator.down({
          message: `Unexpected ping response: ${String(pong)}`,
        });
      }
      return indicator.up();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Redis health check failed';
      return indicator.down({ message });
    } finally {
      redis.disconnect();
    }
  }
}
