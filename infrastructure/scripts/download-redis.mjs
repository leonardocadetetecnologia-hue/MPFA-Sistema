#!/usr/bin/env node
/**
 * Downloads a portable Redis server into `.local/redis/` for machines without Docker.
 * Official runtime remains docker-compose.yml.
 */
import { createWriteStream, existsSync, mkdirSync, rmSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const destDir = path.join(root, '.local', 'redis');
const zipPath = path.join(root, '.local', 'redis-windows.zip');
const exeName = process.platform === 'win32' ? 'redis-server.exe' : 'redis-server';
const already = path.join(destDir, exeName);

if (existsSync(already)) {
  console.log(`[download-redis] already present: ${already}`);
  process.exit(0);
}

if (process.platform !== 'win32') {
  console.error('[download-redis] on this OS, install redis-server and set REDIS_SERVER_BIN');
  process.exit(1);
}

// Pinned portable Windows build (no installer). See docs/runbooks/local-dev.md.
const url =
  process.env.REDIS_WINDOWS_URL ??
  'https://github.com/redis-windows/redis-windows/releases/download/8.2.1/Redis-8.2.1-Windows-x64-msys2.zip';

mkdirSync(path.dirname(zipPath), { recursive: true });
console.log(`[download-redis] fetching ${url}`);

const response = await fetch(url, { redirect: 'follow' });
if (!response.ok || !response.body) {
  console.error(`[download-redis] download failed: ${response.status}`);
  process.exit(1);
}

await pipeline(Readable.fromWeb(response.body), createWriteStream(zipPath));
mkdirSync(destDir, { recursive: true });

try {
  execFileSync('tar', ['-xf', zipPath, '-C', destDir, '--strip-components', '1'], {
    stdio: 'inherit',
  });
} catch {
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(destDir, { recursive: true });
  execFileSync('tar', ['-xf', zipPath, '-C', destDir], { stdio: 'inherit' });
}

if (!existsSync(already)) {
  console.error(`[download-redis] extracted archive but ${exeName} was not found`);
  process.exit(1);
}

console.log(`[download-redis] ready at ${already}`);
