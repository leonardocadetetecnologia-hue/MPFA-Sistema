export type AppRole = 'ADMINISTRATIVE' | 'LAWYER' | 'MANAGER' | 'CLIENT';

export interface SessionUser {
  userId: string;
  organizationId: string;
  role: AppRole;
  clientId: string | null;
  email: string;
  status: 'ACTIVE' | 'DISABLED';
}

export type Permission =
  | 'user.manage'
  | 'client.manage'
  | 'process.manage'
  | 'ingestion.import'
  | 'publication.read'
  | 'publication.treat'
  | 'publication.publish'
  | 'task.manage'
  | 'time.entry'
  | 'time.review'
  | 'dashboard.individual'
  | 'dashboard.administrative'
  | 'dashboard.managerial'
  | 'portal.read'
  | 'audit.read'
  | 'integration.read';

/**
 * Espelho só da navegação. A autorização que vale é a do backend.
 * Manter alinhado com apps/api/src/modules/iam/domain/access.ts.
 */
const BY_ROLE: Record<AppRole, ReadonlySet<Permission>> = {
  ADMINISTRATIVE: new Set([
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
  ]),
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

export function can(user: SessionUser, permission: Permission): boolean {
  return user.status === 'ACTIVE' && BY_ROLE[user.role].has(permission);
}

export const ROLE_LABEL: Record<AppRole, string> = {
  ADMINISTRATIVE: 'Administrativo',
  LAWYER: 'Advogado',
  MANAGER: 'Gestão',
  CLIENT: 'Cliente',
};
