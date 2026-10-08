import { execFile } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import EmbeddedPostgres from 'embedded-postgres';

const execFileAsync = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..', '..');
const databaseUrl = 'postgresql://mpfa:mpfa@127.0.0.1:55432/mpfa';
const databaseDir = mkdtempSync(path.join(tmpdir(), 'mpfa-pg-'));
const postgres = new EmbeddedPostgres({
  databaseDir,
  user: 'mpfa',
  password: 'mpfa',
  port: 55432,
  persistent: false,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

await postgres.initialise();
await postgres.start();
await postgres.createDatabase('mpfa');
await execFileAsync(
  process.execPath,
  [path.join(root, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'],
  {
    cwd: path.join(root, 'packages', 'database'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
  },
);
console.log('READY');

async function shutdown() {
  await postgres.stop().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
setInterval(() => {}, 1 << 30);
