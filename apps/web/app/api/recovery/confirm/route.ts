import { loadWebConfig } from '@mpfa/config';

export async function POST(request: Request): Promise<Response> {
  const config = loadWebConfig();
  const response = await fetch(new URL('/api/v1/auth/recovery/confirm', config.API_INTERNAL_URL), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: await request.text(),
    cache: 'no-store',
  });
  return new Response(await response.text(), {
    status: response.status,
    headers: { 'content-type': 'application/json' },
  });
}
