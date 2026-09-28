export type DomainErrorKind =
  'validation' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict';

export interface ErrorDetail {
  path: string;
  message: string;
}

/**
 * Base class for expected, typed failures raised by domain/application code.
 * It carries no HTTP knowledge; the presentation layer maps `kind` to a status.
 */
export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;

  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  readonly kind = 'validation';
}

export class UnauthorizedError extends DomainError {
  readonly kind = 'unauthorized';
}

export class ForbiddenError extends DomainError {
  readonly kind = 'forbidden';
}

export class NotFoundError extends DomainError {
  readonly kind = 'not_found';
}

export class ConflictError extends DomainError {
  readonly kind = 'conflict';
}
