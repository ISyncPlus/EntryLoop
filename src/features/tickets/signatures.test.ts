import { describe, expect, it } from 'vitest';
import {
  generateSigningKey,
  signTicket,
  verifyTicket,
  signPackage,
  inspectPackage,
  keyFingerprint,
} from './signatures';
import { eventMetadataSchema } from '../events/models';
const eventId = '33333333-3333-4333-8333-333333333333';
const otherId = '44444444-4444-4444-8444-444444444444';
const metadata = eventMetadataSchema.parse({
  id: eventId,
  name: 'Open Room',
  date: '2026-11-12',
  location: 'Lagos',
  description: 'An event.',
  revision: 1,
});
describe('native WebCrypto ticket signatures', () => {
  it('uses non-exportable private keys, a public fingerprint and verifiable P-256 signatures', async () => {
    const keys = await generateSigningKey();
    expect(keys.privateKey.extractable).toBe(false);
    await expect(
      crypto.subtle.exportKey('jwk', keys.privateKey),
    ).rejects.toThrow();
    expect(await keyFingerprint(keys.publicKey)).toBe(keys.fingerprint);
    const token = await signTicket(eventId, 'T-123', keys.privateKey);
    expect(new TextEncoder().encode(token).length).toBeLessThan(512);
    expect(await verifyTicket(token, eventId, keys.publicKey)).toMatchObject({
      k: 'ELT',
      v: 1,
      e: eventId,
      t: 'T-123',
    });
    expect(Object.keys(JSON.parse(token) as object).sort()).toEqual([
      'e',
      'k',
      's',
      't',
      'v',
    ]);
  });
  it('rejects altered tickets, foreign keys and wrong-event tickets', async () => {
    const keys = await generateSigningKey();
    const foreign = await generateSigningKey();
    const token = await signTicket(eventId, 'T-123', keys.privateKey);
    await expect(
      verifyTicket(token.replace('T-123', 'T-124'), eventId, keys.publicKey),
    ).rejects.toThrow('Invalid ticket signature');
    await expect(
      verifyTicket(token, eventId, foreign.publicKey),
    ).rejects.toThrow('signature');
    await expect(verifyTicket(token, otherId, keys.publicKey)).rejects.toThrow(
      'Wrong event',
    );
  });
  it.each(['broken', 'null', '{}', '{"k":"ELT","v":99}', 'x'.repeat(513)])(
    'rejects invalid/oversized token %s',
    async (text) => {
      const keys = await generateSigningKey();
      await expect(
        verifyTicket(text, eventId, keys.publicKey),
      ).rejects.toThrow();
    },
  );
  it('verifies strict signed packages, rejects tampering/private-key injection and requires domain separation', async () => {
    const keys = await generateSigningKey();
    const text = await signPackage(
      {
        kind: 'entryloop-event',
        version: 1,
        event: metadata,
        publicKey: keys.publicKey,
        ticketIds: ['T-123'],
      },
      keys.privateKey,
    );
    const inspected = await inspectPackage(text);
    expect(inspected.fingerprint).toBe(keys.fingerprint);
    await expect(
      inspectPackage(text.replace('Open Room', 'Evil Room')),
    ).rejects.toThrow('signature');
    const pkg = JSON.parse(text) as Record<string, unknown>;
    await expect(
      inspectPackage(JSON.stringify({ ...pkg, privateKey: 'not-allowed' })),
    ).rejects.toThrow('schema');
    await expect(
      inspectPackage(
        JSON.stringify({
          ...pkg,
          publicKey: { ...keys.publicKey, d: 'secret' },
        }),
      ),
    ).rejects.toThrow('schema');
    await expect(
      verifyTicket(
        JSON.stringify({
          k: 'ELT',
          v: 1,
          e: eventId,
          t: 'T-123',
          s: pkg.signature,
        }),
        eventId,
        keys.publicKey,
      ),
    ).rejects.toThrow('signature');
  });
});
