import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorResponse } from '@mpfa/contracts';
import { DomainError, type DomainErrorKind } from './domain-error';

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  validation: HttpStatus.BAD_REQUEST,
  unauthorized: HttpStatus.UNAUTHORIZED,
  forbidden: HttpStatus.FORBIDDEN,
  not_found: HttpStatus.NOT_FOUND,
  conflict: HttpStatus.CONFLICT,
};

interface MappedError {
  status: number;
  body: ErrorResponse['error'];
}

/**
 * Single place where failures become HTTP responses.
 * Clients get a stable `{ error: { code, message, request_id } }` shape and never
 * see stack traces or internal messages; unexpected errors are logged in full.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const requestId = String(request.id ?? 'unknown');

    const { status, body } = this.map(exception, requestId);

    if (status >= 500) {
      this.logger.error(
        {
          err: exception,
          request_id: requestId,
          correlation_id: request.correlationId,
        },
        'unhandled error',
      );
    }

    response.status(status).json({ error: body } satisfies ErrorResponse);
  }

  private map(exception: unknown, requestId: string): MappedError {
    if (exception instanceof DomainError) {
      return {
        status: STATUS_BY_KIND[exception.kind],
        body: {
          code: exception.code,
          message: exception.message,
          request_id: requestId,
          ...(exception.details ? { details: exception.details } : {}),
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        body: {
          code: HttpStatus[status] ?? 'HTTP_ERROR',
          message: status >= 500 ? 'Internal server error' : exception.message,
          request_id: requestId,
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        request_id: requestId,
      },
    };
  }
}
