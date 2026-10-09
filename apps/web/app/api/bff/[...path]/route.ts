import { cookies } from 'next/headers';
import { loadWebConfig } from '@mpfa/config';

async function proxy(request: Request, path: string[]): Promise<Response> {
  if (
    path.length === 0 ||
    path.some((part) => part === '.' || part === '..' || part.includes('\\'))
  ) {
    return Response.json(
      { error: { code: 'INVALID_PATH', message: 'Caminho inválido.' } },
      { status: 400 },
    );
  }
  const jar = await cookies();
  const session = jar.get('mpfa_session')?.value;
  if (!session) {
    return Response.json(
      { error: { code: 'AUTH_REQUIRED', message: 'Autenticação necessária.' } },
      { status: 401 },
    );
  }
  const config = loadWebConfig();
  const target = new URL(`/api/v1/${path.join('/')}`, config.API_INTERNAL_URL);
  target.search = new URL(request.url).search;
  const headers = new Headers();
  headers.set('authorization', `Bearer ${session}`);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
  });
  const payload = await response.text();
  return new Response(payload, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  return proxy(request, path);
}
