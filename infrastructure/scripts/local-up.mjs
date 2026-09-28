#!/usr/bin/env node
/**
 * Local development runtime WITHOUT Docker: starts a portable PostgreSQL
 * (embedded-postgres, npm) and, if available, a portable Redis binary.
 * Official runtime is docker-compose.yml; this exists for machines without Docker.
 *
 * Usage: npm run local:up   (reads .env; Ctrl+C stops everything)
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

function fail(message) {
  console.error(`[local-up] ${message}`);
  process.exit(1);
}

let EmbeddedPostgres;
try {
  ({ default: EmbeddedPostgres } = await import('embedded-postgres'));
} catch (error) {
  fail(
    `embedded-postgres failed to load (${error?.message ?? error}). Install the platform binary: @embedded-postgres/windows-x64 or @embedded-postgres/linux-x64.`,
  );
}

const root = path.resolve(import.meta.dirname, '..', '..');
const localDir = path.join(root, '.local');
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

if (process.env.APP_ENV !== 'local') fail('APP_ENV must be "local" to use the local runtime.');

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
if (!databaseUrl || !redisUrl) fail('DATABASE_URL and REDIS_URL must be set (copy .env.example).');

const db = new URL(databaseUrl);
const redis = new URL(redisUrl);
// Safety net: this script creates/initialises databases, so it only touches localhost.
if (!LOCAL_HOSTS.has(db.hostname) || !LOCAL_HOSTS.has(redis.hostname)) {
  fail('DATABASE_URL and REDIS_URL must point to localhost for the local runtime.');
}

const dbName = db.pathname.replace(/^\//, '');
const pgDataDir = path.join(localDir, 'postgres');
const postgres = new EmbeddedPostgres({
  databaseDir: pgDataDir,
  port: Number(db.port || 5432),
  user: decodeURIComponent(db.username),
  password: decodeURIComponent(db.password),
  authMethod: 'scram-sha-256',
  persistent: true,
  onLog: () => {},
  onError: (error) => console.error('[postgres]', String(error).trim()),
});

let redisProcess;

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 500 });
    socket.once('connect', () => {
      socket.end();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function startPostgres() {
  const port = Number(db.port || 5432);
  if (await isPortOpen(db.hostname, port)) {
    console.log(`[local-up] PostgreSQL already listening on port ${port}`);
    return;
  }
  if (!existsSync(path.join(pgDataDir, 'PG_VERSION'))) {
    console.log('[local-up] initialising PostgreSQL data directory');
    await postgres.initialise();
  }
  await postgres.start();
  try {
    await postgres.createDatabase(dbName);
    console.log(`[local-up] database "${dbName}" created`);
  } catch (error) {
    if (!String(error?.message ?? error).includes('already exists')) throw error;
  }
  console.log(`[local-up] PostgreSQL ready on port ${db.port || 5432}`);
}

async function startRedis() {
  const port = Number(redis.port || 6379);
  if (await isPortOpen(redis.hostname, port)) {
    console.log(`[local-up] Redis already listening on port ${port}`);
    return;
  }
  const bin =
    process.env.REDIS_SERVER_BIN ??
    path.join(
      localDir,
      'redis',
      process.platform === 'win32' ? 'redis-server.exe' : 'redis-server',
    );
  if (!existsSync(bin)) {
    console.warn(
      `[local-up] Redis binary not found at ${bin}. See docs/runbooks/local-dev.md; continuing with PostgreSQL only.`,
    );
    return;
  }
  const dataDir = path.join(localDir, 'redis-data');
  mkdirSync(dataDir, { recursive: true });
  const args = [
    '--port',
    redis.port || '6379',
    '--bind',
    '127.0.0.1',
    '--dir',
    dataDir,
    '--appendonly',
    'no',
  ];
  if (redis.password) args.push('--requirepass', decodeURIComponent(redis.password));
  redisProcess = spawn(bin, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  redisProcess.on('exit', (code) => console.log(`[local-up] Redis exited (${code})`));
  const started = Date.now();
  while (!(await isPortOpen(redis.hostname, port))) {
    if (Date.now() - started > 10_000) fail(`Redis did not start on port ${port}`);
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log(`[local-up] Redis ready on port ${port}`);
}

async function shutdown() {
  console.log('[local-up] stopping');
  redisProcess?.kill();
  await postgres.stop().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

try {
  await startPostgres();
} catch (error) {
  fail(`PostgreSQL failed to start: ${error?.message ?? error}`);
}
await startRedis();
mkdirSync(localDir, { recursive: true });
writeFileSync(path.join(localDir, 'local-up.pid'), `${process.pid}\n`);
console.log('[local-up] running — press Ctrl+C to stop');
setInterval(() => {}, 1 << 30);
