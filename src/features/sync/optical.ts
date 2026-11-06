// ELQ1 is a lossless transport wrapper. Existing schemas/signature verifiers remain the trust boundary.
const PREFIX = 'ELQ1:';
export const MAX_OPTICAL_BYTES = 900;
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
// Frozen in ELQ1, including layouts: any coding change needs a new version and the old decoder.
const words = [
  'kind',
  'entryloop-enroll',
  'v',
  'e',
  'd',
  'l',
  'k',
  'EC',
  'P-256',
  'kty',
  'crv',
  'x',
  'y',
  'q',
  's',
  'at',
  'ELT',
  't',
  'p',
  'ELS',
  'request',
  'offer',
  'data',
  'operations',
  'credentials',
  'z',
  'c',
  'h',
  'g',
  'n',
  'f',
  'i',
  'o',
  'm',
  'total',
  'ack',
  'missing',
  'eventId',
  'epoch',
  'revokedScanners',
  'revokedTickets',
  'signature',
];
// Tags 12–22 omit only schema-implied literals/field names, never signed values.
const layouts: {
  tag: number;
  constants: Record<string, string | number>;
  fields: string[];
}[] = [
  { tag: 12, constants: { kty: 'EC', crv: 'P-256' }, fields: ['x', 'y'] },
  {
    tag: 13,
    constants: { kind: 'entryloop-enroll', v: 1 },
    fields: ['e', 'd', 'l', 'k', 'q', 's'],
  },
  { tag: 14, constants: { v: 1 }, fields: ['e', 'd', 'l', 'k', 'at', 's'] },
  { tag: 15, constants: { k: 'ELT', v: 1 }, fields: ['e', 't', 's'] },
  {
    tag: 16,
    constants: { p: 'ELS', v: 2, k: 'request' },
    fields: ['q', 'c', 'd', 'z'],
  },
  {
    tag: 17,
    constants: { p: 'ELS', v: 2, k: 'offer' },
    fields: ['q', 's', 'c', 'h', 'n', 'f', 'd', 'z'],
  },
  {
    tag: 18,
    constants: { p: 'ELS', v: 2, k: 'data', t: 'operations' },
    fields: ['s', 'i', 'o', 'z'],
  },
  {
    tag: 19,
    constants: { p: 'ELS', v: 2, k: 'data', t: 'credentials' },
    fields: ['s', 'i', 'd', 'z'],
  },
  {
    tag: 20,
    constants: { p: 'ELS', v: 2, k: 'missing' },
    fields: ['s', 'c', 'm', 'total', 'z'],
  },
  {
    tag: 21,
    constants: { p: 'ELS', v: 2, k: 'ack' },
    fields: ['s', 'q', 'c', 'h', 'g', 'n', 'z'],
  },
  {
    tag: 22,
    constants: { v: 1 },
    fields: [
      'eventId',
      'epoch',
      'revokedScanners',
      'revokedTickets',
      'signature',
    ],
  },
];
const utf8 = new TextEncoder();
const error = () =>
  new Error('Corrupted compact QR. Use the original download or scan again.');
export function base45(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 2) {
    const pair = i + 1 < bytes.length;
    let value = pair ? bytes[i]! * 256 + bytes[i + 1]! : bytes[i]!;
    result += alphabet[value % 45];
    value = Math.floor(value / 45);
    result += alphabet[value % 45];
    if (pair) result += alphabet[Math.floor(value / 45)];
  }
  return result;
}
export function unbase45(text: string): Uint8Array {
  if (text.length % 3 === 1 || text.length > MAX_OPTICAL_BYTES) throw error();
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 3) {
    const count = Math.min(3, text.length - i);
    let value = 0;
    for (let j = 0; j < count; j++) {
      const digit = alphabet.indexOf(text[i + j]!);
      if (digit < 0) throw error();
      value += digit * 45 ** j;
    }
    if (value > (count === 3 ? 65535 : 255)) throw error();
    if (count === 3) bytes.push(Math.floor(value / 256));
    bytes.push(value % 256);
  }
  return Uint8Array.from(bytes);
}
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (text: string) =>
  Uint8Array.from(text.match(/../g)!, (pair) => parseInt(pair, 16));
const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
const unb64 = (text: string) =>
  Uint8Array.from(
    atob(
      text.replaceAll('-', '+').replaceAll('_', '/') +
        '='.repeat((4 - (text.length % 4)) % 4),
    ),
    (c) => c.charCodeAt(0),
  );
