import 'server-only';
import { loadWebConfig } from '@mpfa/config';
import type { HealthResponse } from '@mpfa/contracts';

export type ApiStatus =
  | { kind: 'ready'; health: HealthResponse }
  | { kind: 'degraded'; health: HealthResponse }
  | { kind: 'unreachable' };

/** Server-side only: the internal API URL is never shipped to the browser. */
export async function fetchApiStatus(): Promise<{ environment: string; status: ApiStatus }> {
  const config = loadWebConfig();
  try {
    const response = await fetch(new URL('/health/ready', config.API_INTERNAL_URL), {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
    const health = (await response.json()) as HealthResponse;
    return {
      environment: config.APP_ENV,
      status: response.ok ? { kind: 'ready', health } : { kind: 'degraded', health },
    };
  } catch {
    return { environment: config.APP_ENV, status: { kind: 'unreachable' } };
  }
}
