import { Module } from '@nestjs/common';
import type { ApiConfig } from '@mpfa/config';
import { API_CONFIG } from '../config/config.module';
import { PrismaService } from '../infrastructure/prisma.service';
import { RedisService } from '../infrastructure/redis.service';
import { AuthService } from './iam/application/auth.service';
import { AuthController } from './iam/presentation/auth.controller';
import { SessionGuard } from './iam/presentation/session.guard';
import { ImportMessageService } from './ingestion/application/import-message';
import { IngestionController } from './ingestion/presentation/ingestion.controller';
import { IngestionInternalController } from './ingestion/presentation/ingestion-internal.controller';
import { OfficeService } from './office/application/office.service';
import { OfficeController } from './office/presentation/office.controller';

@Module({
  controllers: [AuthController, IngestionController, IngestionInternalController, OfficeController],
  providers: [
    SessionGuard,
    {
      provide: AuthService,
      useFactory: (prisma: PrismaService, redis: RedisService, config: ApiConfig) =>
        new AuthService(prisma, redis.client, config.SESSION_TTL_SECONDS),
      inject: [PrismaService, RedisService, API_CONFIG],
    },
    {
      provide: ImportMessageService,
      useFactory: (prisma: PrismaService, config: ApiConfig) =>
        new ImportMessageService(prisma, config.STORAGE_DIR),
      inject: [PrismaService, API_CONFIG],
    },
    {
      provide: OfficeService,
      useFactory: (prisma: PrismaService) => new OfficeService(prisma),
      inject: [PrismaService],
    },
  ],
})
export class ProductModule {}
