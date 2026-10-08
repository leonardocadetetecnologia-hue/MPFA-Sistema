import { NotFoundError, UnauthorizedError, ValidationError } from '../../../common/errors/domain-error';
import type { Actor } from '../domain/access';
import { AuthService } from './auth.service';

const stored: Actor = {
  userId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  role: 'LAWYER',
  clientId: null,
  email: 'advogado@mpfa.local',
  status: 'ACTIVE',
};

function harness(
  user: { status: 'ACTIVE' | 'DISABLED'; id?: string } | null,
  sessionRaw: string | null = JSON.stringify(stored),
) {
  const deleted: string[] = [];
  const audits: string[] = [];
  const redis = {
    get: async () => sessionRaw,
    del: async (key: string) => {
      deleted.push(key);
      return 1;
    },
    set: async () => 'OK',
  };
  const prisma = {
    user: {
      findFirst: async () =>
        user
          ? {
              id: user.id ?? stored.userId,
              organizationId: stored.organizationId,
              role: 'LAWYER' as const,
              clientId: null,
              email: stored.email,
              status: user.status,
            }
          : null,
      update: async () => ({ id: stored.userId }),
    },
    auditEvent: {
      create: async (input: { data: { action: string } }) => {
        audits.push(input.data.action);
        return { id: 'audit' };
      },
    },
  };
  return {
    auth: new AuthService(prisma as never, redis as never, 60),
    deleted,
    audits,
  };
}

describe('AuthService session', () => {
  const admin: Actor = { ...stored, userId: '33333333-3333-4333-8333-333333333333', role: 'ADMINISTRATIVE' };

  it('drops a session when the user was disabled after login', async () => {
    const { auth, deleted } = harness({ status: 'DISABLED' });
    await expect(auth.actorFromSession('sess-1')).rejects.toBeInstanceOf(UnauthorizedError);
    expect(deleted).toEqual(['session:sess-1']);
  });

  it('rejects a missing session as expired', async () => {
    const { auth } = harness({ status: 'ACTIVE' }, null);
    await expect(auth.actorFromSession('missing')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });

  it('records USER_DISABLED inside the same organization', async () => {
    const target = '44444444-4444-4444-8444-444444444444';
    const { auth, audits } = harness({ status: 'ACTIVE', id: target });
    await auth.disableUser(admin, target);
    expect(audits).toEqual(['USER_DISABLED']);
  });

  it('refuses to disable the signed-in account', async () => {
    const { auth } = harness({ status: 'ACTIVE', id: admin.userId });
    await expect(auth.disableUser(admin, admin.userId)).rejects.toBeInstanceOf(ValidationError);
  });

  it('does not disable a user outside the organization', async () => {
    const { auth } = harness(null);
    await expect(auth.disableUser(admin, '55555555-5555-4555-8555-555555555555')).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
