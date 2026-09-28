import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import type { ApiConfig } from '@mpfa/config';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { requestContextMiddleware } from './common/request-context.middleware';

export const API_PREFIX = 'api/v1';

/** Cross-cutting HTTP setup shared by `main.ts` and integration tests. */
export function configureApp(app: INestApplication, config: ApiConfig): void {
  app.useLogger(app.get(Logger));
  app.use(requestContextMiddleware);
  app.useGlobalFilters(new AllExceptionsFilter());
  app.setGlobalPrefix(API_PREFIX, { exclude: ['health/live', 'health/ready'] });
  app.enableCors({ origin: config.CORS_ORIGINS.length > 0 ? config.CORS_ORIGINS : false });
  app.enableShutdownHooks();

  if (config.OPENAPI_ENABLED) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Plataforma MPFA API')
        .setVersion('0.1.0')
        .addTag('health')
        .build(),
    );
    SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'openapi.json' });
  }
}
