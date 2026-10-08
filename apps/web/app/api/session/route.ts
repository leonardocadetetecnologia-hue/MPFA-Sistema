import { cookies } from 'next/headers';
import { loadWebConfig } from '@mpfa/config';

export async function POST(request: Request): Promise<Response> {
  const config = loadWebConfig();
  const body = await request.text();
  const response = await fetch(new URL('/api/v1/auth/login', config.API_INTERNAL_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    cache: 'no-store',
  });
  const payload = (await response.json()) as { session_id?: string; [key: string]: unknown };
  if (response.ok && typeof payload.session_id === 'string') {
    const jar = await cookies();
    jar.set('mpfa_session', payload.session_id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    delete payload.session_id;
  }
  return Response.json(payload, { status: response.status });
}
