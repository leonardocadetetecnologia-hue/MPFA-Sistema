import type { DependencyCheck } from '@mpfa/contracts';

/**
 * Runs a dependency probe with a hard timeout.
 * Failure details are intentionally discarded: health endpoints are unauthenticated
 * and connection errors can reveal hostnames or credentials.
 */
export async function probeDependency(
  probe: () => Promise<unknown>,
  timeoutMs: number,
): Promise<DependencyCheck> {
  const startedAt = performance.now();
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });
  try {
    await Promise.race([probe(), timeout]);
    return { status: 'up', latency_ms: Math.round(performance.now() - startedAt) };
  } catch {
    return { status: 'down', latency_ms: Math.round(performance.now() - startedAt) };
  } finally {
    clearTimeout(timer);
  }
}
