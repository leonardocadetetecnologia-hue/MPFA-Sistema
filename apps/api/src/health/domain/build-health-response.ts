import type { DependencyCheck, HealthResponse } from '@mpfa/contracts';

/** Assembles the public health contract. No I/O — pure domain shaping. */
export function buildHealthResponse(input: {
  status: HealthResponse['status'];
  environment: string;
  checks?: HealthResponse['checks'];
  now?: Date;
}): HealthResponse {
  const response: HealthResponse = {
    status: input.status,
    service: 'api',
    environment: input.environment,
    timestamp: (input.now ?? new Date()).toISOString(),
  };
  if (input.checks) {
    response.checks = input.checks;
  }
  return response;
}

export function readinessStatus(
  database: DependencyCheck,
  redis: DependencyCheck,
): HealthResponse['status'] {
  return database.status === 'up' && redis.status === 'up' ? 'ok' : 'error';
}
