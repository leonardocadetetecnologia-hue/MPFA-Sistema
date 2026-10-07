import { Inject, Injectable } from '@nestjs/common';
import type { ApiConfig } from '@mpfa/config';
import type { HealthResponse } from '@mpfa/contracts';
import { API_CONFIG } from '../../config/config.module';
import { PrismaService } from '../../infrastructure/prisma.service';
import { RedisService } from '../../infrastructure/redis.service';
import { buildHealthResponse, readinessStatus } from '../domain/build-health-response';
import { probeDependency } from '../infrastructure/timed-dependency-probe';

/**
 * Application layer for healthchecks (Model orchestration in MVC terms).
 * Coordinates domain shaping and infrastructure probes; no HTTP concerns.
 */
@Injectable()
export class HealthService {
  constructor(
    @Inject(API_CONFIG) private readonly config: ApiConfig,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  liveness(): HealthResponse {
    return buildHealthResponse({ status: 'ok', environment: this.config.APP_ENV });
  }

  async readiness(): Promise<HealthResponse> {
    const [database, redis] = await Promise.all([
      probeDependency(
        () => this.prisma.$queryRawUnsafe('SELECT 1'),
        this.config.HEALTH_CHECK_TIMEOUT_MS,
      ),
      probeDependency(() => this.redis.ping(), this.config.HEALTH_CHECK_TIMEOUT_MS),
    ]);
    return buildHealthResponse({
      status: readinessStatus(database, redis),
      environment: this.config.APP_ENV,
      checks: { database, redis },
    });
  }
}
