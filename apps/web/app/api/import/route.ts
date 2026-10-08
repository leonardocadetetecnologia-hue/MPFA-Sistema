import { cookies } from 'next/headers';
import { loadWebConfig } from '@mpfa/config';

export async function POST(request: Request): Promise<Response> {
  const config = loadWebConfig();
  const jar = await cookies();
  const session = jar.get('mpfa_session')?.value;
  if (!session)
    return Response.json({ error: { message: 'Autenticação necessária.' } }, { status: 401 });
  const response = await fetch(new URL('/api/v1/ingestion/messages', config.API_INTERNAL_URL), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session}`,
    },
    body: await request.text(),
    cache: 'no-store',
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
