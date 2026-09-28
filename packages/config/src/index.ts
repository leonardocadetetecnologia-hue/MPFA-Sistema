import { z } from 'zod';

/**
 * Single entry point for environment configuration.
 * Apps must never read `process.env` directly: they call one of the loaders below
 * at startup and fail fast if the environment is invalid.
 */

export const APP_ENVIRONMENTS = ['local', 'staging', 'production'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const commonSchema = z.object({
  APP_ENV: z.enum(APP_ENVIRONMENTS),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const postgresUrl = z.string().regex(/^postgres(ql)?:\/\/.+/, 'must be a postgres:// URL');
const redisUrl = z.string().regex(/^rediss?:\/\/.+/, 'must be a redis:// or rediss:// URL');

const apiSchema = commonSchema.extend({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: postgresUrl,
  REDIS_URL: redisUrl,
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  OPENAPI_ENABLED: booleanString.optional(),
  HEALTH_CHECK_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(2000),
});

const workerSchema = commonSchema.extend({
  REDIS_URL: redisUrl,
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
});

const webSchema = commonSchema.extend({
  API_INTERNAL_URL: z.url(),
});

export type ApiConfig = Omit<z.output<typeof apiSchema>, 'OPENAPI_ENABLED'> & {
  OPENAPI_ENABLED: boolean;
};
export type WorkerConfig = z.output<typeof workerSchema>;
export type WebConfig = z.output<typeof webSchema>;

export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid environment configuration:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'ConfigError';
  }
}

type Env = Record<string, string | undefined>;

function parse<T extends z.ZodType>(schema: T, env: Env): z.output<T> {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Only key names and rule messages are reported; values may be secrets.
    throw new ConfigError(
      result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  return result.data;
}

export function loadApiConfig(env: Env = process.env): ApiConfig {
  const config = parse(apiSchema, env);
  return {
    ...config,
    OPENAPI_ENABLED: config.OPENAPI_ENABLED ?? config.APP_ENV !== 'production',
  };
}

export function loadWorkerConfig(env: Env = process.env): WorkerConfig {
  return parse(workerSchema, env);
}

export function loadWebConfig(env: Env = process.env): WebConfig {
  return parse(webSchema, env);
}
