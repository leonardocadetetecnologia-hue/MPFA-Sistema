import { ForbiddenError } from '../../../common/errors/domain-error';
import type { Actor } from '../../iam/domain/access';
import { portalPublicationWhere, toPortalView } from './portal-scope';

const client: Actor = {
  userId: 'u',
  organizationId: 'org',
  role: 'CLIENT',
  clientId: 'client-1',
  email: 'c@example.test',
  status: 'ACTIVE',
};

describe('portal scope', () => {
  it('scopes the query to the caller client', () => {
    expect(portalPublicationWhere(client)).toEqual({
      organizationId: 'org',
      clientId: 'client-1',
    });
  });

  it('blocks a lawyer from the portal query helper', () => {
    expect(() => portalPublicationWhere({ ...client, role: 'LAWYER', clientId: null })).toThrow(
      ForbiddenError,
    );
  });

  it('drops internal fields from the client view', () => {
    const view = toPortalView({
      id: 'p',
      cnjFormatted: '0000001-87.2026.5.03.0001',
      actType: 'Intimação',
      publicationDate: new Date('2026-09-24T00:00:00.000Z'),
      text: 'texto publicado',
    });
    expect(view).toEqual({
      id: 'p',
      cnj: '0000001-87.2026.5.03.0001',
      act_type: 'Intimação',
      publication_date: '2026-09-24',
      text: 'texto publicado',
    });
    expect(view).not.toHaveProperty('internal');
  });
});