function binary(value: unknown): Uint8Array {
  const out: number[] = [];
  function uint(value: number) {
    do {
      const digit = value % 128;
      value = Math.floor(value / 128);
      out.push(digit + (value ? 128 : 0));
    } while (value);
  }
  function raw(tag: number, bytes: Uint8Array) {
    out.push(tag, ...bytes);
  }
  function write(item: unknown, depth: number) {
    if (depth > 10) throw error();
    if (typeof item === 'string') {
      const token = words.indexOf(item);
      if (token >= 0) out.push(32 + token);
      else if (
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(
          item,
        )
      )
        raw(4, unhex(item.replaceAll('-', '')));
      else if (/^[a-f0-9]{64}$/.test(item)) raw(5, unhex(item));
      else if (/^T-[A-F0-9]{22}$/.test(item)) raw(8, unhex(item.slice(2)));
      else if (
        /^(?:[A-Za-z0-9_-]{43}|[A-Za-z0-9_-]{86})$/.test(item) &&
        b64(unb64(item)) === item
      )
        raw(item.length === 43 ? 6 : 7, unb64(item));
      else {
        const bytes = utf8.encode(item);
        out.push(0);
        uint(bytes.length);
        out.push(...bytes);
      }
    } else if (
      typeof item === 'number' &&
      Number.isSafeInteger(item) &&
      item >= 0
    ) {
      out.push(1);
      uint(item);
    } else if (Array.isArray(item)) {
      out.push(2);
      uint(item.length);
      item.forEach((value) => write(value, depth + 1));
    } else if (item && typeof item === 'object') {
      const object = item as Record<string, unknown>;
      const entries = Object.entries(object);
      const layout = layouts.find(
        ({ constants, fields }) =>
          entries.length === Object.keys(constants).length + fields.length &&
          Object.entries(constants).every(
            ([key, value]) => object[key] === value,
          ) &&
          fields.every((key) => Object.hasOwn(object, key)),
      );
      if (layout) {
        out.push(layout.tag);
        for (const key of layout.fields) write(object[key], depth + 1);
        return;
      }
      out.push(3);
      uint(entries.length);
      for (const [key, value] of entries) {
        write(key, depth + 1);
        write(value, depth + 1);
      }
    } else if (item === false) out.push(9);
    else if (item === true) out.push(10);
    else if (item === null) out.push(11);
    else throw error();
    if (out.length > MAX_OPTICAL_BYTES)
      throw new Error(
        'QR exceeds the supported optical capacity. Nothing truncated.',
      );
  }
  write(value, 0);
  return Uint8Array.from(out);
}
function unbinary(bytes: Uint8Array): unknown {
  let cursor = 0,
    nodes = 0;
  function take(length: number) {
    if (length > bytes.length - cursor) throw error();
    const result = bytes.slice(cursor, cursor + length);
    cursor += length;
    return result;
  }
  function byte() {
    if (cursor >= bytes.length) throw error();
    return bytes[cursor++]!;
  }
  function uint() {
    let value = 0;
    for (let i = 0; i < 8; i++) {
      const digit = byte();
      value += (digit % 128) * 128 ** i;
      if (!Number.isSafeInteger(value)) throw error();
      if (digit < 128) {
        if (i && digit === 0) throw error();
        return value;
      }
    }
    throw error();
  }
  function read(depth: number): unknown {
    if (depth > 10 || ++nodes > 1000) throw error();
    const tag = byte();
    if (tag >= 32 && tag < 32 + words.length) return words[tag - 32];
    const layout = layouts.find((layout) => layout.tag === tag);
    if (layout)
      return {
        ...layout.constants,
        ...Object.fromEntries(
          layout.fields.map((key) => [key, read(depth + 1)]),
        ),
      };
    if (tag === 0)
      return new TextDecoder('utf-8', { fatal: true }).decode(take(uint()));
    if (tag === 1) return uint();
    if (tag === 2 || tag === 3) {
      const count = uint();
      if (count > bytes.length - cursor) throw error();
      if (tag === 2)
        return Array.from({ length: count }, () => read(depth + 1));
      const object: Record<string, unknown> = Object.create(null) as Record<
        string,
        unknown
      >;
      for (let i = 0; i < count; i++) {
        const key = read(depth + 1);
        if (
          typeof key !== 'string' ||
          ['__proto__', 'constructor', 'prototype'].includes(key) ||
          Object.hasOwn(object, key)
        )
          throw error();
        object[key] = read(depth + 1);
      }
      return object;
    }
    if (tag === 4) {
      const id = hex(take(16));
      return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
    }
    if (tag === 5) return hex(take(32));
    if (tag === 6 || tag === 7) return b64(take(tag === 6 ? 32 : 64));
    if (tag === 8) return 'T-' + hex(take(11)).toUpperCase();
    if (tag === 9) return false;
    if (tag === 10) return true;
    if (tag === 11) return null;
    throw error();
  }
  const result = read(0);
  if (cursor !== bytes.length) throw error();
  return result;
}
export function packOptical(text: string): string {
  if (utf8.encode(text).length > MAX_OPTICAL_BYTES)
    throw new Error(
      'QR exceeds the supported 900-byte capacity. Use bounded sync batches or a signed file; nothing truncated.',
    );
  const encoded = PREFIX + base45(binary(JSON.parse(text)));
  if (encoded.length > MAX_OPTICAL_BYTES)
    throw new Error(
      'QR exceeds the supported 900-byte optical capacity. Nothing truncated.',
    );
  return encoded;
}
export function unpackOptical(text: string): string {
  if (!text.startsWith('ELQ')) return text;
  if (!text.startsWith(PREFIX))
    throw new Error(
      'Unsupported optical QR version. Update EntryLoop on both devices or use a compatibility JSON QR.',
    );
  if (text.length > MAX_OPTICAL_BYTES)
    throw new Error('QR exceeds the supported 900-byte optical capacity.');
  try {
    const value = unbinary(unbase45(text.slice(PREFIX.length)));
    const json = JSON.stringify(value);
    if (
      utf8.encode(json).length > MAX_OPTICAL_BYTES ||
      packOptical(json) !== text
    )
      throw error();
    return json;
  } catch (cause) {
    throw new Error(error().message, { cause });
  }
}
