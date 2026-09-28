#!/usr/bin/env node
/**
 * Stops the portable local runtime started by local-up.mjs.
 * Does not delete `.local/postgres` or `.local/redis-data`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const pidFile = path.join(root, '.local', 'local-up.pid');

function killPid(pid) {
  if (!pid || Number.isNaN(pid)) return;
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGTERM');
    }
  } catch {
    // Process already gone.
  }
}

if (!existsSync(pidFile)) {
  console.log('[local-down] no pid file; nothing to stop');
  process.exit(0);
}

const raw = readFileSync(pidFile, 'utf8').trim();
for (const line of raw.split(/\r?\n/)) {
  const pid = Number(line.trim());
  killPid(pid);
}

console.log('[local-down] sent stop signal');
