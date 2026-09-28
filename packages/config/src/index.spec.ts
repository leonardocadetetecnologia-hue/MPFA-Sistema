import { ConfigError, loadApiConfig, loadWebConfig, loadWorkerConfig } from './index';

const validApiEnv = {
  APP_ENV: 'local',
  DATABASE_URL: 'postgresql://mpfa:super-secret-value@localhost:5432/mpfa',
  REDIS_URL: 'redis://localhost:6379',
};

describe('loadApiConfig', () => {
  it('parses a valid environment and applies defaults', () => {
    const config = loadApiConfig(validApiEnv);
    expect(config.APP_ENV).toBe('local');
    expect(config.API_PORT).toBe(3001);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.CORS_ORIGINS).toEqual([]);
    expect(config.OPENAPI_ENABLED).toBe(true);
  });

  it('splits CORS origins and coerces numbers', () => {
    const config = loadApiConfig({
      ...validApiEnv,
      API_PORT: '8080',
      CORS_ORIGINS: 'https://a.example, https://b.example',
    });
    expect(config.API_PORT).toBe(8080);
    expect(config.CORS_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  });

  it('disables OpenAPI by default in production but allows explicit opt-in', () => {
    expect(loadApiConfig({ ...validApiEnv, APP_ENV: 'production' }).OPENAPI_ENABLED).toBe(false);
    expect(
      loadApiConfig({ ...validApiEnv, APP_ENV: 'production', OPENAPI_ENABLED: 'true' })
        .OPENAPI_ENABLED,
    ).toBe(true);
  });

  it('fails fast listing every missing key', () => {
    expect(() => loadApiConfig({})).toThrow(ConfigError);
    expect.assertions(4);
    try {
      loadApiConfig({});
    } catch (error) {
      const issues = (error as ConfigError).issues.join('\n');
      expect(issues).toContain('APP_ENV');
      expect(issues).toContain('DATABASE_URL');
      expect(issues).toContain('REDIS_URL');
    }
  });

  it('rejects an unknown APP_ENV', () => {
    expect(() => loadApiConfig({ ...validApiEnv, APP_ENV: 'dev' })).toThrow(/APP_ENV/);
  });

  it('never echoes configuration values in the error', () => {
    const secret = 'mysql://root:leaked-password@db';
    expect.assertions(2);
    try {
      loadApiConfig({ ...validApiEnv, DATABASE_URL: secret });
    } catch (error) {
      expect((error as Error).message).toContain('DATABASE_URL');
      expect((error as Error).message).not.toContain('leaked-password');
    }
  });
});

describe('loadWorkerConfig', () => {
  it('requires REDIS_URL', () => {
    expect(() => loadWorkerConfig({ APP_ENV: 'staging' })).toThrow(/REDIS_URL/);
    expect(loadWorkerConfig({ APP_ENV: 'staging', REDIS_URL: 'redis://r:6379' })).toMatchObject({
      WORKER_CONCURRENCY: 5,
    });
  });
});

describe('loadWebConfig', () => {
  it('requires a valid API_INTERNAL_URL', () => {
    expect(() => loadWebConfig({ APP_ENV: 'local', API_INTERNAL_URL: 'not-a-url' })).toThrow(
      /API_INTERNAL_URL/,
    );
    expect(
      loadWebConfig({ APP_ENV: 'local', API_INTERNAL_URL: 'http://api:3001' }).API_INTERNAL_URL,
    ).toBe('http://api:3001');
  });
});
