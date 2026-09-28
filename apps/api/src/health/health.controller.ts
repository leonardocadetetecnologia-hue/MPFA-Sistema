import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import type { HealthResponse } from '@mpfa/contracts';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness: the process is running' })
  @ApiResponse({ status: 200, description: 'Process alive' })
  live(): HealthResponse {
    return this.health.liveness();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness: PostgreSQL and Redis reachable' })
  @ApiResponse({ status: 200, description: 'All critical dependencies up' })
  @ApiResponse({ status: 503, description: 'At least one critical dependency down' })
  async ready(@Res({ passthrough: true }) res: Response): Promise<HealthResponse> {
    const result = await this.health.readiness();
    res.status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return result;
  }
}
