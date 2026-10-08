import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { UnauthorizedError } from '../../../common/errors/domain-error';
import type { Actor } from '../domain/access';
import { AuthService } from '../application/auth.service';

export const SESSION_COOKIE = 'mpfa_session';

export interface RequestWithActor extends Request {
  actor?: Actor;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithActor>();
    const header = request.header('authorization');
    const bearer = header?.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;
    const sessionId = bearer || readCookie(request.header('cookie'), SESSION_COOKIE);
    if (!sessionId) throw new UnauthorizedError('AUTH_REQUIRED', 'Autenticação necessária.');
    request.actor = await this.auth.actorFromSession(sessionId);
    return true;
  }
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookie(sessionId: string, ttlSeconds: number): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${ttlSeconds}`;
}
