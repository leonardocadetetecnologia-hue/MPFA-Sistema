import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { ForbiddenError } from '../../../common/errors/domain-error';

export type AppRole = 'ADMINISTRATIVE' | 'LAWYER' | 'MANAGER' | 'CLIENT';

const scrypt = promisify(scryptCallback);

export const PERMISSIONS = [
  'user.manage',
  'client.manage',
  'process.manage',
  'ingestion.import',
  'publication.read',
  'publication.treat',
  'publication.publish',
  'task.manage',
  'time.entry',
  'time.review',
  'dashboard.individual',
  'dashboard.administrative',
  'dashboard.managerial',
  'portal.read',
  'audit.read',
  'integration.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL = new Set<Permission>(PERMISSIONS);

const BY_ROLE: Record<AppRole, ReadonlySet<Permission>> = {
  ADMINISTRATIVE: ALL,
  LAWYER: new Set([
    'publication.read',
    'publication.treat',
    'task.manage',
    'time.entry',
    'dashboard.individual',
    'process.manage',
    'ingestion.import',
  ]),
  MANAGER: new Set([
    'publication.read',
    'publication.treat',
    'task.manage',
    'time.entry',
    'time.review',
    'dashboard.individual',
    'dashboard.administrative',
    'dashboard.managerial',
    'audit.read',
    'integration.read',
    'client.manage',
    'process.manage',
  ]),
  CLIENT: new Set(['portal.read']),
};

export interface Actor {
  userId: string;
  organizationId: string;
  role: AppRole;
  clientId: string | null;
  email: string;
  status: 'ACTIVE' | 'DISABLED';
}

export function can(actor: Actor, permission: Permission): boolean {
  return actor.status === 'ACTIVE' && BY_ROLE[actor.role].has(permission);
}

export function assertCan(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) {
    throw new ForbiddenError('FORBIDDEN', 'Sem permissão para esta operação.');
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('base64url');
  const derived = (await scrypt(password, salt, 32)) as Buffer;
  return `scrypt$${salt}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const derived = (await scrypt(password, salt, 32)) as Buffer;
  const expected = Buffer.from(hash, 'base64url');
  if (expected.length !== derived.length) return false;
  return timingSafeEqual(expected, derived);
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}
