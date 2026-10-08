/**
 * WEBJUR_EMAIL_V1 — layout do e-mail HTML que o ADVWIN já lê.
 * O assunto não valida a mensagem. O corte de cada publicação são os comentários HTML.
 */

export const WEBJUR_EMAIL_PARSER_VERSION = 'WEBJUR_EMAIL_V1' as const;

export type IngestionQuality = 'VALID' | 'SUSPICIOUS' | 'INVALID';

export interface ParsedParty {
  role: string;
  name: string;
}

export interface ParsedLawyer {
  name: string;
  oab: string;
}

export interface ParsedOccurrence {
  ordinal: number | null;
  cnjDigits: string | null;
  cnjFormatted: string | null;
  availabilityDate: string | null;
  publicationDate: string | null;
  journal: string | null;
  notebook: string | null;
  location: string | null;
  page: string | null;
  actType: string | null;
  isRevision: boolean;
  documentId: string | null;
  documentUrl: string | null;
  parties: ParsedParty[];
  lawyers: ParsedLawyer[];
  intimated: string[];
  text: string;
  html: string;
  state: IngestionQuality;
  issues: string[];
}

export interface AmbiguousLawyerMatch {
  sharedTokens: string[];
  variants: ParsedLawyer[];
}

export interface ParsedWebjurEmail {
  parserVersion: typeof WEBJUR_EMAIL_PARSER_VERSION;
  rawHtml: string;
  batchState: IngestionQuality;
  issues: string[];
  clientName: string | null;
  processedOn: string | null;
  diary: string | null;
  subscriptionExpiresOn: string | null;
  declaredCount: number | null;
  searchTerms: string[];
  readLink: { companyCode: string; clientCode: string; emailCode: string } | null;
  generatedAt: string | null;
  occurrences: ParsedOccurrence[];
  ambiguousLawyers: AmbiguousLawyerMatch[];
}

export interface EmailEnvelope {
  messageId: string | null;
  seqEmail: string | null;
  subject: string | null;
  from: string | null;
  date: string | null;
}

const CNJ_FORMATTED = /(\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4})/;
const DATE_BR = /(\d{2})\/(\d{2})\/(\d{4})/;

const NAME_STOPWORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

export function occurrenceIdentity(input: {
  seqEmail: string | null;
  documentId: string | null;
  ordinal: number | null;
}): string {
  if (input.seqEmail && input.documentId) {
    return `seq:${input.seqEmail}:doc:${input.documentId}`;
  }
  if (input.seqEmail && input.ordinal !== null) {
    return `seq:${input.seqEmail}:ord:${input.ordinal}`;
  }
  return `ord:${input.ordinal ?? 'none'}:doc:${input.documentId ?? 'none'}`;
}

export interface ExistingBatch {
  id: string;
  status: 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_PENDINGS' | 'FAILED';
  contentHash: string;
}

export type ImportPlan =
  | { action: 'create' }
  | { action: 'return_existing'; batchId: string }
  | { action: 'reprocess'; batchId: string };

/** Same SeqEmail never opens a second batch. A finished identical file is a no-op. */
export function planImport(existing: ExistingBatch | null, contentHash: string): ImportPlan {
  if (!existing) return { action: 'create' };
  if (existing.status !== 'FAILED' && existing.contentHash === contentHash) {
    return { action: 'return_existing', batchId: existing.id };
  }
  return { action: 'reprocess', batchId: existing.id };
}

export function parseEmailEnvelope(headers: string): EmailEnvelope {
  const unfolded = headers.replace(/\r?\n[ \t]+/g, ' ');
  return {
    messageId: headerValue(unfolded, 'message-id'),
    seqEmail: headerValue(unfolded, 'seqemail'),
    subject: headerValue(unfolded, 'subject'),
    from: headerValue(unfolded, 'from'),
    date: headerValue(unfolded, 'date'),
  };
}

/**
 * A publication number is structurally valid when it has the CNJ mask.
 * The mod-97 check digit from Resolução CNJ 65 does not match numbers in the
 * Webjur sample, so it is not used to reject or downgrade a publication.
 */
export function cnjStructureValid(formatted: string): boolean {
  return CNJ_FORMATTED.test(formatted);
}

