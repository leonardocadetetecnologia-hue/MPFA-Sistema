import { Controller, Headers, Inject, Param, Post } from '@nestjs/common';
import type { ApiConfig } from '@mpfa/config';
import { API_CONFIG } from '../../../config/config.module';
import { UnauthorizedError } from '../../../common/errors/domain-error';
import { ImportMessageService } from '../application/import-message';

@Controller('internal/ingestion')
export class IngestionInternalController {
  constructor(
    private readonly imports: ImportMessageService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post(':id/process')
  replay(@Param('id') id: string, @Headers('x-worker-token') token?: string) {
    if (!this.config.WORKER_TOKEN || token !== this.config.WORKER_TOKEN) {
      throw new UnauthorizedError('WORKER_TOKEN', 'Token do worker ausente ou inválido.');
    }
    return this.imports.replay(id);
  }
}
