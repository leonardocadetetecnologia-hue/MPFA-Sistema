import pino, { type DestinationStream, type Logger, type LoggerOptions } from 'pino';

export type { Logger } from 'pino';

export interface LoggerSettings {
  service: 'api' | 'worker' | 'web';
  environment: string;
  level: string;
}

/**
 * Paths removed from every log line. Covers HTTP credentials and common secret
 * field names at the first nesting levels; domain payloads must not be logged whole.
 */
export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.secret',
  '*.accessToken',
  '*.refreshToken',
  'password',
  'token',
  'secret',
];

export function buildLoggerOptions(settings: LoggerSettings): LoggerOptions {
  return {
    level: settings.level,
    base: { service: settings.service, env: settings.environment },
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: 'message',
    formatters: {
      level: (label) => ({ level: label }),
    },
    redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
  };
}

export function createLogger(settings: LoggerSettings, destination?: DestinationStream): Logger {
  return pino(buildLoggerOptions(settings), destination);
}
