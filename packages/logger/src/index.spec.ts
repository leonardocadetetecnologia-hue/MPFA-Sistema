import { Writable } from 'node:stream';
import { createLogger } from './index';

function captureLogger() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(JSON.parse(chunk.toString()) as Record<string, unknown>);
      callback();
    },
  });
  const logger = createLogger({ service: 'api', environment: 'local', level: 'info' }, stream);
  return { logger, lines };
}

describe('createLogger', () => {
  it('emits structured JSON with service, env and textual level', () => {
    const { logger, lines } = captureLogger();
    logger.info({ correlation_id: 'abc', module: 'health' }, 'ready');
    expect(lines[0]).toMatchObject({
      level: 'info',
      service: 'api',
      env: 'local',
      message: 'ready',
      correlation_id: 'abc',
      module: 'health',
    });
    expect(typeof lines[0]?.time).toBe('string');
  });

  it('redacts secrets and credentials', () => {
    const { logger, lines } = captureLogger();
    logger.info(
      {
        req: { headers: { authorization: 'Bearer abc', cookie: 'sid=1' } },
        user: { password: 'p@ss', token: 't0k' },
      },
      'request',
    );
    const serialized = JSON.stringify(lines[0]);
    expect(serialized).not.toContain('Bearer abc');
    expect(serialized).not.toContain('sid=1');
    expect(serialized).not.toContain('p@ss');
    expect(serialized).not.toContain('t0k');
    expect(serialized).toContain('[REDACTED]');
  });

  it('respects the configured level', () => {
    const { logger, lines } = captureLogger();
    logger.debug('hidden');
    expect(lines).toHaveLength(0);
  });
});
