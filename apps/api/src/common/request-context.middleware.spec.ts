import type { IncomingMessage, ServerResponse } from 'node:http';
import { requestContextMiddleware } from './request-context.middleware';

function run(headers: Record<string, string>) {
  const req = { headers } as unknown as IncomingMessage;
  const setHeader = jest.fn();
  const res = { setHeader } as unknown as ServerResponse;
  const next = jest.fn();
  requestContextMiddleware(req, res, next);
  return { req, setHeader, next };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('requestContextMiddleware', () => {
  it('generates request and correlation ids when absent', () => {
    const { req, setHeader, next } = run({});
    expect(String(req.id)).toMatch(UUID);
    expect(req.correlationId).toBe(req.id);
    expect(setHeader).toHaveBeenCalledWith('x-request-id', req.id);
    expect(setHeader).toHaveBeenCalledWith('x-correlation-id', req.id);
    expect(next).toHaveBeenCalled();
  });

  it('propagates valid incoming ids', () => {
    const { req } = run({ 'x-request-id': 'edge-123', 'x-correlation-id': 'flow-abc' });
    expect(req.id).toBe('edge-123');
    expect(req.correlationId).toBe('flow-abc');
  });

  it('discards unsafe incoming ids to prevent log/header injection', () => {
    const { req } = run({ 'x-correlation-id': 'bad\nvalue', 'x-request-id': 'x'.repeat(200) });
    expect(String(req.id)).toMatch(UUID);
    expect(req.correlationId).toBe(req.id);
  });
});
