import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigError, loadApiConfig } from '@mpfa/config';
import { createLogger } from '@mpfa/logger';
import { AppModule } from './app.module';
import { configureApp } from './configure-app';

async function bootstrap(): Promise<void> {
  let config;
  try {
    config = loadApiConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      createLogger({ service: 'api', environment: 'unknown', level: 'info' }).fatal(
        { issues: error.issues },
        'invalid configuration, refusing to start',
      );
      process.exit(1);
    }
    throw error;
  }

  const app = await NestFactory.create(AppModule.forRoot(config), {
    bufferLogs: true,
    bodyParser: false,
  });
  configureApp(app, config);
  await app.listen(config.API_PORT, '0.0.0.0');
}

void bootstrap();
