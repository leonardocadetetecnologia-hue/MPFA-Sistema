export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiCall<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  const response = await fetch(`/api/bff/${path}`, { ...init, headers });
  const payload = (await response.json().catch(() => null)) as {
    error?: { message?: string };
  } | null;
  if (response.status === 401) {
    window.location.href = '/login';
    throw new ApiError('Sessão expirada.', 401);
  }
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message ?? 'Não foi possível concluir a operação.',
      response.status,
    );
  }
  return payload as T;
}

export async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const chunks: string[] = [];
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    chunks.push(String.fromCharCode(...bytes.subarray(index, index + size)));
  }
  return btoa(chunks.join(''));
}
