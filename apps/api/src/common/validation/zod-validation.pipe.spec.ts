import { z } from 'zod';
import { ValidationError } from '../errors/domain-error';
import { ZodValidationPipe } from './zod-validation.pipe';

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(
    z.object({ id: z.uuid(), limit: z.coerce.number().int().max(100).default(20) }),
  );

  it('returns the parsed, coerced value', () => {
    expect(pipe.transform({ id: '3f2c8a4e-1b7d-4c1e-9a2b-6d5e4f3a2b1c', limit: '50' })).toEqual({
      id: '3f2c8a4e-1b7d-4c1e-9a2b-6d5e4f3a2b1c',
      limit: 50,
    });
  });

  it('throws ValidationError with the offending paths', () => {
    expect.assertions(2);
    try {
      pipe.transform({ id: 'not-a-uuid', limit: 500 });
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).details?.map((d) => d.path)).toEqual(['id', 'limit']);
    }
  });
});
