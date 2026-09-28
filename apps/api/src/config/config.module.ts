import { type DynamicModule, Global, Module } from '@nestjs/common';
import type { ApiConfig } from '@mpfa/config';

export const API_CONFIG = Symbol('API_CONFIG');

/** Exposes the configuration validated in `main.ts` to the whole application. */
@Global()
@Module({})
export class ConfigModule {
  static forRoot(config: ApiConfig): DynamicModule {
    return {
      module: ConfigModule,
      providers: [{ provide: API_CONFIG, useValue: config }],
      exports: [API_CONFIG],
    };
  }
}
