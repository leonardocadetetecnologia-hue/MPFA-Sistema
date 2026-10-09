import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { loadWebConfig } from '@mpfa/config';
import type { SessionUser } from './session-user';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function sessionToken(): Promise<string> {
  const jar = await cookies();
  const token = jar.get('mpfa_session')?.value;
  if (!token) redirect('/login');
  return token;
}

export async function requireUser(): Promise<SessionUser> {
  const body = await apiGet<{ user: SessionUser | null }>('/api/v1/auth/me');
  if (!body.user) redirect('/login');
  return body.user;
}

export async function apiGet<T>(path: string): Promise<T> {
  const config = loadWebConfig();
  const token = await sessionToken();
  const response = await fetch(new URL(path, config.API_INTERNAL_URL), {
    headers: { authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 401) redirect('/login');
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Não foi possível consultar os dados.',
      response.status,
    );
  }
  return payload as T;
}
