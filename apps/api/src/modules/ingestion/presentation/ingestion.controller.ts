import { randomUUID } from 'node:crypto';
import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import type { ApiConfig } from '@mpfa/config';
import { DEFAULT_JOB_OPTIONS, QUEUES, SYSTEM_JOBS } from '@mpfa/contracts';
import { z } from 'zod';
import { API_CONFIG } from '../../../config/config.module';
import { ValidationError } from '../../../common/errors/domain-error';
import { SessionGuard, type RequestWithActor } from '../../iam/presentation/session.guard';
import { ImportMessageService } from '../application/import-message';

const bodySchema = z.object({
  filename: z.string().min(1),
  content_base64: z.string().min(1),
});

@ApiTags('ingestion')
@Controller('ingestion')
@UseGuards(SessionGuard)
export class IngestionController {
  constructor(
    private readonly imports: ImportMessageService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post('messages')
  async importMessage(@Req() req: RequestWithActor, @Body() body: unknown) {
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success || !req.actor) {
      throw new ValidationError('INVALID_BODY', 'Envie filename e content_base64.');
    }
    const bytes = Buffer.from(parsed.data.content_base64, 'base64');
    const result = await this.imports.import(req.actor, { filename: parsed.data.filename, bytes });
    const queued = await this.enqueue(result.batch_id);
    return { ...result, queued };
  }

  private async enqueue(batchId: string): Promise<boolean> {
    const queue = new Queue(QUEUES.system, { connection: { url: this.config.REDIS_URL } });
    try {
      await queue.add(
        SYSTEM_JOBS.ingest,
        { correlation_id: randomUUID(), payload: { batch_id: batchId } },
        { ...DEFAULT_JOB_OPTIONS, jobId: batchId },
      );
      return true;
    } catch {
      return false;
    } finally {
      await queue.close();
    }
  }
}
