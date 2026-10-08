import { parseEmailEnvelope, type EmailEnvelope } from '../domain/webjur-email-v1';

export interface ReadEmail {
  html: string;
  envelope: EmailEnvelope;
  headers: string;
}

/** Reads a Webjur .eml (HTML body, base64 or quoted-printable). */
export function readEml(bytes: Buffer): ReadEmail {
  const raw = bytes.toString('latin1');
  const splitAt = raw.search(/\r?\n\r?\n/);
  if (splitAt < 0) {
    return { html: bytes.toString('utf8'), envelope: parseEmailEnvelope(''), headers: '' };
  }
  const headers = raw.slice(0, splitAt);
  const bodyStart = raw.slice(splitAt, splitAt + 4) === '\r\n\r\n' ? splitAt + 4 : splitAt + 2;
  const unfolded = headers.replace(/\r?\n[ \t]+/g, ' ');
  const encoding = unfolded.match(/^content-transfer-encoding:\s*(\S+)/im)?.[1]?.toLowerCase();
  const charset = unfolded.match(/charset="?([^";\s]+)/i)?.[1]?.toLowerCase() ?? null;
  let body = bytes.subarray(bodyStart);
  if (encoding === 'base64') {
    body = Buffer.from(body.toString('latin1').replace(/\s+/g, ''), 'base64');
  } else if (encoding === 'quoted-printable') {
    body = decodeQuotedPrintable(body.toString('latin1'));
  }
  return { html: decodeBody(body, charset), envelope: parseEmailEnvelope(headers), headers };
}

function decodeBody(body: Buffer, charset: string | null): string {
  if (charset === 'utf-8' || charset === 'utf8') return body.toString('utf8');
  if (
    charset === 'iso-8859-1' ||
    charset === 'latin1' ||
    charset === 'windows-1252' ||
    charset === 'cp1252'
  ) {
    return new TextDecoder('windows-1252').decode(body);
  }
  if (!charset) {
    const asUtf8 = body.toString('utf8');
    return asUtf8.includes('\uFFFD') ? new TextDecoder('windows-1252').decode(body) : asUtf8;
  }
  return new TextDecoder(charset).decode(body);
}

function decodeQuotedPrintable(value: string): Buffer {
  const joined = value.replace(/=\r?\n/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < joined.length; i += 1) {
    const current = joined[i];
    const pair = joined.slice(i + 1, i + 3);
    if (current === '=' && /[0-9A-Fa-f]{2}/.test(pair)) {
      bytes.push(Number.parseInt(pair, 16));
      i += 2;
    } else if (current !== undefined) {
      bytes.push(current.charCodeAt(0));
    }
  }
  return Buffer.from(bytes);
}
