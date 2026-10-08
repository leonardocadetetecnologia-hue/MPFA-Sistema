import { parseEmailEnvelope, type EmailEnvelope } from '../domain/webjur-email-v1';

const FREESECT = 0xffffffff;
const ENDOFCHAIN = 0xfffffffe;
const HEADER_FAT_ENTRIES = 109;

export interface OutlookMessage {
  html: string;
  envelope: EmailEnvelope;
  headers: string;
}

const RTF_DICTIONARY =
  '{\\rtf1\\ansi\\mac\\deff0\\deftab720{\\fonttbl;}{\\f0\\fnil \\froman \\fswiss \\fmodern \\fscript \\fdecor MS Sans SerifSymbolArialTimes New RomanCourier{\\colortbl\\red0\\green0\\blue0\r\n\\par \\pard\\plain\\f0\\fs20\\b\\i\\u\\tab\\tx';

/** Reads an Outlook .msg and returns the HTML the Webjur parser expects. */
export function readOutlookMessage(bytes: Buffer): OutlookMessage {
  const files = readCompoundStreams(bytes);
  const headers = decodeUnicode(files.get('__substg1.0_007D001F') ?? Buffer.alloc(0));
  const rtf = files.get('__substg1.0_10090102');
  const htmlFromRtf = rtf ? htmlFromCompressedRtf(rtf) : '';
  const plain = decodeUnicode(files.get('__substg1.0_1000001F') ?? Buffer.alloc(0));
  const html = htmlFromRtf.includes('Inicio publicacao')
    ? htmlFromRtf
    : plain.includes('Inicio publicacao')
      ? plain
      : htmlFromRtf || plain;
  return { html, envelope: parseEmailEnvelope(headers), headers };
}

export function htmlFromCompressedRtf(blob: Buffer): string {
  const compSize = blob.readUInt32LE(0);
  const rawSize = blob.readUInt32LE(4);
  const compType = blob.subarray(8, 12).toString('latin1');
  if (compType !== 'LZFu') return '';
  const data = blob.subarray(16, 16 + (compSize - 12));
  const dictionary = Buffer.alloc(4096);
  dictionary.write(RTF_DICTIONARY, 0, 'latin1');
  let writeOffset = Buffer.byteLength(RTF_DICTIONARY, 'latin1');
  let inPos = 0;
  const output: number[] = [];
  while (inPos < data.length && output.length < rawSize) {
    const control = data[inPos] ?? 0;
    inPos += 1;
    for (let bit = 0; bit < 8 && inPos < data.length && output.length < rawSize; bit += 1) {
      if (control & (1 << bit)) {
        const token = ((data[inPos] ?? 0) << 8) + (data[inPos + 1] ?? 0);
        inPos += 2;
        let offset = token >> 4;
        const length = (token & 0xf) + 2;
        for (let n = 0; n < length; n += 1) {
          const byte = dictionary[offset] ?? 0;
          offset = (offset + 1) & 0xfff;
          output.push(byte);
          dictionary[writeOffset] = byte;
          writeOffset = (writeOffset + 1) & 0xfff;
        }
      } else {
        const byte = data[inPos] ?? 0;
        inPos += 1;
        output.push(byte);
        dictionary[writeOffset] = byte;
        writeOffset = (writeOffset + 1) & 0xfff;
      }
    }
  }
  return htmlFromEncapsulatedRtf(Buffer.from(output).toString('latin1'));
}

export function htmlFromEncapsulatedRtf(rtf: string): string {
  const source = rtf.replace(/\\htmlrtf[\s\S]*?\\htmlrtf0 ?/g, '');
  const pieces: string[] = [];
  const marker = /\{\\\*\\htmltag\d+\s+/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(source))) {
    pieces.push(decodeRtfText(source.slice(last, match.index)));
    const start = match.index + match[0].length;
    const end = source.indexOf('}', start);
    pieces.push(end === -1 ? source.slice(start) : source.slice(start, end));
    last = end === -1 ? source.length : end + 1;
    marker.lastIndex = last;
  }
  pieces.push(decodeRtfText(source.slice(last)));
  return pieces.join('');
}

