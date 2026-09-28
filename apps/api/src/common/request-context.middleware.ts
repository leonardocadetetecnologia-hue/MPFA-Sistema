import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { CORRELATION_ID_HEADER, REQUEST_ID_HEADER } from '@mpfa/contracts';

declare module 'http' {
  interface IncomingMessage {
    correlationId?: string;
  }
}

// Incoming ids end up in logs and response headers; anything outside this
// charset/length is discarded to prevent log/header injection.
const SAFE_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function pickId(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && SAFE_ID.test(candidate) ? candidate : undefined;
}

/**
 * Assigns `request_id` (per hop) and `correlation_id` (end-to-end, reused by jobs
 * and integrations). Must run before the HTTP logger so every log line carries them.
 */
export function requestContextMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
): void {
  const requestId = pickId(req.headers[REQUEST_ID_HEADER]) ?? randomUUID();
  const correlationId = pickId(req.headers[CORRELATION_ID_HEADER]) ?? requestId;
  req.id = requestId;
  req.correlationId = correlationId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  res.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
