import { assertCan, can, hashPassword, verifyPassword, type Actor } from './access';
import { ForbiddenError } from '../../../common/errors/domain-error';

function actor(role: Actor['role']): Actor {
  return {
    userId: 'u',
    organizationId: 'o',
    role,
    clientId: role === 'CLIENT' ? 'c' : null,
    email: 'a@example.test',
    status: 'ACTIVE',
  };
}

describe('access', () => {
  it('keeps the client out of administration and hours', () => {
    expect(can(actor('CLIENT'), 'portal.read')).toBe(true);
    expect(can(actor('CLIENT'), 'time.entry')).toBe(false);
    expect(can(actor('LAWYER'), 'time.review')).toBe(false);
    expect(can(actor('MANAGER'), 'time.review')).toBe(true);
    expect(() => assertCan(actor('CLIENT'), 'ingestion.import')).toThrow(ForbiddenError);
  });

  it('verifies a password hash and rejects a different password', async () => {
    const stored = await hashPassword('local-secret');
    expect(await verifyPassword('local-secret', stored)).toBe(true);
    expect(await verifyPassword('other', stored)).toBe(false);
    expect(await verifyPassword('local-secret', 'plain')).toBe(false);
  });
});