function decodeRtfText(value: string): string {
  const withoutControls = value
    .replace(/\\par\b ?/g, '\n')
    .replace(/\\tab\b ?/g, '\t')
    .replace(/\\'[0-9a-fA-F]{2}/g, (hex) => String.fromCharCode(Number.parseInt(hex.slice(2), 16)))
    .replace(/\\[a-zA-Z]+-?\d* ?/g, '')
    .replace(/[{}]/g, '');
  return withoutControls;
}

function decodeUnicode(bytes: Buffer): string {
  return bytes.toString('utf16le').split('\u0000').join('');
}

function readCompoundStreams(bytes: Buffer): Map<string, Buffer> {
  if (bytes.subarray(0, 8).toString('hex') !== 'd0cf11e0a1b11ae1') {
    throw new Error('not an outlook message');
  }
  const sectorSize = 1 << bytes.readUInt16LE(0x1e);
  const miniSize = 1 << bytes.readUInt16LE(0x20);
  const fatSectorCount = bytes.readUInt32LE(0x2c);
  const directoryStart = bytes.readUInt32LE(0x30);
  const miniCutoff = bytes.readUInt32LE(0x38);
  const miniFatStart = bytes.readUInt32LE(0x3c);
  const miniFatCount = bytes.readUInt32LE(0x40);
  const difatStart = bytes.readUInt32LE(0x44);
  const difatCount = bytes.readUInt32LE(0x48);

  const fatSectorIds: number[] = [];
  for (let i = 0; i < HEADER_FAT_ENTRIES; i += 1) {
    const id = bytes.readUInt32LE(0x4c + i * 4);
    if (id === FREESECT) break;
    fatSectorIds.push(id);
  }
  let difat = difatStart;
  for (let n = 0; n < difatCount && difat < FREESECT; n += 1) {
    const page = sector(bytes, difat, sectorSize);
    const entries = sectorSize / 4 - 1;
    for (let i = 0; i < entries; i += 1) {
      const id = page.readUInt32LE(i * 4);
      if (id !== FREESECT) fatSectorIds.push(id);
    }
    difat = page.readUInt32LE(sectorSize - 4);
  }

  const fat = Buffer.concat(
    fatSectorIds.slice(0, fatSectorCount).map((id) => sector(bytes, id, sectorSize)),
  );
  const next = (id: number): number =>
    id * 4 + 4 <= fat.length ? fat.readUInt32LE(id * 4) : ENDOFCHAIN;

  const readChain = (start: number, size: number): Buffer => {
    const parts: Buffer[] = [];
    let id = start;
    let guard = 0;
    while (id < ENDOFCHAIN && guard < 100000) {
      parts.push(sector(bytes, id, sectorSize));
      id = next(id);
      guard += 1;
    }
    return Buffer.concat(parts).subarray(0, size);
  };

  const directory = readChain(directoryStart, Number.MAX_SAFE_INTEGER);
  const entries = readDirectory(directory);
  const root = entries[0];
  const miniStream = root ? readChain(root.start, root.size) : Buffer.alloc(0);
  const miniFat = readChain(miniFatStart, miniFatCount * sectorSize);
  const nextMini = (id: number): number =>
    id * 4 + 4 <= miniFat.length ? miniFat.readUInt32LE(id * 4) : ENDOFCHAIN;
  const readMini = (start: number, size: number): Buffer => {
    const parts: Buffer[] = [];
    let id = start;
    let guard = 0;
    while (id < ENDOFCHAIN && guard < 100000) {
      const offset = id * miniSize;
      parts.push(miniStream.subarray(offset, offset + miniSize));
      id = nextMini(id);
      guard += 1;
    }
    return Buffer.concat(parts).subarray(0, size);
  };

  const streams = new Map<string, Buffer>();
  for (const entry of entries) {
    if (entry.type !== 2 || entry.size === 0) continue;
    const data =
      entry.size < miniCutoff
        ? readMini(entry.start, entry.size)
        : readChain(entry.start, entry.size);
    if (!streams.has(entry.name)) streams.set(entry.name, data);
  }
  return streams;
}

interface DirectoryEntry {
  name: string;
  type: number;
  start: number;
  size: number;
}

function readDirectory(directory: Buffer): DirectoryEntry[] {
  const entries: DirectoryEntry[] = [];
  for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
    const nameLength = directory.readUInt16LE(offset + 0x40);
    const name =
      nameLength >= 2
        ? directory.subarray(offset, offset + nameLength - 2).toString('utf16le')
        : '';
    entries.push({
      name,
      type: directory.readUInt8(offset + 0x42),
      start: directory.readUInt32LE(offset + 0x74),
      size: Number(directory.readBigUInt64LE(offset + 0x78)),
    });
  }
  return entries;
}

function sector(bytes: Buffer, id: number, sectorSize: number): Buffer {
  const offset = (id + 1) * sectorSize;
  return bytes.subarray(offset, offset + sectorSize);
}
