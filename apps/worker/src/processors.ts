import { type Job, UnrecoverableError } from 'bullmq';
import { SYSTEM_JOBS, type SystemPingJob } from '@mpfa/contracts';
import type { Logger } from '@mpfa/logger';

type Handler = (job: Job, logger: Logger) => Promise<unknown>;

export interface WorkerDeps {
  apiInternalUrl?: string;
  workerToken?: string;
  fetchImpl?: typeof fetch;
}

// Registry of job name -> handler. New modules register their jobs here
// instead of creating ad-hoc workers.
export function createHandlers(deps: WorkerDeps = {}): Record<string, Handler> {
  return {
    [SYSTEM_JOBS.ping]: async (job) => {
      const data = job.data as SystemPingJob;
      return {
        pong: true,
        correlation_id: data.correlation_id,
        processed_at: new Date().toISOString(),
      };
    },
    [SYSTEM_JOBS.ingest]: async (job, logger) => {
      if (!deps.apiInternalUrl || !deps.workerToken) {
        throw new UnrecoverableError(
          'Worker sem API_INTERNAL_URL ou WORKER_TOKEN para processar a importação.',
        );
      }
      const batchId = (job.data as { payload?: { batch_id?: string } }).payload?.batch_id;
      if (!batchId) throw new UnrecoverableError('Job de importação sem batch_id.');
      const response = await (deps.fetchImpl ?? fetch)(
        new URL(`/api/v1/internal/ingestion/${batchId}/process`, deps.apiInternalUrl),
        { method: 'POST', headers: { 'x-worker-token': deps.workerToken } },
      );
      if (!response.ok) {
        logger.warn({ status: response.status, batch_id: batchId }, 'ingestion replay rejected');
        throw new Error(`ingestion replay failed with status ${response.status}`);
      }
      return { replayed: true, batch_id: batchId };
    },
  };
}

export function createProcessor(logger: Logger, deps: WorkerDeps = {}) {
  const handlers = createHandlers(deps);
  return async (job: Job): Promise<unknown> => {
    const handler = handlers[job.name];
    if (!handler) {
      // Retrying cannot fix an unknown job name; fail it permanently and visibly.
      throw new UnrecoverableError(`No handler registered for job "${job.name}"`);
    }
    const correlationId = (job.data as { correlation_id?: string }).correlation_id;
    return handler(
      job,
      logger.child({ job_id: job.id, job_name: job.name, correlation_id: correlationId }),
    );
  };
}
