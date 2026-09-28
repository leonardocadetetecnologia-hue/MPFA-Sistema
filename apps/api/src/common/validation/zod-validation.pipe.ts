import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { ValidationError } from '../errors/domain-error';

/**
 * Boundary validation for body/query/params: `@Body(new ZodValidationPipe(schema))`.
 * Returns the parsed (typed, coerced) value; rejects with a ValidationError listing
 * offending paths so the error filter can answer 400 consistently.
 */
export class ZodValidationPipe<TSchema extends z.ZodType> implements PipeTransform {
  constructor(private readonly schema: TSchema) {}

  transform(value: unknown): z.output<TSchema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ValidationError(
        'VALIDATION_FAILED',
        'Request validation failed',
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
    return result.data;
  }
}
