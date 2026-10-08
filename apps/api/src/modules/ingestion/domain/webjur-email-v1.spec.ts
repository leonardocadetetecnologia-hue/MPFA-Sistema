import { readFileSync } from 'node:fs';
import { readEml } from '../infrastructure/read-eml';
import { readOutlookMessage } from '../infrastructure/read-outlook-message';
import {
  findAmbiguousLawyers,
  occurrenceIdentity,
  parseEmailEnvelope,
  parseWebjurEmail,
  planImport,
} from './webjur-email-v1';
import { SYNTHETIC_ENVELOPE, SYNTHETIC_WEBJUR_HTML } from './webjur-email-v1.fixture';

const SAMPLE_MSG = 'C:/Users/LEO CADETE/Documents/Public. 9. DJMG 230926 (42.90657549) .msg';

describe('WEBJUR_EMAIL_V1', () => {
  const parsed = parseWebjurEmail(SYNTHETIC_WEBJUR_HTML);

  it('keeps the original html and does not trust the subject', () => {
    const envelope = parseEmailEnvelope(SYNTHETIC_ENVELOPE);
    expect(envelope.subject).toContain('Public. 4.');
    expect(envelope.seqEmail).toBe('1000');
    expect(parsed.rawHtml).toContain('Inicio publicacao');
    expect(parsed.occurrences).toHaveLength(4);
    expect(parsed.declaredCount).toBe(4);
    expect(parsed.searchTerms.length).toBeGreaterThan(0);
    expect(parsed.readLink).toEqual({
      companyCode: '42',
      clientCode: '90657549',
      emailCode: '429065754923092026113543',
    });
  });

  it('keeps two occurrences of the same case when the document id differs', () => {
    const [first, second] = parsed.occurrences;
    expect(first?.cnjFormatted).toBe(second?.cnjFormatted);
    const keys = parsed.occurrences.map((item) =>
      occurrenceIdentity({ seqEmail: '1000', documentId: item.documentId, ordinal: item.ordinal }),
    );
    expect(new Set(keys).size).toBe(parsed.occurrences.length);
    const eml = Buffer.from(
      `${SYNTHETIC_ENVELOPE}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${SYNTHETIC_WEBJUR_HTML}`,
      'utf8',
    );
    const fromEml = parseWebjurEmail(readEml(eml).html);
    expect(fromEml.occurrences).toHaveLength(4);
    expect(fromEml.occurrences.filter((item) => item.isRevision)).toHaveLength(2);
    expect(fromEml.occurrences.map((item) => item.ordinal)).toEqual([1, 2, 3, 4]);
    expect(first?.documentId).toBe('1001');
    expect(second?.documentId).toBe('1002');
    expect(first?.intimated).toEqual(['EMPRESA EXEMPLO LTDA']);
    expect(second?.intimated).toEqual(['PESSOA EXEMPLO']);
    const seq = '1000';
    expect(
      occurrenceIdentity({ seqEmail: seq, documentId: first?.documentId ?? null, ordinal: 1 }),
    ).not.toBe(
      occurrenceIdentity({ seqEmail: seq, documentId: second?.documentId ?? null, ordinal: 2 }),
    );
  });

  it('marks the two revision entries and keeps the dates apart', () => {
    const revisions = parsed.occurrences.filter((item) => item.isRevision);
    expect(revisions).toHaveLength(2);
    expect(parsed.occurrences[0]?.availabilityDate).toBe('2026-09-23');
    expect(parsed.occurrences[0]?.publicationDate).toBe('2026-09-24');
    expect(parsed.processedOn).toBe('2026-09-23');
    expect(revisions[0]?.availabilityDate).toBe('2026-09-21');
    expect(revisions[0]?.publicationDate).toBe('2026-09-22');
  });

  it('flags similar names with different OAB numbers', () => {
    expect(parsed.ambiguousLawyers.length).toBeGreaterThan(0);
    expect(parsed.issues).toContain('ambiguous_lawyer_names');
    expect(parsed.batchState).toBe('SUSPICIOUS');
  });

  it('preserves a message that has no publication boundary', () => {
    const broken = parseWebjurEmail('<html><body>sem marcacao</body></html>');
    expect(broken.occurrences).toHaveLength(0);
    expect(broken.batchState).toBe('SUSPICIOUS');
    expect(broken.issues).toContain('missing_publication_boundaries');
    expect(broken.rawHtml).toContain('sem marcacao');
  });

  it('does not open a second batch for the same file or a failed retry', () => {
    expect(planImport(null, 'abc')).toEqual({ action: 'create' });
    expect(planImport({ id: 'b1', status: 'COMPLETED', contentHash: 'abc' }, 'abc')).toEqual({
      action: 'return_existing',
      batchId: 'b1',
    });
    expect(planImport({ id: 'b1', status: 'FAILED', contentHash: 'abc' }, 'abc')).toEqual({
      action: 'reprocess',
      batchId: 'b1',
    });
  });

  it('does not treat identical OAB spellings as ambiguous', () => {
    expect(
      findAmbiguousLawyers([
        { name: 'ANA EXEMPLO SILVA', oab: '111111/MG' },
        { name: 'ANA EXEMPLO SILVA', oab: '111.111/MG' },
      ]),
    ).toEqual([]);
  });
});

describe('WEBJUR_EMAIL_V1 real sample', () => {
  it('extracts nine publications and six distinct case numbers from the local .msg', async () => {
    let bytes: Buffer;
    try {
      bytes = readFileSync(SAMPLE_MSG);
    } catch {
      return;
    }
    const message = readOutlookMessage(bytes);
    const parsed = parseWebjurEmail(message.html);
    const cases = new Set(
      parsed.occurrences
        .map((item) => item.cnjFormatted)
        .filter((value): value is string => Boolean(value)),
    );
    expect(parsed.occurrences).toHaveLength(9);
    expect(cases.size).toBe(6);
    expect(parsed.occurrences.filter((item) => item.isRevision)).toHaveLength(2);
    expect(message.envelope.seqEmail).toBeTruthy();
    expect(message.envelope.messageId).toContain('@');
    const documentIds = new Set(
      parsed.occurrences
        .map((item) => item.documentId)
        .filter((value): value is string => Boolean(value)),
    );
    expect(documentIds.size).toBeGreaterThan(1);
    const repeatedCase = [...cases].some(
      (cnj) => parsed.occurrences.filter((item) => item.cnjFormatted === cnj).length > 1,
    );
    expect(repeatedCase).toBe(true);
    expect(
      parsed.occurrences.some(
        (item) =>
          item.availabilityDate &&
          item.publicationDate &&
          item.availabilityDate !== item.publicationDate,
      ),
    ).toBe(true);
    expect(parsed.processedOn).toBeTruthy();
    expect(parsed.ambiguousLawyers.length).toBeGreaterThan(0);
  });
});
