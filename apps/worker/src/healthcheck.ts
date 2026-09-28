import Redis from 'ioredis';
import { loadWorkerConfig } from '@mpfa/config';

/** Container HEALTHCHECK: exits 0 only if the worker's Redis is reachable. */
async function check(): Promise<void> {
  const { REDIS_URL } = loadWorkerConfig();
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    connectTimeout: 2000,
    retryStrategy: () => null,
  });
  try {
    await client.connect();
    await client.ping();
    process.exit(0);
  } catch {
    process.exit(1);
  } finally {
    client.disconnect();
  }
}

void check();
