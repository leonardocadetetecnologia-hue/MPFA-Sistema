import { ConfigError, loadWorkerConfig } from '@mpfa/config';
import { createLogger } from '@mpfa/logger';
import { startWorker } from './worker';

function main(): void {
  let config;
  try {
    config = loadWorkerConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      createLogger({ service: 'worker', environment: 'unknown', level: 'info' }).fatal(
        { issues: error.issues },
        'invalid configuration, refusing to start',
      );
      process.exit(1);
    }
    throw error;
  }

  const logger = createLogger({
    service: 'worker',
    environment: config.APP_ENV,
    level: config.LOG_LEVEL,
  });
  const running = startWorker(config, logger);
  logger.info({ concurrency: config.WORKER_CONCURRENCY }, 'worker started');

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down worker');
    running
      .close()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        logger.error({ err: error }, 'error during shutdown');
        process.exit(1);
      });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main();
