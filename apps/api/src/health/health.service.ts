import { Inject, Injectable } from '@nestjs/common';
import type { ApiConfig } from '@mpfa/config';
import type { DependencyCheck, HealthResponse } from '@mpfa/contracts';
import { API_CONFIG } from '../config/config.module';
import { PrismaService } from '../infrastructure/prisma.service';
import { RedisService } from '../infrastructure/redis.service';

@Injectable()
export class HealthService {
  constructor(
    @Inject(API_CONFIG) private readonly config: ApiConfig,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  liveness(): HealthResponse {
    return this.response('ok');
  }

  async readiness(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      this.check(() => this.prisma.$queryRawUnsafe('SELECT 1')),
      this.check(() => this.redis.ping()),
    ]);
    const healthy = database.status === 'up' && redis.status === 'up';
    return { ...this.response(healthy ? 'ok' : 'error'), checks: { database, redis } };
  }

  private response(status: HealthResponse['status']): HealthResponse {
    return {
      status,
      service: 'api',
      environment: this.config.APP_ENV,
      timestamp: new Date().toISOString(),
    };
  }

  // Failure details are intentionally not returned: the endpoint is unauthenticated
  // and connection errors can reveal hostnames or credentials.
  private async check(probe: () => Promise<unknown>): Promise<DependencyCheck> {
    const startedAt = performance.now();
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), this.config.HEALTH_CHECK_TIMEOUT_MS);
    });
    try {
      await Promise.race([probe(), timeout]);
      return { status: 'up', latency_ms: Math.round(performance.now() - startedAt) };
    } catch {
      return { status: 'down', latency_ms: Math.round(performance.now() - startedAt) };
    } finally {
      clearTimeout(timer);
    }
  }
}