export function findAmbiguousLawyers(lawyers: ParsedLawyer[]): AmbiguousLawyerMatch[] {
  const groups = new Map<string, ParsedLawyer[]>();
  for (let i = 0; i < lawyers.length; i += 1) {
    const left = lawyers[i];
    if (!left) continue;
    for (let j = i + 1; j < lawyers.length; j += 1) {
      const right = lawyers[j];
      if (!right || normalizeOab(left.oab) === normalizeOab(right.oab)) continue;
      const shared = sharedNameTokens(left.name, right.name);
      if (shared.length < 2) continue;
      const key = shared.join('|');
      const list = groups.get(key) ?? [];
      if (!list.some((item) => item.name === left.name && item.oab === left.oab)) list.push(left);
      if (!list.some((item) => item.name === right.name && item.oab === right.oab))
        list.push(right);
      groups.set(key, list);
    }
  }
  return [...groups.entries()].map(([key, variants]) => ({
    sharedTokens: key.split('|'),
    variants,
  }));
}

export function parseWebjurEmail(html: string): ParsedWebjurEmail {
  const issues: string[] = [];
  const headerHtml = html.split(/<!--\s*Inicio publicacao/i)[0] ?? html;
  const headerText = visibleText(headerHtml);
  const searchTerms = extractSearchTerms(html);
  const declared = visibleText(html).match(/Total de Publica[cç][oõ]es[^:]*:\s*(\d+)/i);
  const read = html.match(
    /leremail\.ASP\?cdEmpresa=(\d+)&(?:amp;)?cdCli=(\d+)&(?:amp;)?CdEmail=(\d+)/i,
  );
  const processed = headerText.match(
    /Data processamento\/pesquisa\s+(\d{2}\/\d{2}\/\d{4})\s*\(([^)]+)\)/i,
  );
  const client = headerText.match(/Cliente\s+([^\n]+)/i);
  const expires = headerText.match(/Vencimento da assinatura:\s*(\d{2}\/\d{2}\/\d{4})/i);
  const generated = visibleText(html).match(/Gerado em\s+(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i);

  const occurrences = extractOccurrences(html);
  if (occurrences.length === 0) {
    issues.push('missing_publication_boundaries');
  }

  const declaredCount = declared?.[1] ? Number(declared[1]) : null;
  if (declaredCount !== null && declaredCount !== occurrences.length) {
    issues.push('declared_count_mismatch');
  }

  const lawyers = occurrences.flatMap((item) => item.lawyers);
  const ambiguousLawyers = findAmbiguousLawyers(lawyers);
  if (ambiguousLawyers.length > 0) issues.push('ambiguous_lawyer_names');

  const anySuspicious = occurrences.some((item) => item.state !== 'VALID');
  let batchState: IngestionQuality = 'VALID';
  if (occurrences.length === 0 || anySuspicious || issues.length > 0) batchState = 'SUSPICIOUS';

  return {
    parserVersion: WEBJUR_EMAIL_PARSER_VERSION,
    rawHtml: html,
    batchState,
    issues,
    clientName: clean(client?.[1] ?? null),
    processedOn: isoDate(processed?.[1] ?? null),
    diary: clean(processed?.[2] ?? null),
    subscriptionExpiresOn: isoDate(expires?.[1] ?? null),
    declaredCount,
    searchTerms,
    readLink:
      read?.[1] && read[2] && read[3]
        ? { companyCode: read[1], clientCode: read[2], emailCode: read[3] }
        : null,
    generatedAt: generated?.[1] ?? null,
    occurrences,
    ambiguousLawyers,
  };
}

function extractOccurrences(html: string): ParsedOccurrence[] {
  const pattern =
    /<!--\s*Inicio publicacao;;Processo:(\d+)\s*-->([\s\S]*?)<!--\s*Fim publicacao;;Processo:([^>]*?)\s*-->/gi;
  const found: ParsedOccurrence[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const digits = match[1] ?? null;
    const block = match[2] ?? '';
    const endCnj = (match[3] ?? '').trim();
    found.push(parseOccurrence(block, digits, endCnj));
  }

  const starts = html.match(/<!--\s*Inicio publicacao/gi)?.length ?? 0;
  if (starts > found.length) {
    found.push({
      ordinal: null,
      cnjDigits: null,
      cnjFormatted: null,
      availabilityDate: null,
      publicationDate: null,
      journal: null,
      notebook: null,
      location: null,
      page: null,
      actType: null,
      isRevision: false,
      documentId: null,
      documentUrl: null,
      parties: [],
      lawyers: [],
      intimated: [],
      text: '',
      html: '',
      state: 'SUSPICIOUS',
      issues: ['unclosed_publication_boundary'],
    });
  }
  return found;
}

