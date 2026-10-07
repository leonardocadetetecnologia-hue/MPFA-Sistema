import { buildHealthResponse, readinessStatus } from './build-health-response';

describe('buildHealthResponse', () => {
  it('builds a liveness payload without checks', () => {
    const now = new Date('2026-10-07T12:00:00.000Z');
    expect(buildHealthResponse({ status: 'ok', environment: 'local', now })).toEqual({
      status: 'ok',
      service: 'api',
      environment: 'local',
      timestamp: '2026-10-07T12:00:00.000Z',
    });
  });

  it('includes checks when provided', () => {
    const checks = {
      database: { status: 'up' as const, latency_ms: 1 },
      redis: { status: 'down' as const, latency_ms: 2 },
    };
    const response = buildHealthResponse({
      status: 'error',
      environment: 'local',
      checks,
      now: new Date('2026-10-07T12:00:00.000Z'),
    });
    expect(response.checks).toEqual(checks);
  });
});

describe('readinessStatus', () => {
  it('is ok only when both dependencies are up', () => {
    const up = { status: 'up' as const, latency_ms: 1 };
    const down = { status: 'down' as const, latency_ms: 1 };
    expect(readinessStatus(up, up)).toBe('ok');
    expect(readinessStatus(up, down)).toBe('error');
    expect(readinessStatus(down, up)).toBe('error');
  });
});
