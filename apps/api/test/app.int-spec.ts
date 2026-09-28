import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { loadApiConfig } from '@mpfa/config';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

/**
 * Runs against the PostgreSQL/Redis referenced by DATABASE_URL/REDIS_URL
 * (local runtime or CI service containers). Never point it at production.
 */
async function createApp(overrides: Record<string, string> = {}): Promise<INestApplication> {
  const config = loadApiConfig({
    ...process.env,
    LOG_LEVEL: 'error',
    HEALTH_CHECK_TIMEOUT_MS: '1500',
    ...overrides,
  });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule.forRoot(config)],
  }).compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  configureApp(app, config);
  await app.init();
  return app;
}

describe('API foundation (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', service: 'api' });
  });

  it('GET /health/ready reports PostgreSQL and Redis up', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready');
    expect(res.body).toMatchObject({
      status: 'ok',
      checks: { database: { status: 'up' }, redis: { status: 'up' } },
    });
    expect(res.status).toBe(200);
  });

  it('propagates correlation id and returns the standard error shape', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .set('x-correlation-id', 'it-correlation-1')
      .expect(404);
    expect(res.headers['x-correlation-id']).toBe('it-correlation-1');
    expect(res.body.error).toMatchObject({
      code: 'NOT_FOUND',
      request_id: res.headers['x-request-id'],
    });
  });

  it('serves the OpenAPI document', async () => {
    const res = await request(app.getHttpServer()).get('/openapi.json').expect(200);
    expect(res.body.info.title).toBe('Plataforma MPFA API');
    expect(Object.keys(res.body.paths)).toEqual(
      expect.arrayContaining(['/health/live', '/health/ready']),
    );
  });
});

describe('API readiness with a dependency down (integration)', () => {
  it('returns 503 and marks Redis down without leaking connection details', async () => {
    const app = await createApp({ REDIS_URL: 'redis://127.0.0.1:1' });
    try {
      const res = await request(app.getHttpServer()).get('/health/ready').expect(503);
      expect(res.body.status).toBe('error');
      expect(res.body.checks.redis.status).toBe('down');
      expect(res.body.checks.database.status).toBe('up');
      expect(JSON.stringify(res.body)).not.toContain('127.0.0.1');
    } finally {
      await app.close();
    }
  });
});
