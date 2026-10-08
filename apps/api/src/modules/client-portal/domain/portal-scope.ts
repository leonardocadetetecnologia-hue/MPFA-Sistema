import { ForbiddenError } from '../../../common/errors/domain-error';
import type { Actor } from '../../iam/domain/access';

/** Portal reads only what was explicitly published to the caller's client. */
export function portalPublicationWhere(actor: Actor): {
  organizationId: string;
  clientId: string;
} {
  if (actor.role !== 'CLIENT' || !actor.clientId) {
    throw new ForbiddenError('PORTAL_SCOPE', 'O portal exige um cliente vinculado ao usuário.');
  }
  return { organizationId: actor.organizationId, clientId: actor.clientId };
}

export interface PortalPublicationView {
  id: string;
  cnj: string | null;
  act_type: string | null;
  publication_date: string | null;
  text: string;
}

export function toPortalView(input: {
  id: string;
  cnjFormatted: string | null;
  actType: string | null;
  publicationDate: Date | null;
  text: string;
}): PortalPublicationView {
  return {
    id: input.id,
    cnj: input.cnjFormatted,
    act_type: input.actType,
    publication_date: input.publicationDate?.toISOString().slice(0, 10) ?? null,
    text: input.text,
  };
}
