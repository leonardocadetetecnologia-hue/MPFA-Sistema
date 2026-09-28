import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { loadWorkerConfig } from '@mpfa/config';
import { DEFAULT_JOB_OPTIONS, QUEUES, SYSTEM_JOBS, type SystemPingJob } from '@mpfa/contracts';
import { createLogger } from '@mpfa/logger';
import { startWorker, type RunningWorker } from '../src/worker';

/** Runs against REDIS_URL (local runtime or CI service). Never point it at production. */
describe('worker (integration)', () => {
  const config = loadWorkerConfig({ ...process.env, LOG_LEVEL: 'error' });
  const logger = createLogger({ service: 'worker', environment: 'test', level: 'error' });
  const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUES.system, { connection });
  const events = new QueueEvents(QUEUES.system, { connection: connection.duplicate() });
  let running: RunningWorker;

  beforeAll(async () => {
    await queue.obliterate({ force: true });
    await events.waitUntilReady();
    running = startWorker(config, logger);
    await running.worker.waitUntilReady();
  });

  afterAll(async () => {
    await running.close();
    await events.close();
    await queue.close();
    await connection.quit();
  });

  it('processes system.ping end to end', async () => {
    const data: SystemPingJob = {
      correlation_id: 'it-worker-1',
      payload: { requested_at: new Date().toISOString() },
    };
    const job = await queue.add(SYSTEM_JOBS.ping, data, DEFAULT_JOB_OPTIONS);
    const result = await job.waitUntilFinished(events, 10000);
    expect(result).toMatchObject({ pong: true, correlation_id: 'it-worker-1' });
  });

  it('deduplicates jobs that share an idempotency key (jobId)', async () => {
    const data: SystemPingJob = { correlation_id: 'it-worker-2', payload: { requested_at: 'x' } };
    const options = { ...DEFAULT_JOB_OPTIONS, jobId: 'ping-idempotency-key' };
    const first = await queue.add(SYSTEM_JOBS.ping, data, options);
    const second = await queue.add(SYSTEM_JOBS.ping, data, options);
    expect(second.id).toBe(first.id);
    await first.waitUntilFinished(events, 10000);
  });

  it('marks jobs without handler as failed with a visible reason', async () => {
    const job = await queue.add(
      'unknown.job',
      { correlation_id: 'it-worker-3' },
      DEFAULT_JOB_OPTIONS,
    );
    await expect(job.waitUntilFinished(events, 10000)).rejects.toThrow(/No handler registered/);
    const failed = await queue.getJob(String(job.id));
    expect(failed?.attemptsMade).toBe(1);
  });
});
