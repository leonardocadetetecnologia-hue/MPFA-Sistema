import { type Job, UnrecoverableError } from 'bullmq';
import { createLogger } from '@mpfa/logger';
import { createProcessor } from './processors';

const logger = createLogger({ service: 'worker', environment: 'local', level: 'silent' });
const processor = createProcessor(logger);

function job(name: string, data: unknown): Job {
  return { id: '1', name, data } as Job;
}

describe('createProcessor', () => {
  it('handles system.ping and echoes the correlation id', async () => {
    const result = await processor(
      job('system.ping', { correlation_id: 'c-1', payload: { requested_at: 'now' } }),
    );
    expect(result).toMatchObject({ pong: true, correlation_id: 'c-1' });
  });

  it('fails unknown jobs permanently instead of retrying', async () => {
    await expect(processor(job('unknown.job', {}))).rejects.toBeInstanceOf(UnrecoverableError);
  });
});
