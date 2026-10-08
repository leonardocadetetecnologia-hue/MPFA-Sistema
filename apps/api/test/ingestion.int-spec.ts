import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@mpfa/database';
import { ImportMessageService } from '../src/modules/ingestion/application/import-message';
import {
  SYNTHETIC_ENVELOPE,
  SYNTHETIC_WEBJUR_HTML,
} from '../src/modules/ingestion/domain/webjur-email-v1.fixture';
import type { Actor } from '../src/modules/iam/domain/access';
import { hashPassword } from '../src/modules/iam/domain/access';
import { OfficeService } from '../src/modules/office/application/office.service';

const root = path.resolve(__dirname, '../../..');
const SAMPLE_MSG = 'C:/Users/LEO CADETE/Documents/Public. 9. DJMG 230926 (42.90657549) .msg';
const SAMPLE_PDF = 'C:/Users/LEO CADETE/Documents/E-mail publicção - Webjur.pdf';

jest.setTimeout(60_000);

describe('ingestion persistence', () => {
  const databaseUrl =
    process.env.TEST_DATABASE_URL ?? 'postgresql://mpfa:mpfa@127.0.0.1:55432/mpfa';
  let prisma: PrismaClient;
  let actor: Actor;
  let imports: ImportMessageService;

  beforeAll(async () => {
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const organization = await prisma.organization.create({
      data: { name: 'Organização de teste' },
    });
    const user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        name: 'Administrador de teste',
        email: 'admin@teste.local',
        passwordHash: await hashPassword('senha-local-teste'),
        role: 'ADMINISTRATIVE',
      },
    });
    actor = {
      userId: user.id,
      organizationId: organization.id,
      role: 'ADMINISTRATIVE',
      clientId: null,
      email: user.email,
      status: 'ACTIVE',
    };
    imports = new ImportMessageService(prisma, path.join(root, '.local', 'storage-jest'));
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('imports a synthetic eml once, reimports without duplicating, and reprocesses a failed batch in place', async () => {
    const eml = Buffer.from(
      `${SYNTHETIC_ENVELOPE}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${SYNTHETIC_WEBJUR_HTML}`,
      'utf8',
    );
    const first = await imports.import(actor, { filename: 'webjur.eml', bytes: eml });
    expect(first.created).toBe(true);
    expect(first.occurrence_count).toBe(4);
    expect(first.distinct_cases).toBe(3);
    expect(first.revision_count).toBe(2);

    const second = await imports.import(actor, { filename: 'webjur.eml', bytes: eml });
    expect(second.created).toBe(false);
    expect(second.batch_id).toBe(first.batch_id);
    expect(await prisma.publicationOccurrence.count({ where: { batchId: first.batch_id } })).toBe(
      4,
    );
    expect(await prisma.workTask.count({ where: { organizationId: actor.organizationId } })).toBe(
      0,
    );

    const suggested = await prisma.legalProcess.findMany({
      where: { organizationId: actor.organizationId, suggested: true },
    });
    expect(suggested).toHaveLength(3);
    expect(suggested.every((row) => row.clientId === null && row.status === 'SUGGESTED')).toBe(
      true,
    );

    await prisma.ingestionBatch.update({
      where: { id: first.batch_id },
      data: { status: 'FAILED' },
    });
    const retried = await imports.import(actor, { filename: 'webjur.eml', bytes: eml });
    expect(retried.batch_id).toBe(first.batch_id);
    expect(retried.created).toBe(false);
    expect(await prisma.publicationOccurrence.count({ where: { batchId: first.batch_id } })).toBe(
      4,
    );
    expect(await prisma.workTask.count({ where: { organizationId: actor.organizationId } })).toBe(
      0,
    );
  });

  it('stores a pdf without extracting publications', async () => {
    const result = await imports.import(actor, {
      filename: 'impressao.pdf',
      bytes: Buffer.from('%PDF-1.4'),
    });
    expect(result.occurrence_count).toBe(0);
    expect(result.issues).toContain('pdf_without_html_comments');
  });

  it('keeps the local pdf print as an original and extracts nothing from it', async () => {
    let bytes: Buffer;
    try {
      bytes = readFileSync(SAMPLE_PDF);
    } catch {
      return;
    }
    const result = await imports.import(actor, { filename: 'impressao.pdf', bytes });
    expect(result.created).toBe(true);
    expect(result.occurrence_count).toBe(0);
    expect(result.issues).toContain('pdf_without_html_comments');
  });

  it('keeps the local sample distinct and does not duplicate it on a second import', async () => {
    let bytes: Buffer;
    try {
      bytes = readFileSync(SAMPLE_MSG);
    } catch {
      return;
    }
    const first = await imports.import(actor, { filename: 'amostra.msg', bytes });
    expect(first.occurrence_count).toBe(9);
    expect(first.distinct_cases).toBe(6);
    expect(first.revision_count).toBe(2);
    const again = await imports.import(actor, { filename: 'amostra.msg', bytes });
    expect(again.created).toBe(false);
    expect(again.batch_id).toBe(first.batch_id);
    expect(await prisma.publicationOccurrence.count({ where: { batchId: first.batch_id } })).toBe(
      9,
    );
  });

  it('publishes one occurrence to the portal and hides internal notes', async () => {
    const occurrence = await prisma.publicationOccurrence.findFirstOrThrow({
      where: { organizationId: actor.organizationId },
    });
    await prisma.comment.create({
      data: {
        organizationId: actor.organizationId,
        occurrenceId: occurrence.id,
        authorId: actor.userId,
        body: 'NOTA INTERNA SIGILOSA',
        internal: true,
      },
    });
    const client = await prisma.client.create({
      data: { organizationId: actor.organizationId, name: 'Cliente de teste' },
    });
    const office = new OfficeService(prisma);
    await office.publishToClient(actor, occurrence.id, client.id);
    const portalUser = await prisma.user.create({
      data: {
        organizationId: actor.organizationId,
        clientId: client.id,
        name: 'Cliente de teste',
        email: 'cliente@teste.local',
        passwordHash: await hashPassword('senha-local-teste'),
        role: 'CLIENT',
      },
    });
    const published = await office.portalPublications({
      userId: portalUser.id,
      organizationId: actor.organizationId,
      role: 'CLIENT',
      clientId: client.id,
      email: portalUser.email,
      status: 'ACTIVE',
    });
    expect(published).toHaveLength(1);
    expect(JSON.stringify(published)).not.toContain('NOTA INTERNA SIGILOSA');
  });

  it('persists a timer across a new service instance and records a draft', async () => {
    const lawyer = await prisma.user.create({
      data: {
        organizationId: actor.organizationId,
        name: 'Advogado de teste',
        email: 'advogado@teste.local',
        passwordHash: await hashPassword('senha-local-teste'),
        role: 'LAWYER',
      },
    });
    const lawyerActor: Actor = {
      userId: lawyer.id,
      organizationId: actor.organizationId,
      role: 'LAWYER',
      clientId: null,
      email: lawyer.email,
      status: 'ACTIVE',
    };
    const office = new OfficeService(prisma);
    await office.startTimer(lawyerActor, { description: 'leitura' });
    const reloaded = await new OfficeService(prisma).currentTimer(lawyerActor);
    expect(reloaded?.status).toBe('RUNNING');
    await prisma.activeTimer.update({
      where: { userId: lawyer.id },
      data: { startedAt: new Date(Date.now() - 120_000) },
    });
    const stopped = await office.stopTimer(lawyerActor);
    expect(stopped.status).toBe('DRAFT');
    const entry = await prisma.timeEntry.findFirstOrThrow({ where: { userId: lawyer.id } });
    expect(entry.workedMinutes).toBeGreaterThan(0);
    expect(entry.billableMinutes).toBe(entry.workedMinutes);
    expect(await prisma.activeTimer.findUnique({ where: { userId: lawyer.id } })).toBeNull();
  });
});
