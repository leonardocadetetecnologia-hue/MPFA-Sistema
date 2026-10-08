import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Prisma, PrismaClient } from '@mpfa/database';
import { NotFoundError, ValidationError } from '../../../common/errors/domain-error';
import type { Actor } from '../../iam/domain/access';
import { assertCan } from '../../iam/domain/access';
import {
  occurrenceIdentity,
  parseEmailEnvelope,
  parseWebjurEmail,
  planImport,
  WEBJUR_EMAIL_PARSER_VERSION,
  type EmailEnvelope,
  type ParsedOccurrence,
  type ParsedWebjurEmail,
} from '../domain/webjur-email-v1';
import { readEml } from '../infrastructure/read-eml';
import { readOutlookMessage } from '../infrastructure/read-outlook-message';
import { storeOriginal } from '../infrastructure/local-storage';

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

export interface ImportInput {
  filename: string;
  bytes: Buffer;
}

export interface ImportResult {
  batch_id: string;
  status: string;
  created: boolean;
  occurrence_count: number;
  distinct_cases: number;
  revision_count: number;
  ambiguous: boolean;
  issues: string[];
}

type Tx = Prisma.TransactionClient;

export class ImportMessageService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storageDir: string,
  ) {}

  async import(actor: Actor, input: ImportInput): Promise<ImportResult> {
    assertCan(actor, 'ingestion.import');
    const filename = input.filename.toLowerCase();
    const kind = filename.endsWith('.msg')
      ? 'MSG'
      : filename.endsWith('.eml')
        ? 'EML'
        : filename.endsWith('.pdf')
          ? 'PDF'
          : null;
    if (!kind) {
      throw new ValidationError('UNSUPPORTED_FILE', 'Envie um arquivo .msg, .eml ou .pdf.');
    }
    const contentHash = createHash('sha256').update(input.bytes).digest('hex');
    const extension = kind === 'MSG' ? '.msg' : kind === 'EML' ? '.eml' : '.pdf';
    const storagePath = await storeOriginal(
      this.storageDir,
      actor.organizationId,
      contentHash,
      extension,
      input.bytes,
    );

    if (kind === 'PDF') {
      return this.storePdf(actor, contentHash, storagePath);
    }

    const message = kind === 'MSG' ? readOutlookMessage(input.bytes) : readEml(input.bytes);
    const html = message.html;
    const envelope = message.envelope;
    const headers = message.headers;
    const parsed = parseWebjurEmail(html);
    return this.persist(actor, {
      contentHash,
      storagePath,
      kind,
      envelope,
      headers,
      html,
      parsed,
    });
  }

  async replay(batchId: string): Promise<ImportResult> {
    const batch = await this.prisma.ingestionBatch.findUnique({ where: { id: batchId } });
    if (!batch?.createdBy) throw new NotFoundError('NOT_FOUND', 'Lote não encontrado.');
    const user = await this.prisma.user.findUnique({ where: { id: batch.createdBy } });
    if (!user) throw new NotFoundError('NOT_FOUND', 'Autor do lote não encontrado.');
    const bytes = await readFile(path.join(this.storageDir, batch.storagePath));
    const filename =
      batch.sourceKind === 'MSG'
        ? 'replay.msg'
        : batch.sourceKind === 'EML'
          ? 'replay.eml'
          : 'replay.pdf';
    return this.import(
      {
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        clientId: user.clientId,
        email: user.email,
        status: user.status,
      },
      { filename, bytes },
    );
  }

  private async storePdf(
    actor: Actor,
    contentHash: string,
    storagePath: string,
  ): Promise<ImportResult> {
    const existing = await this.prisma.ingestionBatch.findFirst({
      where: { organizationId: actor.organizationId, contentHash },
    });
    if (existing) {
      return this.toResult(existing.id, existing.status, false, 0, 0, 0, false, existing.issues);
    }
    const batch = await this.prisma.ingestionBatch.create({
      data: {
        organizationId: actor.organizationId,
        status: 'COMPLETED_WITH_PENDINGS',
        sourceKind: 'PDF',
        contentHash,
        parserVersion: 'PDF_PRINT_V1',
        issues: ['pdf_without_html_comments'],
        storagePath,
        createdBy: actor.userId,
        finishedAt: new Date(),
        message: { create: { headers: '', html: '' } },
      },
    });
    await this.audit(actor, 'INGESTION_IMPORTED', 'ingestion_batch', batch.id, {
      source: 'PDF',
      limitation: 'pdf_without_html_comments',
    });
    return this.toResult(batch.id, batch.status, true, 0, 0, 0, false, batch.issues);
  }

  private async persist(
    actor: Actor,
    input: {
      contentHash: string;
      storagePath: string;
      kind: 'MSG' | 'EML';
      envelope: EmailEnvelope;
      headers: string;
      html: string;
      parsed: ParsedWebjurEmail;
    },
  ): Promise<ImportResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = input.envelope.seqEmail
        ? await tx.ingestionBatch.findUnique({
            where: {
              organizationId_seqEmail: {
                organizationId: actor.organizationId,
                seqEmail: input.envelope.seqEmail,
              },
            },
          })
        : await tx.ingestionBatch.findFirst({
            where: { organizationId: actor.organizationId, contentHash: input.contentHash },
          });
      const plan = planImport(
        existing
          ? { id: existing.id, status: existing.status, contentHash: existing.contentHash }
          : null,
        input.contentHash,
      );
      if (plan.action === 'return_existing') {
        const counts = await this.counts(tx, plan.batchId);
        return this.toResult(
          plan.batchId,
          existing?.status ?? 'COMPLETED',
          false,
          counts.occurrences,
          counts.cases,
          counts.revisions,
          counts.ambiguous,
          existing?.issues ?? [],
        );
      }

      const issues = input.parsed.issues;
      const batch =
        plan.action === 'create'
          ? await tx.ingestionBatch.create({
              data: {
                organizationId: actor.organizationId,
                status: 'PROCESSING',
                sourceKind: input.kind,
                contentHash: input.contentHash,
                seqEmail: input.envelope.seqEmail,
                messageId: input.envelope.messageId,
                subject: input.envelope.subject,
                fromAddress: input.envelope.from,
                parserVersion: WEBJUR_EMAIL_PARSER_VERSION,
                declaredCount: input.parsed.declaredCount,
                issues,
                storagePath: input.storagePath,
                createdBy: actor.userId,
              },
            })
          : await tx.ingestionBatch.update({
              where: { id: plan.batchId },
              data: {
                status: 'PROCESSING',
                contentHash: input.contentHash,
                messageId: input.envelope.messageId,
                subject: input.envelope.subject,
                fromAddress: input.envelope.from,
                parserVersion: WEBJUR_EMAIL_PARSER_VERSION,
                declaredCount: input.parsed.declaredCount,
                issues,
                storagePath: input.storagePath,
              },
            });

      await tx.ingestedMessage.upsert({
        where: { batchId: batch.id },
        create: { batchId: batch.id, headers: input.headers, html: input.html },
        update: { headers: input.headers, html: input.html },
      });
      await tx.searchTerm.deleteMany({ where: { batchId: batch.id } });
      if (input.parsed.searchTerms.length > 0) {
        await tx.searchTerm.createMany({
          data: input.parsed.searchTerms.map((expression) => ({ batchId: batch.id, expression })),
        });
      }

      for (const occurrence of input.parsed.occurrences) {
        await this.upsertOccurrence(
          tx,
          actor,
          batch.id,
          input.envelope.seqEmail,
          input.parsed,
          occurrence,
        );
      }

      const counts = await this.counts(tx, batch.id);
      const status =
        input.parsed.batchState === 'VALID' && !counts.ambiguous && counts.pending === 0
          ? 'COMPLETED'
          : 'COMPLETED_WITH_PENDINGS';
      await tx.ingestionBatch.update({
        where: { id: batch.id },
        data: { status, finishedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: actor.organizationId,
          actorUserId: actor.userId,
          action: plan.action === 'create' ? 'INGESTION_IMPORTED' : 'INGESTION_REPROCESSED',
          resourceType: 'ingestion_batch',
          resourceId: batch.id,
          afterData: { occurrences: counts.occurrences, status },
        },
      });
      return this.toResult(
        batch.id,
        status,
        plan.action === 'create',
        counts.occurrences,
        counts.cases,
        counts.revisions,
        counts.ambiguous,
        issues,
      );
    });
  }

  private async upsertOccurrence(
    tx: Tx,
    actor: Actor,
    batchId: string,
    seqEmail: string | null,
    parsed: ParsedWebjurEmail,
    occurrence: ParsedOccurrence,
  ): Promise<void> {
    const identityKey = occurrenceIdentity({
      seqEmail,
      documentId: occurrence.documentId,
      ordinal: occurrence.ordinal,
    });
    const ambiguous = occurrence.lawyers.some((lawyer) =>
      parsed.ambiguousLawyers.some((group) =>
        group.variants.some(
          (variant) => variant.name === lawyer.name && variant.oab === lawyer.oab,
        ),
      ),
    );
    const saved = await tx.publicationOccurrence.upsert({
      where: { batchId_identityKey: { batchId, identityKey } },
      create: {
        organizationId: actor.organizationId,
        batchId,
        identityKey,
        ordinal: occurrence.ordinal,
        cnjFormatted: occurrence.cnjFormatted,
        cnjDigits: occurrence.cnjDigits,
        availabilityDate: asDate(occurrence.availabilityDate),
        publicationDate: asDate(occurrence.publicationDate),
        processedOn: asDate(parsed.processedOn),
        journal: occurrence.journal,
        notebook: occurrence.notebook,
        location: occurrence.location,
        page: occurrence.page,
        actType: occurrence.actType,
        isRevision: occurrence.isRevision,
        documentId: occurrence.documentId,
        documentUrl: occurrence.documentUrl,
        text: occurrence.text,
        html: occurrence.html,
        state: occurrence.state,
        issues: occurrence.issues,
        parties: asJson(occurrence.parties),
        lawyers: asJson(occurrence.lawyers),
        intimated: occurrence.intimated,
        ambiguous,
      },
      update: {
        text: occurrence.text,
        html: occurrence.html,
        state: occurrence.state,
        issues: occurrence.issues,
        parties: asJson(occurrence.parties),
        lawyers: asJson(occurrence.lawyers),
        intimated: occurrence.intimated,
        ambiguous,
        isRevision: occurrence.isRevision,
        availabilityDate: asDate(occurrence.availabilityDate),
        publicationDate: asDate(occurrence.publicationDate),
        processedOn: asDate(parsed.processedOn),
      },
    });

    const linked = await this.ensureSuggestedProcess(
      tx,
      actor.organizationId,
      occurrence.cnjFormatted,
    );
    await tx.publicationLink.upsert({
      where: { occurrenceId: saved.id },
      create: {
        occurrenceId: saved.id,
        processId: linked,
        status: 'PENDING',
        note: linked
          ? 'Processo sugerido a partir do CNJ. Cliente não foi criado.'
          : 'CNJ ausente.',
      },
      update: {},
    });

    const rule = await this.matchRule(tx, actor.organizationId, linked);
    await tx.routingDecision.upsert({
      where: { occurrenceId: saved.id },
      create: {
        occurrenceId: saved.id,
        ruleId: rule?.id ?? null,
        outcome: ambiguous || !rule ? 'REVIEW' : 'ASSIGNED',
        reason: ambiguous
          ? 'Nome semelhante com OABs distintas. Conferência humana.'
          : rule
            ? `Regra ${rule.name}`
            : 'Nenhuma regra interna vigente.',
        assigneeId: ambiguous ? null : (rule?.assigneeId ?? null),
      },
      update: {},
    });
  }

  private async ensureSuggestedProcess(
    tx: Tx,
    organizationId: string,
    cnj: string | null,
  ): Promise<string | null> {
    if (!cnj) return null;
    const found = await tx.legalProcess.findFirst({
      where: { organizationId, cnj, deletedAt: null },
    });
    if (found) return found.id;
    const created = await tx.legalProcess.create({
      data: {
        organizationId,
        cnj,
        title: cnj,
        kind: 'JUDICIAL',
        status: 'SUGGESTED',
        suggested: true,
      },
    });
    return created.id;
  }

  private async matchRule(tx: Tx, organizationId: string, processId: string | null) {
    const today = new Date();
    const rules = await tx.routingRule.findMany({
      where: { organizationId, active: true },
      orderBy: { priority: 'asc' },
    });
    return (
      rules.find((rule) => {
        if (rule.startsOn && rule.startsOn > today) return false;
        if (rule.endsOn && rule.endsOn < today) return false;
        if (rule.processId && rule.processId !== processId) return false;
        return Boolean(
          rule.assigneeId || rule.teamId || rule.clientId || rule.portfolioId || rule.processId,
        );
      }) ?? null
    );
  }

  private async counts(tx: Tx, batchId: string) {
    const rows = await tx.publicationOccurrence.findMany({
      where: { batchId },
      select: {
        cnjFormatted: true,
        isRevision: true,
        ambiguous: true,
        link: { select: { status: true } },
      },
    });
    return {
      occurrences: rows.length,
      cases: new Set(rows.map((row) => row.cnjFormatted).filter(Boolean)).size,
      revisions: rows.filter((row) => row.isRevision).length,
      ambiguous: rows.some((row) => row.ambiguous),
      pending: rows.filter((row) => row.link?.status === 'PENDING').length,
    };
  }

  private toResult(
    batchId: string,
    status: string,
    created: boolean,
    occurrences: number,
    cases: number,
    revisions: number,
    ambiguous: boolean,
    issues: string[],
  ): ImportResult {
    return {
      batch_id: batchId,
      status,
      created,
      occurrence_count: occurrences,
      distinct_cases: cases,
      revision_count: revisions,
      ambiguous,
      issues,
    };
  }

  private async audit(
    actor: Actor,
    action: string,
    resourceType: string,
    resourceId: string,
    afterData: Prisma.InputJsonValue,
  ): Promise<void> {
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

function asDate(iso: string | null): Date | null {
  if (!iso) return null;
  return new Date(`${iso}T00:00:00.000Z`);
}

export function envelopeFromHeaders(headers: string): EmailEnvelope {
  return parseEmailEnvelope(headers);
}
