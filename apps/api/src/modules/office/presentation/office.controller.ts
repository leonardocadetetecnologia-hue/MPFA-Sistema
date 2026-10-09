import { Body, Controller, Get, Inject, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { ApiConfig } from '@mpfa/config';
import { z } from 'zod';
import { ValidationError } from '../../../common/errors/domain-error';
import { API_CONFIG } from '../../../config/config.module';
import { assertCan } from '../../iam/domain/access';
import { UnconfiguredMicrosoft365 } from '../../integrations/microsoft365';
import { SessionGuard, type RequestWithActor } from '../../iam/presentation/session.guard';
import { OfficeService } from '../application/office.service';

@ApiTags('office')
@Controller()
@UseGuards(SessionGuard)
export class OfficeController {
  constructor(
    private readonly office: OfficeService,
    @Inject(API_CONFIG) private readonly config: ApiConfig,
  ) {}

  @Post('clients')
  createClient(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(
      z.object({ name: z.string().min(1), external_id: z.string().nullable().optional() }),
      body,
    );
    return this.office.createClient(required(req), {
      name: input.name,
      externalId: input.external_id,
    });
  }

  @Post('teams')
  createTeam(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(z.object({ name: z.string().min(1) }), body);
    return this.office.createTeam(required(req), input.name);
  }

  @Post('processes')
  createProcess(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(
      z.object({
        title: z.string().min(1),
        cnj: z.string().nullable().optional(),
        client_id: z.string().uuid().nullable().optional(),
        kind: z.string().min(1),
      }),
      body,
    );
    return this.office.createProcess(required(req), {
      title: input.title,
      cnj: input.cnj,
      clientId: input.client_id,
      kind: input.kind,
    });
  }

  @Get('processes')
  search(@Req() req: RequestWithActor, @Query('q') q?: string, @Query('page') page?: string) {
    return this.office.searchProcesses(required(req), { q, page: page ? Number(page) : 1 });
  }

  @Get('clients')
  clients(@Req() req: RequestWithActor, @Query('q') q?: string, @Query('page') page?: string) {
    return this.office.listClients(required(req), { q, page: page ? Number(page) : 1 });
  }

  @Get('publications')
  publications(
    @Req() req: RequestWithActor,
    @Query('q') q?: string,
    @Query('link') link?: string,
    @Query('page') page?: string,
  ) {
    const parsed = z
      .enum(['PENDING', 'CONFIRMED', 'REJECTED'])
      .optional()
      .safeParse(link || undefined);
    if (!parsed.success)
      throw new ValidationError('INVALID_LINK', 'Situação de vínculo desconhecida.');
    return this.office.listPublications(required(req), {
      q,
      link: parsed.data,
      page: page ? Number(page) : 1,
    });
  }

  @Post('routing-rules')
  createRule(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(
      z.object({
        name: z.string().min(1),
        process_id: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable().optional(),
        portfolio_id: z.string().uuid().nullable().optional(),
        team_id: z.string().uuid().nullable().optional(),
        assignee_id: z.string().uuid().nullable().optional(),
        priority: z.number().int().optional(),
        starts_on: z.string().nullable().optional(),
        ends_on: z.string().nullable().optional(),
      }),
      body,
    );
    return this.office.createRoutingRule(required(req), {
      name: input.name,
      processId: input.process_id,
      clientId: input.client_id,
      portfolioId: input.portfolio_id,
      teamId: input.team_id,
      assigneeId: input.assignee_id,
      priority: input.priority,
      startsOn: input.starts_on,
      endsOn: input.ends_on,
    });
  }

  @Get('publications/:id')
  publication(@Req() req: RequestWithActor, @Param('id') id: string) {
    return this.office.getPublication(required(req), id);
  }

  @Post('publications/:id/link')
  link(@Req() req: RequestWithActor, @Param('id') id: string, @Body() body: unknown) {
    const input = parse(z.object({ process_id: z.string().uuid() }), body);
    return this.office.confirmLink(required(req), id, input.process_id);
  }

  @Post('publications/:id/comments')
  comment(@Req() req: RequestWithActor, @Param('id') id: string, @Body() body: unknown) {
    const input = parse(z.object({ body: z.string().min(1) }), body);
    return this.office.comment(required(req), id, input.body);
  }

  @Post('publications/:id/publish')
  publish(@Req() req: RequestWithActor, @Param('id') id: string, @Body() body: unknown) {
    const input = parse(z.object({ client_id: z.string().uuid() }), body);
    return this.office.publishToClient(required(req), id, input.client_id);
  }

  @Post('tasks')
  createTask(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(
      z.object({
        title: z.string().min(1),
        occurrence_id: z.string().uuid().nullable().optional(),
        process_id: z.string().uuid().nullable().optional(),
        assignee_id: z.string().uuid().nullable().optional(),
        parent_id: z.string().uuid().nullable().optional(),
        priority: z.number().int().optional(),
        due_on: z.string().nullable().optional(),
        checklist: z.array(z.string()).optional(),
      }),
      body,
    );
    return this.office.createTask(required(req), {
      title: input.title,
      occurrenceId: input.occurrence_id,
      processId: input.process_id,
      assigneeId: input.assignee_id,
      parentId: input.parent_id,
      priority: input.priority,
      dueOn: input.due_on,
      checklist: input.checklist,
    });
  }

  @Get('tasks')
  tasks(
    @Req() req: RequestWithActor,
    @Query('assignee_id') assigneeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.office.listTasks(required(req), { assigneeId, from, to });
  }

  @Post('actions')
  createAction(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(
      z.object({
        title: z.string().min(1),
        task_id: z.string().uuid().nullable().optional(),
        occurrence_id: z.string().uuid().nullable().optional(),
        process_id: z.string().uuid().nullable().optional(),
      }),
      body,
    );
    return this.office.createAction(required(req), {
      title: input.title,
      taskId: input.task_id,
      occurrenceId: input.occurrence_id,
      processId: input.process_id,
    });
  }

  @Post('time-entries')
  manual(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(
      z.object({
        entry_date: z.string(),
        worked_minutes: z.number().int(),
        billable_minutes: z.number().int(),
        description: z.string().min(1),
        classification: z.string().min(1),
        action_id: z.string().uuid().nullable().optional(),
        task_id: z.string().uuid().nullable().optional(),
        process_id: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable().optional(),
        started_at: z.string().nullable().optional(),
        ended_at: z.string().nullable().optional(),
      }),
      body,
    );
    return this.office.manualTime(required(req), {
      entryDate: input.entry_date,
      workedMinutes: input.worked_minutes,
      billableMinutes: input.billable_minutes,
      description: input.description,
      classification: input.classification,
      actionId: input.action_id,
      taskId: input.task_id,
      processId: input.process_id,
      clientId: input.client_id,
      startedAt: input.started_at,
      endedAt: input.ended_at,
    });
  }

  @Get('time-entries')
  timeEntries(@Req() req: RequestWithActor) {
    return this.office.listTime(required(req));
  }

  @Get('time-entries/timer')
  timer(@Req() req: RequestWithActor) {
    return this.office.currentTimer(required(req));
  }

  @Post('time-entries/timer/start')
  start(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(
      z.object({
        description: z.string().optional(),
        classification: z.string().optional(),
        action_id: z.string().uuid().nullable().optional(),
        task_id: z.string().uuid().nullable().optional(),
        process_id: z.string().uuid().nullable().optional(),
        client_id: z.string().uuid().nullable().optional(),
      }),
      body,
    );
    return this.office.startTimer(required(req), {
      description: input.description,
      classification: input.classification,
      actionId: input.action_id,
      taskId: input.task_id,
      processId: input.process_id,
      clientId: input.client_id,
    });
  }

  @Post('time-entries/timer/pause')
  pause(@Req() req: RequestWithActor) {
    return this.office.pauseTimer(required(req));
  }

  @Post('time-entries/timer/resume')
  resume(@Req() req: RequestWithActor) {
    return this.office.resumeTimer(required(req));
  }

  @Post('time-entries/timer/stop')
  stop(@Req() req: RequestWithActor) {
    return this.office.stopTimer(required(req));
  }

  @Post('time-entries/:id/submit')
  submit(@Req() req: RequestWithActor, @Param('id') id: string) {
    return this.office.transitionTime(required(req), id, 'submit');
  }

  @Post('time-entries/:id/return')
  ret(@Req() req: RequestWithActor, @Param('id') id: string, @Body() body: unknown) {
    const input = parse(z.object({ reason: z.string().min(1) }), body);
    return this.office.transitionTime(required(req), id, 'return', input.reason);
  }

  @Post('time-entries/:id/approve')
  approve(@Req() req: RequestWithActor, @Param('id') id: string) {
    return this.office.transitionTime(required(req), id, 'approve');
  }

  @Post('periods/close')
  close(@Req() req: RequestWithActor, @Body() body: unknown) {
    const input = parse(z.object({ starts_on: z.string(), ends_on: z.string() }), body);
    return this.office.closePeriod(required(req), {
      startsOn: input.starts_on,
      endsOn: input.ends_on,
    });
  }

  @Post('periods/:id/reopen')
  reopen(@Req() req: RequestWithActor, @Param('id') id: string) {
    return this.office.reopenPeriod(required(req), id);
  }

  @Get('dashboards/:kind')
  dashboard(@Req() req: RequestWithActor, @Param('kind') kind: string) {
    if (kind !== 'individual' && kind !== 'administrative' && kind !== 'managerial') {
      throw new ValidationError('INVALID_DASHBOARD', 'Painel desconhecido.');
    }
    return this.office.dashboard(required(req), kind);
  }

  @Get('portal/publications')
  portal(@Req() req: RequestWithActor) {
    return this.office.portalPublications(required(req));
  }

  @Get('integrations/microsoft365')
  microsoft(@Req() req: RequestWithActor) {
    const actor = required(req);
    assertCan(actor, 'integration.read');
    const port = new UnconfiguredMicrosoft365({
      tenantId: this.config.MICROSOFT_TENANT_ID,
      clientId: this.config.MICROSOFT_CLIENT_ID,
      clientSecret: this.config.MICROSOFT_CLIENT_SECRET,
      mailbox: this.config.MICROSOFT_MAILBOX,
    });
    return port.status();
  }
}

function required(req: RequestWithActor) {
  if (!req.actor) throw new ValidationError('AUTH_REQUIRED', 'Autenticação necessária.');
  return req.actor;
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError(
      'INVALID_BODY',
      'Corpo da requisição inválido.',
      result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    );
  }
  return result.data;
}
