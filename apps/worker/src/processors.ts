import { type Job, UnrecoverableError } from 'bullmq';
import { SYSTEM_JOBS, type SystemPingJob } from '@mpfa/contracts';
import type { Logger } from '@mpfa/logger';

type Handler = (job: Job, logger: Logger) => Promise<unknown>;

// Registry of job name -> handler. New modules register their jobs here
// (e.g. webjur.publication.import) instead of creating ad-hoc workers.
const handlers: Record<string, Handler> = {
  [SYSTEM_JOBS.ping]: async (job) => {
    const data = job.data as SystemPingJob;
    return {
      pong: true,
      correlation_id: data.correlation_id,
      processed_at: new Date().toISOString(),
    };
  },
};

export function createProcessor(logger: Logger) {
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
