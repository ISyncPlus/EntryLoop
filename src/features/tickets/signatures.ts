import {
  publicKeySchema,
  ticketTokenSchema,
  packageSchema,
  MAX_PACKAGE_BYTES,
} from '../events/models';
import type { PublicKey, TicketToken, EventPackage } from '../events/models';
import { canonical, unsigned } from '../security/models';
const encoder = new TextEncoder();
const curve = { name: 'ECDSA', namedCurve: 'P-256' } as const;
const algorithm = { name: 'ECDSA', hash: 'SHA-256' } as const;
function cryptoAPI(): SubtleCrypto {
  if (!globalThis.crypto?.subtle)
    throw new Error(
      'Cryptographic operations require HTTPS or localhost and WebCrypto support.',
    );
  return crypto.subtle;
}
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
function bytes(encoded: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(
    atob(encoded.replaceAll('-', '+').replaceAll('_', '/') + '=='),
    (value) => value.charCodeAt(0),
  );
}
export async function generateSigningKey(): Promise<{
  privateKey: CryptoKey;
  publicKey: PublicKey;
  fingerprint: string;
}> {
  const pair = await cryptoAPI().generateKey(curve, false, ['sign', 'verify']);
  const exported = await cryptoAPI().exportKey('jwk', pair.publicKey);
  const publicKey = publicKeySchema.parse({
    kty: exported.kty,
    crv: exported.crv,
    x: exported.x,
    y: exported.y,
  });
  return {
    privateKey: pair.privateKey,
    publicKey,
    fingerprint: await keyFingerprint(publicKey),
  };
}
export async function keyFingerprint(key: PublicKey): Promise<string> {
  const parsed = publicKeySchema.parse(key);
  const digest = await cryptoAPI().digest(
    'SHA-256',
    encoder.encode(
      JSON.stringify({
        kty: parsed.kty,
        crv: parsed.crv,
        x: parsed.x,
        y: parsed.y,
      }),
    ),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
export async function sign(message: string, key: CryptoKey): Promise<string> {
  return base64url(
    new Uint8Array(
      await cryptoAPI().sign(algorithm, key, encoder.encode(message)),
    ),
  );
}
export async function verify(
  message: string,
  signature: string,
  publicKey: PublicKey,
): Promise<boolean> {
  const parsed = publicKeySchema.parse(publicKey);
  const key = await cryptoAPI().importKey('jwk', parsed, curve, false, [
    'verify',
  ]);
  return cryptoAPI().verify(
    algorithm,
    key,
    bytes(signature),
    encoder.encode(message),
  );
}
function ticketMessage(eventId: string, ticketId: string) {
  return 'ENTRYLOOP:TICKET:1\n' + JSON.stringify({ e: eventId, t: ticketId });
}
export async function signTicket(
  eventId: string,
  ticketId: string,
  key: CryptoKey,
): Promise<string> {
  const s = await sign(ticketMessage(eventId, ticketId), key);
  return JSON.stringify(
    ticketTokenSchema.parse({ k: 'ELT', v: 1, e: eventId, t: ticketId, s }),
  );
}
export async function verifyTicket(
  text: string,
  eventId: string,
  key: PublicKey,
): Promise<TicketToken> {
  if (encoder.encode(text).length > 512)
    throw new Error('Ticket exceeds the supported 512-byte capacity.');
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('Ticket is not valid JSON.');
  }
  const parsed = ticketTokenSchema.safeParse(input);
  if (!parsed.success)
    throw new Error('Invalid or unsupported EntryLoop ticket format.');
  const ticket = parsed.data;
  if (ticket.e !== eventId)
    throw new Error('Wrong event. This ticket belongs to another event.');
  if (!(await verify(ticketMessage(ticket.e, ticket.t), ticket.s, key)))
    throw new Error('Invalid ticket signature. Admission rejected.');
  return ticket;
}
type PackageBody = EventPackage extends infer P
  ? P extends EventPackage
    ? Omit<P, 'signature'>
    : never
  : never;
export function packageMessage(pkg: PackageBody): string {
  if (pkg.version === 2)
    return 'ENTRYLOOP:EVENT:2\n' + canonical(unsigned(pkg));
  const { id, name, date, location, description, revision } = pkg.event;
  const { kty, crv, x, y } = pkg.publicKey;
  return (
    'ENTRYLOOP:EVENT:1\n' +
    JSON.stringify({
      kind: pkg.kind,
      version: pkg.version,
      event: { id, name, date, location, description, revision },
      publicKey: { kty, crv, x, y },
      ticketIds: [...pkg.ticketIds].sort(),
    })
  );
}
export async function signPackage(
  body: PackageBody,
  key: CryptoKey,
): Promise<string> {
  const result = JSON.stringify(
    packageSchema.parse({
      ...body,
      signature: await sign(packageMessage(body), key),
    }),
  );
  if (encoder.encode(result).length > MAX_PACKAGE_BYTES)
    throw new Error('Event package exceeds 1 MiB. Nothing exported.');
  return result;
}
export async function inspectPackage(
  text: string,
): Promise<{ package: EventPackage; fingerprint: string }> {
  if (encoder.encode(text).length > MAX_PACKAGE_BYTES)
    throw new Error('Event package exceeds 1 MiB. Nothing imported.');
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('Event package is not valid JSON.');
  }
  const result = packageSchema.safeParse(input);
  if (!result.success)
    throw new Error(
      'Invalid event package schema or version. Private keys and unknown fields are forbidden.',
    );
  const pkg = result.data;
  if (!(await verify(packageMessage(pkg), pkg.signature, pkg.publicKey)))
    throw new Error('Event package signature does not match its contents.');
  return { package: pkg, fingerprint: await keyFingerprint(pkg.publicKey) };
}
