import { randomUUID } from 'node:crypto';
import { type DynamicModule, Module, RequestMethod } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import type { ApiConfig } from '@mpfa/config';
import { buildLoggerOptions } from '@mpfa/logger';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';
import { AuditModule } from './modules/audit/audit.module';
import { IamModule } from './modules/iam/iam.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { SystemAdminModule } from './modules/system-admin/system-admin.module';
import { UsersModule } from './modules/users/users.module';

@Module({})
export class AppModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(config),
        LoggerModule.forRoot({
          // Named wildcard: nestjs-pino's default '*' triggers the Nest 11 legacy-route warning.
          forRoutes: [{ path: '{*splat}', method: RequestMethod.ALL }],
          pinoHttp: {
            ...buildLoggerOptions({
              service: 'api',
              environment: config.APP_ENV,
              level: config.LOG_LEVEL,
            }),
            // Ids are assigned by requestContextMiddleware, which runs first.
            genReqId: (req) => req.id ?? randomUUID(),
            customProps: (req) => ({ correlation_id: req.correlationId }),
            customLogLevel: (_req, res, err) =>
              err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
            autoLogging: { ignore: (req) => req.url === '/health/live' },
          },
        }),
        InfrastructureModule,
        HealthModule,
        IamModule,
        OrganizationsModule,
        UsersModule,
        AuditModule,
        SystemAdminModule,
      ],
    };
  }
}
