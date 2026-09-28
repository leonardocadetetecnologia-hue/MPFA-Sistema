import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { ApiConfig } from '@mpfa/config';
import { PrismaClient } from '@mpfa/database';
import { API_CONFIG } from '../config/config.module';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(API_CONFIG) config: ApiConfig) {
    // URL comes from validated config, not from Prisma's implicit env lookup.
    super({ datasources: { db: { url: config.DATABASE_URL } } });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
