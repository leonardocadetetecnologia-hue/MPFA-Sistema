import type { Prisma, PrismaClient } from '@mpfa/database';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../../../common/errors/domain-error';
import { toPortalView, portalPublicationWhere } from '../../client-portal/domain/portal-scope';
import { DASHBOARD_FORMULAS } from '../../dashboards/domain/formulas';
import { assertCan, type Actor } from '../../iam/domain/access';
import {
  elapsedSeconds,
  intervalsOverlap,
  minutesFromSeconds,
  periodIsClosed,
} from '../../time-entries/domain/hours';

export class OfficeService {
  constructor(private readonly prisma: PrismaClient) {}

  async createClient(actor: Actor, input: { name: string; externalId?: string | null }) {
    assertCan(actor, 'client.manage');
    return this.prisma.client.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        externalId: input.externalId ?? null,
      },
      select: { id: true, name: true },
    });
  }

  async createTeam(actor: Actor, name: string) {
    assertCan(actor, 'client.manage');
    return this.prisma.team.create({
      data: { organizationId: actor.organizationId, name },
      select: { id: true, name: true },
    });
  }

  async createProcess(
    actor: Actor,
    input: { title: string; cnj?: string | null; clientId?: string | null; kind: string },
  ) {
    assertCan(actor, 'process.manage');
    return this.prisma.legalProcess.create({
      data: {
        organizationId: actor.organizationId,
        title: input.title,
        cnj: input.cnj ?? null,
        clientId: input.clientId ?? null,
        kind: input.kind,
        suggested: false,
        status: 'OPEN',
      },
      select: { id: true, cnj: true, title: true, suggested: true },
    });
  }

  async searchProcesses(actor: Actor, query: { q?: string; page?: number }) {
    assertCan(actor, 'publication.read');
    const page = Math.max(1, query.page ?? 1);
    const take = 20;
    const where = {
      organizationId: actor.organizationId,
      deletedAt: null,
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' as const } },
              { cnj: { contains: query.q } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.legalProcess.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * take,
        take,
        select: { id: true, cnj: true, title: true, status: true, suggested: true, clientId: true },
      }),
      this.prisma.legalProcess.count({ where }),
    ]);
    return { page, page_size: take, total, items };
  }

  async createRoutingRule(
    actor: Actor,
    input: {
      name: string;
      processId?: string | null;
      clientId?: string | null;
      portfolioId?: string | null;
      teamId?: string | null;
      assigneeId?: string | null;
      priority?: number;
      startsOn?: string | null;
      endsOn?: string | null;
    },
  ) {
    assertCan(actor, 'process.manage');
    return this.prisma.routingRule.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        processId: input.processId ?? null,
        clientId: input.clientId ?? null,
        portfolioId: input.portfolioId ?? null,
        teamId: input.teamId ?? null,
        assigneeId: input.assigneeId ?? null,
        priority: input.priority ?? 100,
        startsOn: input.startsOn ? new Date(input.startsOn) : null,
        endsOn: input.endsOn ? new Date(input.endsOn) : null,
      },
      select: { id: true, name: true },
    });
  }

  async getPublication(actor: Actor, id: string) {
    assertCan(actor, 'publication.read');
    const row = await this.prisma.publicationOccurrence.findFirst({
      where: { id, organizationId: actor.organizationId },
      include: {
        link: true,
        decision: true,
        comments: { where: { internal: true }, select: { id: true, body: true, createdAt: true } },
        batch: { select: { id: true, subject: true, message: { select: { html: true } } } },
      },
    });
    if (!row) throw new NotFoundError('NOT_FOUND', 'Publicação não encontrada.');
    return row;
  }

  async confirmLink(actor: Actor, occurrenceId: string, processId: string) {
    assertCan(actor, 'publication.treat');
    await this.requireOccurrence(actor, occurrenceId);
    const process = await this.prisma.legalProcess.findFirst({
      where: { id: processId, organizationId: actor.organizationId, deletedAt: null },
    });
    if (!process) throw new NotFoundError('NOT_FOUND', 'Processo não encontrado.');
    await this.prisma.publicationLink.upsert({
      where: { occurrenceId },
      create: { occurrenceId, processId, status: 'CONFIRMED', decidedBy: actor.userId },
      update: { processId, status: 'CONFIRMED', decidedBy: actor.userId },
    });
    await this.audit(actor, 'PUBLICATION_LINKED', 'publication_occurrence', occurrenceId, {
      processId,
    });
    return { occurrence_id: occurrenceId, process_id: processId, status: 'CONFIRMED' };
  }

  async comment(actor: Actor, occurrenceId: string, body: string) {
    assertCan(actor, 'publication.treat');
    await this.requireOccurrence(actor, occurrenceId);
    const created = await this.prisma.comment.create({
      data: {
        organizationId: actor.organizationId,
        occurrenceId,
        authorId: actor.userId,
        body,
        internal: true,
      },
      select: { id: true },
    });
    return created;
  }

  async createTask(
    actor: Actor,
    input: {
      title: string;
      occurrenceId?: string | null;
      processId?: string | null;
      assigneeId?: string | null;
      parentId?: string | null;
      priority?: number;
      dueOn?: string | null;
      checklist?: string[];
    },
  ) {
    assertCan(actor, 'task.manage');
    if (!input.dueOn && /prazo legal/i.test(input.title)) {
      throw new ValidationError(
        'DEADLINE_NOT_IN_TEXT',
        'Prazo legal não vira data sem uma data no texto.',
      );
    }
    const task = await this.prisma.workTask.create({
      data: {
        organizationId: actor.organizationId,
        title: input.title,
        occurrenceId: input.occurrenceId ?? null,
        processId: input.processId ?? null,
        assigneeId: input.assigneeId ?? actor.userId,
        parentId: input.parentId ?? null,
        priority: input.priority ?? 3,
        dueOn: input.dueOn ? new Date(input.dueOn) : null,
        checks: input.checklist
          ? { create: input.checklist.map((label) => ({ label })) }
          : undefined,
      },
      select: { id: true, title: true, status: true },
    });
    return task;
  }

  async listTasks(actor: Actor, query: { assigneeId?: string; from?: string; to?: string }) {
    assertCan(actor, 'task.manage');
    const items = await this.prisma.workTask.findMany({
      where: {
        organizationId: actor.organizationId,
        ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
        ...(query.from || query.to
          ? {
              dueOn: {
                gte: query.from ? new Date(query.from) : undefined,
                lte: query.to ? new Date(query.to) : undefined,
              },
            }
          : {}),
      },
      orderBy: [{ dueOn: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueOn: true,
        assigneeId: true,
        processId: true,
      },
    });
    const calendar: Record<string, typeof items> = {};
    for (const item of items) {
      const key = item.dueOn ? item.dueOn.toISOString().slice(0, 10) : 'sem-data';
      calendar[key] = [...(calendar[key] ?? []), item];
    }
    return { list: items, calendar };
  }

  async createAction(
    actor: Actor,
    input: {
      title: string;
      taskId?: string | null;
      occurrenceId?: string | null;
      processId?: string | null;
    },
  ) {
    assertCan(actor, 'task.manage');
    return this.prisma.workAction.create({
      data: {
        organizationId: actor.organizationId,
        title: input.title,
        taskId: input.taskId ?? null,
        occurrenceId: input.occurrenceId ?? null,
        processId: input.processId ?? null,
        assigneeId: actor.userId,
      },
      select: { id: true, title: true, status: true },
    });
  }

  async manualTime(
    actor: Actor,
    input: {
      entryDate: string;
      workedMinutes: number;
      billableMinutes: number;
      description: string;
      classification: string;
      actionId?: string | null;
      taskId?: string | null;
      processId?: string | null;
      clientId?: string | null;
      startedAt?: string | null;
      endedAt?: string | null;
    },
  ) {
    assertCan(actor, 'time.entry');
    if (input.workedMinutes < 0 || input.billableMinutes < 0) {
      throw new ValidationError('NEGATIVE_MINUTES', 'Minutos não podem ser negativos.');
    }
    const entryDate = new Date(`${input.entryDate}T00:00:00.000Z`);
    await this.assertPeriodOpen(actor, entryDate);
    const startedAt = input.startedAt ? new Date(input.startedAt) : null;
    const endedAt = input.endedAt ? new Date(input.endedAt) : null;
    const overlap = await this.hasOverlap(actor, startedAt, endedAt, null);
    const created = await this.prisma.timeEntry.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        entryDate,
        workedMinutes: input.workedMinutes,
        billableMinutes: input.billableMinutes,
        description: input.description,
        classification: input.classification,
        actionId: input.actionId ?? null,
        taskId: input.taskId ?? null,
        processId: input.processId ?? null,
        clientId: input.clientId ?? null,
        startedAt,
        endedAt,
        overlapWarning: overlap,
        events: {
          create: { action: 'CREATED', actorId: actor.userId, after: { status: 'DRAFT' } },
        },
      },
      select: {
        id: true,
        status: true,
        overlapWarning: true,
        workedMinutes: true,
        billableMinutes: true,
      },
    });
    await this.audit(actor, 'TIME_ENTRY_CREATED', 'time_entry', created.id, { overlap });
    return created;
  }

  async startTimer(
    actor: Actor,
    input: {
      description?: string;
      classification?: string;
      actionId?: string | null;
      taskId?: string | null;
      processId?: string | null;
      clientId?: string | null;
    },
  ) {
    assertCan(actor, 'time.entry');
    const existing = await this.prisma.activeTimer.findUnique({ where: { userId: actor.userId } });
    if (existing)
      throw new ConflictError(
        'TIMER_ALREADY_RUNNING',
        'Já existe um cronômetro para este usuário.',
      );
    return this.prisma.activeTimer.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        status: 'RUNNING',
        startedAt: new Date(),
        description: input.description ?? '',
        classification: input.classification ?? 'atividade',
        actionId: input.actionId ?? null,
        taskId: input.taskId ?? null,
        processId: input.processId ?? null,
        clientId: input.clientId ?? null,
      },
    });
  }

  async pauseTimer(actor: Actor) {
    assertCan(actor, 'time.entry');
    const timer = await this.requireTimer(actor);
    if (timer.status !== 'RUNNING') return timer;
    const now = new Date();
    const accumulated = elapsedSeconds({ ...timer, now });
    return this.prisma.activeTimer.update({
      where: { id: timer.id },
      data: { status: 'PAUSED', accumulatedSeconds: accumulated, pausedAt: now, startedAt: now },
    });
  }

  async resumeTimer(actor: Actor) {
    assertCan(actor, 'time.entry');
    const timer = await this.requireTimer(actor);
    return this.prisma.activeTimer.update({
      where: { id: timer.id },
      data: { status: 'RUNNING', startedAt: new Date(), pausedAt: null },
    });
  }

  async stopTimer(actor: Actor) {
    assertCan(actor, 'time.entry');
    const timer = await this.requireTimer(actor);
    const now = new Date();
    const seconds = elapsedSeconds({ ...timer, now });
    const worked = minutesFromSeconds(seconds);
    if (worked <= 0) throw new ValidationError('EMPTY_TIMER', 'O cronômetro não registrou tempo.');
    const startedAt = new Date(now.getTime() - seconds * 1000);
    const overlap = await this.hasOverlap(actor, startedAt, now, null);
    const entryDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    await this.assertPeriodOpen(actor, entryDate);
    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.timeEntry.create({
        data: {
          organizationId: actor.organizationId,
          userId: actor.userId,
          entryDate,
          workedMinutes: worked,
          billableMinutes: worked,
          description: timer.description,
          classification: timer.classification,
          actionId: timer.actionId,
          taskId: timer.taskId,
          processId: timer.processId,
          clientId: timer.clientId,
          startedAt,
          endedAt: now,
          overlapWarning: overlap,
          events: {
            create: { action: 'CREATED_FROM_TIMER', actorId: actor.userId, after: { worked } },
          },
        },
        select: { id: true, workedMinutes: true, overlapWarning: true, status: true },
      });
      await tx.activeTimer.delete({ where: { id: timer.id } });
      return created;
    });
    return entry;
  }

  async currentTimer(actor: Actor) {
    assertCan(actor, 'time.entry');
    const timer = await this.prisma.activeTimer.findUnique({ where: { userId: actor.userId } });
    if (!timer) return null;
    return {
      ...timer,
      elapsed_seconds: elapsedSeconds({ ...timer, now: new Date() }),
    };
  }

  async transitionTime(
    actor: Actor,
    id: string,
    action: 'submit' | 'return' | 'approve',
    reason?: string,
  ) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!entry) throw new NotFoundError('NOT_FOUND', 'Lançamento não encontrado.');
    if (action === 'submit') {
      assertCan(actor, 'time.entry');
      if (entry.userId !== actor.userId)
        throw new ForbiddenError('FORBIDDEN', 'Só o autor envia o lançamento.');
      return this.updateEntry(
        entry.id,
        entry.version,
        { status: 'SUBMITTED', submittedAt: new Date() },
        actor,
        'SUBMITTED',
      );
    }
    assertCan(actor, 'time.review');
    if (action === 'return') {
      if (!reason) throw new ValidationError('REASON_REQUIRED', 'Devolução exige motivo.');
      return this.updateEntry(
        entry.id,
        entry.version,
        { status: 'RETURNED', returnReason: reason },
        actor,
        'RETURNED',
      );
    }
    return this.updateEntry(
      entry.id,
      entry.version,
      { status: 'APPROVED', approvedAt: new Date(), approvedById: actor.userId },
      actor,
      'APPROVED',
    );
  }

  async closePeriod(actor: Actor, input: { startsOn: string; endsOn: string }) {
    assertCan(actor, 'time.review');
    return this.prisma.periodClosure.create({
      data: {
        organizationId: actor.organizationId,
        startsOn: new Date(input.startsOn),
        endsOn: new Date(input.endsOn),
        closedBy: actor.userId,
      },
      select: { id: true },
    });
  }

  async reopenPeriod(actor: Actor, id: string) {
    assertCan(actor, 'time.review');
    const updated = await this.prisma.periodClosure.updateMany({
      where: { id, organizationId: actor.organizationId, reopenedAt: null },
      data: { reopenedAt: new Date(), reopenedBy: actor.userId },
    });
    if (updated.count === 0) throw new NotFoundError('NOT_FOUND', 'Fechamento não encontrado.');
    return { id, reopened: true };
  }

  async dashboard(actor: Actor, kind: 'individual' | 'administrative' | 'managerial') {
    const permission =
      kind === 'individual'
        ? 'dashboard.individual'
        : kind === 'administrative'
          ? 'dashboard.administrative'
          : 'dashboard.managerial';
    assertCan(actor, permission);
    const organizationId = actor.organizationId;
    const userFilter = kind === 'individual' ? { userId: actor.userId } : {};
    const assigneeFilter = kind === 'individual' ? { assigneeId: actor.userId } : {};
    const [publications, pendingLinks, openTasks, overdue, failures, hours] = await Promise.all([
      this.prisma.publicationOccurrence.count({ where: { organizationId } }),
      this.prisma.publicationLink.count({
        where: { status: 'PENDING', occurrence: { organizationId } },
      }),
      this.prisma.workTask.count({
        where: { organizationId, status: { in: ['OPEN', 'IN_PROGRESS'] }, ...assigneeFilter },
      }),
      this.prisma.workTask.count({
        where: {
          organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueOn: { lt: new Date() },
          ...assigneeFilter,
        },
      }),
      this.prisma.ingestionBatch.count({ where: { organizationId, status: 'FAILED' } }),
      this.prisma.timeEntry.aggregate({
        where: { organizationId, ...userFilter },
        _sum: { workedMinutes: true, billableMinutes: true },
      }),
    ]);
    const approved = await this.prisma.timeEntry.aggregate({
      where: { organizationId, status: 'APPROVED', ...userFilter },
      _sum: { workedMinutes: true },
    });
    return {
      kind,
      formulas: DASHBOARD_FORMULAS,
      records: {
        publications_received: '/api/v1/publications',
        pending_links: '/api/v1/publications?link=PENDING',
        open_tasks: '/api/v1/tasks',
        hours: '/api/v1/time-entries',
      },
      values: {
        publications_received: publications,
        pending_links: pendingLinks,
        open_tasks: openTasks,
        overdue_tasks: overdue,
        ingestion_failures: failures,
        hours_worked: hours._sum.workedMinutes ?? 0,
        hours_billable: hours._sum.billableMinutes ?? 0,
        hours_approved: approved._sum.workedMinutes ?? 0,
      },
    };
  }

  async portalPublications(actor: Actor) {
    const scope = portalPublicationWhere(actor);
    const rows = await this.prisma.publicationRelease.findMany({
      where: { clientId: scope.clientId, occurrence: { organizationId: scope.organizationId } },
      include: {
        occurrence: {
          select: {
            id: true,
            cnjFormatted: true,
            actType: true,
            publicationDate: true,
            text: true,
          },
        },
      },
    });
    return rows.map((row) => toPortalView(row.occurrence));
  }

  async publishToClient(actor: Actor, occurrenceId: string, clientId: string) {
    assertCan(actor, 'publication.publish');
    await this.requireOccurrence(actor, occurrenceId);
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, organizationId: actor.organizationId, deletedAt: null },
    });
    if (!client) throw new NotFoundError('NOT_FOUND', 'Cliente não encontrado.');
    await this.prisma.publicationRelease.upsert({
      where: { occurrenceId_clientId: { occurrenceId, clientId } },
      create: { occurrenceId, clientId, publishedBy: actor.userId },
      update: {},
    });
    await this.audit(actor, 'PUBLICATION_PUBLISHED', 'publication_occurrence', occurrenceId, {
      clientId,
    });
    return { occurrence_id: occurrenceId, client_id: clientId };
  }

  private async requireOccurrence(actor: Actor, id: string) {
    const row = await this.prisma.publicationOccurrence.findFirst({
      where: { id, organizationId: actor.organizationId },
    });
    if (!row) throw new NotFoundError('NOT_FOUND', 'Publicação não encontrada.');
    return row;
  }

  private async requireTimer(actor: Actor) {
    const timer = await this.prisma.activeTimer.findUnique({ where: { userId: actor.userId } });
    if (!timer || timer.organizationId !== actor.organizationId) {
      throw new NotFoundError('NOT_FOUND', 'Nenhum cronômetro ativo.');
    }
    return timer;
  }

  private async assertPeriodOpen(actor: Actor, entryDate: Date) {
    const closures = await this.prisma.periodClosure.findMany({
      where: { organizationId: actor.organizationId },
    });
    if (periodIsClosed(closures, entryDate)) {
      throw new ForbiddenError('PERIOD_CLOSED', 'O período está fechado.');
    }
  }

  private async hasOverlap(
    actor: Actor,
    startedAt: Date | null,
    endedAt: Date | null,
    ignoreId: string | null,
  ) {
    if (!startedAt || !endedAt) return false;
    const rows = await this.prisma.timeEntry.findMany({
      where: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        startedAt: { not: null },
        endedAt: { not: null },
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { startedAt: true, endedAt: true },
    });
    return rows.some(
      (row) =>
        row.startedAt &&
        row.endedAt &&
        intervalsOverlap(
          { startedAt, endedAt },
          { startedAt: row.startedAt, endedAt: row.endedAt },
        ),
    );
  }

  private async updateEntry(
    id: string,
    version: number,
    data: Prisma.TimeEntryUncheckedUpdateManyInput,
    actor: Actor,
    action: string,
  ) {
    const updated = await this.prisma.timeEntry.updateMany({
      where: { id, version },
      data: { ...data, version: { increment: 1 } },
    });
    if (updated.count === 0)
      throw new ConflictError('VERSION_CONFLICT', 'O lançamento foi alterado por outra pessoa.');
    await this.prisma.timeEntryEvent.create({
      data: { entryId: id, action, actorId: actor.userId, after: { action } },
    });
    await this.audit(actor, 'TIME_ENTRY_UPDATED', 'time_entry', id, { action });
    return { id, status: action };
  }

  private async audit(
    actor: Actor,
    action: string,
    resourceType: string,
    resourceId: string,
    afterData: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditEvent.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        action,
        resourceType,
        resourceId,
        afterData,
      },
    });
  }
}