function parseOccurrence(
  block: string,
  cnjDigits: string | null,
  endMarker: string,
): ParsedOccurrence {
  const text = visibleText(block);
  const issues: string[] = [];
  const formattedInText = text.match(CNJ_FORMATTED)?.[1] ?? null;
  const formattedFromMarker = endMarker.match(CNJ_FORMATTED)?.[1] ?? null;
  const formatted = formattedFromMarker ?? formattedInText;
  if (formatted && !cnjStructureValid(formatted)) issues.push('cnj_structure');
  if (cnjDigits && formatted && cnjDigits !== formatted.replace(/\D/g, '')) {
    issues.push('cnj_boundary_mismatch');
  }

  const availability = isoDate(
    text.match(/Data de Disponibiliza[cç][aã]o:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null,
  );
  const publication = isoDate(
    text.match(/Data de Publica[cç][aã]o:\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? null,
  );
  if (text.match(/Data de Disponibiliza/i) && !availability)
    issues.push('invalid_availability_date');
  if (text.match(/Data de Publica/i) && !publication) issues.push('invalid_publication_date');
  if (!formatted && !cnjDigits) issues.push('missing_cnj');

  const ordinalRaw = text.match(/Publica[cç][aã]o:\s*(\d+)/i)?.[1];
  const parties = [
    ...text.matchAll(
      /^(POLO ATIVO|POLO PASSIVO|EXEQUENTE|EXECUTADO|AUTOR|REU|RECORRENTE|RECORRIDO|PERITO):\s*(.+)$/gim,
    ),
  ].map((item) => ({ role: (item[1] ?? '').toUpperCase(), name: clean(item[2] ?? '') ?? '' }));
  const lawyers = [
    ...text.matchAll(/ADVOGADO:?\s+(.+?)\s*(?:-\s*)?\(?\s*OAB:?\s*([0-9./A-Za-z]+)\)?/gi),
  ].map((item) => ({ name: clean(item[1] ?? '') ?? '', oab: (item[2] ?? '').toUpperCase() }));
  const intimatedLine = text.match(/Intimado\s*\(s\)\s*\/\s*Citado\s*\(s\)[:\s-]*(.+)/i)?.[1];
  const intimated = intimatedLine
    ? intimatedLine
        .split(/\s+-\s+/)
        .map((part) => clean(part))
        .filter((part): part is string => Boolean(part))
    : [];

  const actLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^(Lista de distribui|Intima|Notifica|Pauta|Distribui)/i.test(line));

  return {
    ordinal: ordinalRaw ? Number(ordinalRaw) : null,
    cnjDigits,
    cnjFormatted: formatted,
    availabilityDate: availability,
    publicationDate: publication,
    journal: clean(text.match(/Jornal:\s*(.+)/i)?.[1] ?? null),
    notebook: clean(text.match(/Caderno:\s*(.+)/i)?.[1] ?? null),
    location: clean(text.match(/Local:\s*(.+)/i)?.[1] ?? null),
    page: clean(text.match(/P[aá]gina:\s*(\S+)/i)?.[1] ?? null),
    actType: actLine ?? null,
    isRevision: /\*\*\s*REVIS[AÃ]O\s*\*\*/i.test(text),
    documentId: text.match(/Identificador do documento:\s*(\d+)/i)?.[1] ?? null,
    documentUrl: text.match(/Acesso ao documento:\s*(https?:\S+)/i)?.[1] ?? null,
    parties,
    lawyers,
    intimated,
    text,
    html: block,
    state: issues.length > 0 ? 'SUSPICIOUS' : 'VALID',
    issues,
  };
}

function extractSearchTerms(html: string): string[] {
  const block = html.match(/<!--\s*PalBuscaINI\s*-->([\s\S]*?)<!--\s*PalBuscaFIM\s*-->/i)?.[1];
  if (!block) return [];
  return visibleText(block)
    .split(/[|\n]/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

export function visibleText(html: string): string {
  return decodeBasicEntities(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/t[dh]>/gi, '\t')
    .replace(/<\/p>/gi, '\n')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)));
}

function headerValue(headers: string, name: string): string | null {
  const match = headers.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
  return clean(match?.[1] ?? null);
}

function isoDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(DATE_BR);
  if (!match?.[1] || !match[2] || !match[3]) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function clean(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeOab(value: string): string {
  return value.replace(/\D/g, '');
}

function sharedNameTokens(left: string, right: string): string[] {
  const a = nameTokens(left);
  const b = new Set(nameTokens(right));
  return a.filter((token) => b.has(token));
}

function nameTokens(value: string): string[] {
  const unique = new Set(
    value
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !NAME_STOPWORDS.has(token)),
  );
  return [...unique];
}
