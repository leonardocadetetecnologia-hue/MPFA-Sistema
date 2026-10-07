import { probeDependency } from './timed-dependency-probe';

describe('probeDependency', () => {
  it('reports up with latency when the probe resolves', async () => {
    const result = await probeDependency(async () => undefined, 500);
    expect(result.status).toBe('up');
    expect(result.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it('reports down without leaking the failure reason', async () => {
    const result = await probeDependency(async () => {
      throw new Error('redis://secret-host:6379 refused');
    }, 500);
    expect(result).toEqual({ status: 'down', latency_ms: expect.any(Number) });
    expect(JSON.stringify(result)).not.toContain('secret-host');
  });

  it('reports down when the probe exceeds the timeout', async () => {
    const result = await probeDependency(
      () => new Promise((resolve) => setTimeout(resolve, 200)),
      20,
    );
    expect(result.status).toBe('down');
  });
});
