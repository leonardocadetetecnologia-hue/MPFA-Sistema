import { once } from 'node:events';
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';
import type { ApiConfig } from '@mpfa/config';
import { API_CONFIG } from '../config/config.module';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor(@Inject(API_CONFIG) config: ApiConfig) {
    // No offline queue: while Redis is unreachable commands fail immediately,
    // so readiness reports "down" instead of hanging requests.
    this.client = new Redis(config.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
    });
    // ioredis emits an error on every reconnect attempt; log only state transitions.
    let unavailable = false;
    this.client.on('error', (error: NodeJS.ErrnoException) => {
      if (unavailable) return;
      unavailable = true;
      this.logger.warn(
        { provider: 'redis', error_code: error.code, error_message: error.message },
        'redis unavailable, retrying in background',
      );
    });
    this.client.on('ready', () => {
      if (!unavailable) return;
      unavailable = false;
      this.logger.log({ provider: 'redis' }, 'redis connection restored');
    });
  }

  async ping(): Promise<string> {
    if (this.client.status === 'ready') {
      return this.client.ping();
    }
    if (this.client.status === 'wait' || this.client.status === 'end') {
      await this.client.connect();
      return this.client.ping();
    }
    await once(this.client, 'ready');
    return this.client.ping();
  }

  onModuleInit(): void {
    // Connect in the background so a down Redis does not block process start.
    this.client.connect().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
