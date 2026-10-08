import { Worker } from 'bullmq';
import Redis from 'ioredis';
import type { WorkerConfig } from '@mpfa/config';
import { QUEUES } from '@mpfa/contracts';
import type { Logger } from '@mpfa/logger';
import { createProcessor } from './processors';

export interface RunningWorker {
  worker: Worker;
  close(): Promise<void>;
}

export function startWorker(config: WorkerConfig, logger: Logger): RunningWorker {
  // BullMQ requires maxRetriesPerRequest=null on worker connections (blocking commands).
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  // ioredis emits an error on every reconnect attempt; log only state transitions.
  let unavailable = false;
  connection.on('error', (error: NodeJS.ErrnoException) => {
    if (unavailable) return;
    unavailable = true;
    logger.warn(
      { provider: 'redis', error_code: error.code, error_message: error.message },
      'redis unavailable, retrying in background',
    );
  });
  connection.on('ready', () => {
    if (!unavailable) return;
    unavailable = false;
    logger.info({ provider: 'redis' }, 'redis connection restored');
  });

  const worker = new Worker(
    QUEUES.system,
    createProcessor(logger, {
      apiInternalUrl: config.API_INTERNAL_URL,
      workerToken: config.WORKER_TOKEN,
    }),
    {
      connection,
      concurrency: config.WORKER_CONCURRENCY,
    },
  );

  worker.on('completed', (job) => {
    logger.info(
      {
        job_id: job.id,
        job_name: job.name,
        correlation_id: job.data?.correlation_id,
        attempts: job.attemptsMade,
      },
      'job completed',
    );
  });

  worker.on('failed', (job, error) => {
    const maxAttempts = job?.opts.attempts ?? 1;
    const exhausted =
      !job || job.attemptsMade >= maxAttempts || error.name === 'UnrecoverableError';
    logger[exhausted ? 'error' : 'warn'](
      {
        job_id: job?.id,
        job_name: job?.name,
        correlation_id: job?.data?.correlation_id,
        attempts: job?.attemptsMade,
        max_attempts: maxAttempts,
        err: error,
      },
      exhausted ? 'job failed permanently' : 'job failed, will retry',
    );
  });

  worker.on('error', (error) => logger.error({ err: error }, 'worker error'));

  return {
    worker,
    async close() {
      // Waits for in-flight jobs to finish before disconnecting.
      await worker.close();
      await connection.quit();
    },
  };
}
