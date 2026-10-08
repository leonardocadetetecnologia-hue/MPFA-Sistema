import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export async function storeOriginal(
  root: string,
  organizationId: string,
  hash: string,
  extension: string,
  bytes: Buffer,
): Promise<string> {
  const relative = path.join(organizationId, `${hash}${extension}`);
  const target = path.join(root, relative);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return relative;
}
