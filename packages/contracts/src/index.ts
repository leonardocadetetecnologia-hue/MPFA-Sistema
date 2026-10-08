/**
 * Public contracts shared between api, worker and web.
 * Plain types and constants only: no ORM models, no framework imports.
 */

export type DependencyStatus = 'up' | 'down';

export interface DependencyCheck {
  status: DependencyStatus;
  latency_ms: number;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  service: 'api';
  environment: string;
  timestamp: string;
  checks?: {
    database: DependencyCheck;
    redis: DependencyCheck;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    request_id: string;
    details?: { path: string; message: string }[];
  };
}

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

export const QUEUES = {
  system: 'system',
} as const;

export const SYSTEM_JOBS = {
  ping: 'system.ping',
  ingest: 'ingestion.process',
} as const;

export interface JobEnvelope<TPayload> {
  correlation_id: string;
  payload: TPayload;
}

export type SystemPingJob = JobEnvelope<{ requested_at: string }>;

/** Default retry policy for producers; individual jobs may override when justified. */
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: { age: 24 * 3600, count: 1000 },
  removeOnFail: { age: 7 * 24 * 3600 },
} as const;
