import { type ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { ConflictError, NotFoundError, ValidationError } from './domain-error';

function createHost(requestId = 'req-1') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ id: requestId, correlationId: 'corr-1' }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  beforeAll(() => Logger.overrideLogger(false));

  it.each([
    [new ValidationError('VALIDATION_FAILED', 'bad'), 400],
    [new NotFoundError('MATTER_NOT_FOUND', 'missing'), 404],
    [new ConflictError('DUPLICATED', 'dup'), 409],
  ])('maps %p to status %i with code and request_id', (error, expectedStatus) => {
    const { host, status, json } = createHost();
    filter.catch(error, host);
    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith({
      error: { code: error.code, message: error.message, request_id: 'req-1' },
    });
  });

  it('keeps validation details', () => {
    const { host, json } = createHost();
    filter.catch(
      new ValidationError('VALIDATION_FAILED', 'bad', [{ path: 'email', message: 'invalid' }]),
      host,
    );
    expect(json.mock.calls[0][0].error.details).toEqual([{ path: 'email', message: 'invalid' }]);
  });

  it('maps Nest HttpException using its status', () => {
    const { host, status, json } = createHost();
    filter.catch(new NotFoundException('Cannot GET /x'), host);
    expect(status).toHaveBeenCalledWith(404);
    expect(json.mock.calls[0][0].error).toMatchObject({ code: 'NOT_FOUND', request_id: 'req-1' });
  });

  it('hides unexpected errors behind a generic 500 without leaking internals', () => {
    const { host, status, json } = createHost();
    filter.catch(new Error('connection to db-internal:5432 failed password=xyz'), host);
    expect(status).toHaveBeenCalledWith(500);
    const body = JSON.stringify(json.mock.calls[0][0]);
    expect(body).toContain('INTERNAL_ERROR');
    expect(body).toContain('req-1');
    expect(body).not.toContain('db-internal');
    expect(body).not.toContain('stack');
  });
});
