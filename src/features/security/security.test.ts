import { afterEach, describe, expect, it, vi } from 'vitest';
import Dexie from 'dexie';
import { EntryLoopDB } from '../check-in/persistence/database';
import {
  createEvent,
  addAttendees,
  issueTickets,
  exportEventPackage,
  importEventPackage,
  admitSignedTicket,
} from '../events/repository';
import {
  generateSigningKey,
  sign,
  signPackage,
  inspectPackage,
} from '../tickets/signatures';
import {
  authorize,
  enrollmentRequest,
  identity,
  importOwnCredential,
  currentPolicy,
  changePolicy,
  importPolicy,
  credentialHash,
} from './authority';
import { trustedSnapshot, mergeTrusted, operationMessage } from './operations';
import {
  acceptFrame,
  frameText,
  startReceive,
  missingIndices,
  missingRequest,
  parseFrame,
  convergenceStatus,
  MAX_FRAME_BYTES,
} from './exchange';
import { canonical, securityMessage, unsigned } from './models';
import type { SignedOperation } from './models';
const databases: EntryLoopDB[] = [];
function database(profile = crypto.randomUUID().replaceAll('-', '')) {
  const db = new EntryLoopDB(profile);
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases) await db.delete();
  databases.length = 0;
});
async function setup(count = 6) {
  const org = database(),
    a = database(),
    b = database();
  const event = await createEvent(org, {
    name: 'Security lab',
    date: '2026-11-12',
    location: 'Lagos',
    description: '',
  });
  await addAttendees(
    org,
    event.id,
    Array.from({ length: count }, (_, i) => ({
      name: `Guest ${i}`,
      email: `guest${i}@example.com`,
    })),
  );
  await issueTickets(
    org,
    event.id,
    (await org.attendees.toArray()).map((a) => a.id),
  );
  const pkg = await exportEventPackage(org, event.id);
  for (const db of [a, b]) await importEventPackage(db, pkg, event.fingerprint);
  const tickets = await org.issuedTickets.toArray();
  return { org, a, b, event, tickets, pkg };
}
async function enroll(org: EntryLoopDB, scanner: EntryLoopDB, eventId: string) {
  const own = await identity(scanner);
  const request = await enrollmentRequest(scanner, eventId, 'North entrance');
  const credential = await authorize(org, eventId, request, own.fingerprint);
  if (org !== scanner) await importOwnCredential(scanner, eventId, credential);
  return credential;
}
async function pair() {
  const data = await setup();
  for (const scanner of [data.a, data.b])
    await enroll(data.org, scanner, data.event.id);
  return data;
}
async function transfer(
  sender: EntryLoopDB,
  receiver: EntryLoopDB,
  eventId: string,
) {
  const request = await startReceive(receiver, eventId);
  const outgoing = (
    await acceptFrame(sender, eventId, frameText(request.request))
  ).session;
  let incoming = (
    await acceptFrame(receiver, eventId, frameText(outgoing.offer!))
  ).session;
  for (const text of Object.values(outgoing.frames))
    incoming = (await acceptFrame(receiver, eventId, text)).session;
  expect(incoming.ack).toBeDefined();
  const acknowledged = (
    await acceptFrame(sender, eventId, frameText(incoming.ack!))
  ).session;
  return { outgoing: acknowledged, incoming };
}
describe('offline scanner authorization and signed admissions', () => {
  it('distinguishes profiles/preparation from authorization and keeps device keys non-exportable', async () => {
    const { org, a, b, event, tickets } = await setup();
    await expect(
      admitSignedTicket(a, event.id, tickets[0]!.payload),
    ).rejects.toThrow('not authorized');
    const credential = await enroll(org, a, event.id);
    const own = await identity(a);
    expect(own.privateKey.extractable).toBe(false);
    await expect(
      crypto.subtle.exportKey('jwk', own.privateKey),
    ).rejects.toThrow();
    expect(own.scannerId).not.toBe((await a.scanner()).id);
    await expect(importOwnCredential(b, event.id, credential)).rejects.toThrow(
      'another scanner',
    );
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    expect((await trustedSnapshot(a, event.id)).state.attendance).toBe(1);
    expect(await a.operationProofs.count()).toBe(1);
  });
  it('requires explicit fingerprint confirmation and rejects modified enrollment requests and forged credentials', async () => {
    const { org, a, event } = await setup();
    const request = await enrollmentRequest(a, event.id, 'East');
    await expect(authorize(org, event.id, request, 'bad')).rejects.toThrow(
      'fingerprint',
    );
    const own = await identity(a);
    await expect(
      authorize(org, event.id, { ...request, l: 'West' }, own.fingerprint),
    ).rejects.toThrow('proof');
    const credential = await authorize(org, event.id, request, own.fingerprint);
    await expect(
      importOwnCredential(a, event.id, { ...credential, s: 'A'.repeat(86) }),
    ).rejects.toThrow('organizer signature');
    expect(await a.credentials.count()).toBe(0);
  });
  it('is event-scoped and rejects unauthorized and forged operation authors before persistence', async () => {
    const { org, a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const snap = await trustedSnapshot(a, event.id);
    await expect(
      mergeTrusted(b, event.id, snap.operations, []),
    ).rejects.toThrow('Unauthorized');
    const evil = await generateSigningKey();
    const forgedCredential = { ...snap.credentials[0]!, k: evil.publicKey };
    await expect(
      mergeTrusted(b, event.id, snap.operations, [forgedCredential]),
    ).rejects.toThrow('organizer signature');
    const other = await createEvent(org, {
      name: 'Other',
      date: '2026-11-13',
      location: 'Lagos',
      description: '',
    });
    await expect(
      authorize(
        org,
        other.id,
        await enrollmentRequest(a, event.id, 'Gate'),
        (await identity(a)).fingerprint,
      ),
    ).rejects.toThrow('Wrong event');
    expect(await b.records(event.id)).toHaveLength(0);
  });
  it('rejects modified ticket, time, scanner, event and signature content atomically', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const snap = await trustedSnapshot(a, event.id);
    const original = snap.operations[0]!;
    const variants: SignedOperation[] = [
      {
        ...original,
        record: { ...original.record, ticketId: tickets[1]!.ticketId },
      },
      {
        ...original,
        record: { ...original.record, recordedAt: '2000-01-01T00:00:00.000Z' },
      },
      {
        ...original,
        record: { ...original.record, scannerId: crypto.randomUUID() },
      },
      {
        ...original,
        record: { ...original.record, eventId: crypto.randomUUID() },
      },
      { ...original, proof: { ...original.proof, signature: 'A'.repeat(86) } },
    ];
    for (const candidate of variants) {
      await expect(
        mergeTrusted(b, event.id, [original, candidate], snap.credentials),
      ).rejects.toThrow();
      expect(await b.records(event.id)).toHaveLength(0);
    }
  });
  it('preserves concurrent conflicts, repeat imports and order-independent content roots across authorized scanners', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    await admitSignedTicket(b, event.id, tickets[0]!.payload);
    await admitSignedTicket(a, event.id, tickets[1]!.payload);
    const sa = await trustedSnapshot(a, event.id),
      sb = await trustedSnapshot(b, event.id);
    expect(
      await mergeTrusted(
        b,
        event.id,
        [...sa.operations].reverse(),
        sa.credentials,
      ),
    ).toMatchObject({ imported: 2, skipped: 0 });
    expect(
      await mergeTrusted(b, event.id, sa.operations, sa.credentials),
    ).toMatchObject({ imported: 0, skipped: 2 });
    await mergeTrusted(a, event.id, sb.operations, sb.credentials);
    const aa = await trustedSnapshot(a, event.id),
      bb = await trustedSnapshot(b, event.id);
    expect(aa.root).toBe(bb.root);
    expect(aa.state).toEqual(bb.state);
    expect(aa.state.attendance).toBe(2);
    expect(aa.state.conflicts).toHaveLength(1);
  });
  it('rejects validly signed operation ID reuse without overwriting evidence, including proof metadata', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const snap = await trustedSnapshot(a, event.id),
      original = snap.operations[0]!,
      own = await identity(a);
    await mergeTrusted(b, event.id, snap.operations, snap.credentials);
    const changed = {
      ...original,
      record: { ...original.record, ticketId: tickets[1]!.ticketId },
    };
    changed.proof = {
      ...changed.proof,
      signature: await sign(operationMessage(changed), own.privateKey),
    };
    await expect(
      mergeTrusted(b, event.id, [changed], snap.credentials),
    ).rejects.toThrow('Operation ID collision');
    expect((await trustedSnapshot(b, event.id)).operations).toEqual(
      snap.operations,
    );
  });
  it('deduplicates different valid ECDSA signatures over the same canonical content', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const snap = await trustedSnapshot(a, event.id),
      original = snap.operations[0]!;
    const resigned = {
      ...original,
      proof: {
        ...original.proof,
        signature: await sign(
          operationMessage(original),
          (await identity(a)).privateKey,
        ),
      },
    };
    await mergeTrusted(b, event.id, [original], snap.credentials);
    expect(
      await mergeTrusted(b, event.id, [resigned], snap.credentials),
    ).toMatchObject({ skipped: 1, imported: 0 });
    expect((await trustedSnapshot(b, event.id)).root).toBe(snap.root);
    expect((await b.operationProofs.toArray())[0]!.signature).toBe(
      original.proof.signature,
    );
  });
  it('never promotes old unsigned records, blocks known local duplicate admission and preserves evidence', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const snap = await trustedSnapshot(a, event.id),
      original = snap.operations[0]!;
    await b.operations.add(original.record);
    expect(await trustedSnapshot(b, event.id)).toMatchObject({
      legacy: 1,
      state: { attendance: 0 },
    });
    await expect(
      mergeTrusted(b, event.id, [original], snap.credentials),
    ).rejects.toThrow('cannot be promoted');
    await expect(
      admitSignedTicket(b, event.id, tickets[0]!.payload),
    ).rejects.toThrow('already admitted');
    await expect(b.importTransfer(event.id, '{}')).rejects.toThrow(
      'Unsigned transfers',
    );
    await expect(b.resetEvent(event.id)).rejects.toThrow('synthetic');
    expect(await b.operationProofs.count()).toBe(0);
  });
  it('enforces signed monotonic revocation, retains old evidence and makes stale offline behavior explicit', async () => {
    const { org, a, b, event, tickets, pkg } = await pair();
    const ca = await a.credentials.toCollection().first();
    const oldPolicy = (await currentPolicy(org, event.id))!;
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const oldSnapshot = await trustedSnapshot(a, event.id);
    await mergeTrusted(
      b,
      event.id,
      oldSnapshot.operations,
      oldSnapshot.credentials,
    );
    const policy = await changePolicy(org, event.id, { scanner: ca!.d });
    // A disconnected scanner still using epoch 1 cannot know about epoch 2.
    await admitSignedTicket(a, event.id, tickets[1]!.payload);
    await importPolicy(b, event.id, policy);
    expect(await trustedSnapshot(b, event.id)).toMatchObject({
      excluded: 1,
      state: { attendance: 0 },
    });
    expect(await b.records(event.id)).toHaveLength(1);
    await expect(
      mergeTrusted(
        b,
        event.id,
        oldSnapshot.operations,
        oldSnapshot.credentials,
      ),
    ).rejects.toThrow('revoked');
    await expect(importPolicy(b, event.id, oldPolicy)).rejects.toThrow('Stale');
    await expect(
      importPolicy(b, event.id, { ...policy, epoch: policy.epoch + 1 }),
    ).rejects.toThrow('signature');
    await importPolicy(a, event.id, policy);
    await expect(
      admitSignedTicket(a, event.id, tickets[2]!.payload),
    ).rejects.toThrow('revoked');
    await expect(enroll(org, a, event.id)).rejects.toThrow('revoked');
    await expect(importEventPackage(b, pkg, event.fingerprint)).rejects.toThrow(
      'Stale',
    );
    const rootKey = (await org.signingKeys.get(event.id))!.privateKey;
    const removal = { ...policy, epoch: policy.epoch + 1, revokedScanners: [] };
    removal.signature = await sign(securityMessage('POLICY', removal), rootKey);
    await expect(importPolicy(b, event.id, removal)).rejects.toThrow(
      'cannot be removed',
    );
  });
  it('revokes tickets without deleting immutable admissions and updates policies without changing event metadata revision', async () => {
    const { org, a, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    await changePolicy(org, event.id, { ticket: tickets[0]!.ticketId });
    await importEventPackage(
      a,
      await exportEventPackage(org, event.id),
      event.fingerprint,
    );
    expect(await trustedSnapshot(a, event.id)).toMatchObject({
      excluded: 1,
      state: { attendance: 0 },
    });
    await expect(
      admitSignedTicket(a, event.id, tickets[0]!.payload),
    ).rejects.toThrow();
    expect(await a.records(event.id)).toHaveLength(1);
  });
  it('does not trust legacy version-1 packages or allow policy downgrades', async () => {
    const { org, a, event, pkg, tickets } = await setup();
    const parsed = (await inspectPackage(pkg)).package;
    const legacy = await signPackage(
      {
        kind: parsed.kind,
        version: 1,
        event: parsed.event,
        publicKey: parsed.publicKey,
        ticketIds: parsed.ticketIds,
      },
      (await org.signingKeys.get(event.id))!.privateKey,
    );
    await expect(
      importEventPackage(a, legacy, event.fingerprint),
    ).rejects.toThrow('downgrade');
    const old = database();
    await importEventPackage(old, legacy, event.fingerprint);
    expect(await currentPolicy(old, event.id)).toBeUndefined();
    await expect(
      admitSignedTicket(old, event.id, tickets[0]!.payload),
    ).rejects.toThrow('not authorized');
    await importEventPackage(old, pkg, event.fingerprint);
    await enroll(org, old, event.id);
    await admitSignedTicket(old, event.id, tickets[0]!.payload);
  });
  it('migrates version-2 storage without changing keys, tickets or unsigned historical records', async () => {
    const profile = crypto.randomUUID().replaceAll('-', '');
    const old = new Dexie(`entryloop-v1-${profile}`);
    old.version(2).stores({
      operations: '[eventId+operationId],eventId',
      devices: 'id',
      events: 'id,role,date',
      attendees: 'id,eventId,&[eventId+email],&[eventId+ticketId]',
      issuedTickets: '[eventId+ticketId],eventId,attendeeId',
      ticketCatalog: '[eventId+ticketId],eventId',
      signingKeys: 'eventId',
    });
    const keys = await generateSigningKey(),
      id = crypto.randomUUID();
    await old
      .table('signingKeys')
      .add({ eventId: id, privateKey: keys.privateKey });
    old.close();
    const migrated = database(profile);
    expect((await migrated.signingKeys.get(id))!.privateKey.extractable).toBe(
      false,
    );
    expect(await migrated.operationProofs.count()).toBe(0);
    expect(await migrated.scannerKeys.count()).toBe(0);
  });
});
describe('bounded resumable optical exchange', () => {
  it('automatically batches, stages out of order, recovers after reopen, requests missing frames and verifies convergence', async () => {
    const { a, b, event, tickets } = await pair();
    for (const ticket of tickets)
      await admitSignedTicket(a, event.id, ticket.payload);
    const request = await startReceive(b, event.id);
    const out = (await acceptFrame(a, event.id, frameText(request.request)))
      .session;
    expect(Object.values(out.frames)).toHaveLength(3);
    for (const text of [
      frameText(request.request),
      frameText(out.offer!),
      ...Object.values(out.frames),
    ])
      expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(
        MAX_FRAME_BYTES,
      );
    await acceptFrame(b, event.id, frameText(out.offer!));
    await acceptFrame(b, event.id, out.frames['2']!);
    let incoming = (await acceptFrame(b, event.id, out.frames['0']!)).session;
    expect(missingIndices(incoming)).toEqual([1]);
    expect(await b.records(event.id)).toHaveLength(0);
    b.close();
    const resumed = database(b.name.replace('entryloop-v1-', ''));
    const missing = await missingRequest(resumed, incoming.id);
    expect((await acceptFrame(a, event.id, missing)).resend).toEqual([1]);
    incoming = (await acceptFrame(resumed, event.id, out.frames['1']!)).session;
    expect(incoming.result).toMatchObject({
      transferred: 6,
      imported: 6,
      skipped: 0,
      rejected: 0,
    });
    const done = (await acceptFrame(a, event.id, frameText(incoming.ack!)))
      .session;
    expect(await convergenceStatus(a, done)).toContain(
      'Matching operation identities',
    );
    expect((await trustedSnapshot(resumed, event.id)).root).toBe(
      (await trustedSnapshot(a, event.id)).root,
    );
    expect(
      (await acceptFrame(resumed, event.id, out.frames['1']!)).session.result,
    ).toEqual(incoming.result);
  });
  it('requires the signed receiver request and offer before batches; rejects forged frames and acknowledgments', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const request = await startReceive(b, event.id);
    const out = (await acceptFrame(a, event.id, frameText(request.request)))
      .session;
    await expect(acceptFrame(b, event.id, out.frames['0']!)).rejects.toThrow(
      'offer',
    );
    const offer = { ...out.offer!, z: 'A'.repeat(86) };
    await expect(acceptFrame(b, event.id, frameText(offer))).rejects.toThrow(
      'signature',
    );
    await acceptFrame(b, event.id, frameText(out.offer!));
    const frame = parseFrame(out.frames['0']!);
    await expect(
      acceptFrame(b, event.id, JSON.stringify({ ...frame, z: 'A'.repeat(86) })),
    ).rejects.toThrow('signature');
    const incoming = (await acceptFrame(b, event.id, out.frames['0']!)).session;
    await expect(
      acceptFrame(
        a,
        event.id,
        frameText({ ...incoming.ack!, z: 'A'.repeat(86) }),
      ),
    ).rejects.toThrow('signature');
    expect((await a.syncSessions.get(out.id))?.ack).toBeUndefined();
  });
  it('preserves concurrent admissions, needs reverse exchange for extras and does not equate counts with convergence', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    await admitSignedTicket(b, event.id, tickets[0]!.payload);
    const oneWay = await transfer(a, b, event.id);
    expect(await convergenceStatus(a, oneWay.outgoing)).toContain(
      'Logs differ',
    );
    const reverse = await transfer(b, a, event.id);
    expect(await convergenceStatus(b, reverse.outgoing)).toContain(
      'Matching operation identities',
    );
    const aa = await trustedSnapshot(a, event.id),
      bb = await trustedSnapshot(b, event.id);
    expect(aa.root).toBe(bb.root);
    expect(aa.state.conflicts).toHaveLength(1);
    await admitSignedTicket(a, event.id, tickets[1]!.payload);
    expect(await convergenceStatus(a, reverse.incoming)).toContain(
      'Logs differ',
    );
  });
  it('acknowledges an empty snapshot and resumes replayed receiver requests without generating a new snapshot', async () => {
    const { a, b, event } = await pair();
    const request = await startReceive(b, event.id);
    const first = (await acceptFrame(a, event.id, frameText(request.request)))
      .session;
    const repeated = (
      await acceptFrame(a, event.id, frameText(request.request))
    ).session;
    expect(repeated).toEqual(first);
    const incoming = (await acceptFrame(b, event.id, frameText(first.offer!)))
      .session;
    expect(incoming.ack).toBeDefined();
    expect(incoming.result?.transferred).toBe(0);
    const done = (await acceptFrame(a, event.id, frameText(incoming.ack!)))
      .session;
    expect(await convergenceStatus(a, done)).toContain(
      'Matching operation identities',
    );
  });
  it('rejects stale-policy transfers and wrong-event requests, retaining previous receipts as historical', async () => {
    const { org, a, b, event, tickets } = await pair();
    const completed = await transfer(a, b, event.id);
    const staleRequest = await startReceive(b, event.id);
    const policy = await changePolicy(org, event.id, {
      ticket: tickets[0]!.ticketId,
    });
    await importPolicy(a, event.id, policy);
    await expect(
      acceptFrame(a, event.id, frameText(staleRequest.request)),
    ).rejects.toThrow('policies differ');
    expect(await convergenceStatus(a, completed.outgoing)).toContain(
      'Historical receipt',
    );
    const fake = {
      ...staleRequest.request,
      d: { ...staleRequest.request.d, e: crypto.randomUUID() },
    };
    await expect(acceptFrame(a, event.id, frameText(fake))).rejects.toThrow(
      'Wrong event',
    );
  });
  it('rejects content/identity manifest mismatches even if every frame has a valid sender signature', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const request = await startReceive(b, event.id),
      out = (await acceptFrame(a, event.id, frameText(request.request)))
        .session;
    const body = { ...out.offer!, h: '0'.repeat(64) };
    const unsignedBody = Object.fromEntries(
      Object.entries(body).filter(([k]) => k !== 'z'),
    );
    body.z = await sign(
      'ENTRYLOOP:SYNC:2\n' + canonical(unsignedBody),
      (await identity(a)).privateKey,
    );
    await acceptFrame(b, event.id, frameText(body));
    await expect(acceptFrame(b, event.id, out.frames['0']!)).rejects.toThrow(
      'manifest',
    );
    expect(await b.records(event.id)).toHaveLength(0);
  });
  it('rejects same-index divergent signed frames without replacing staged evidence', async () => {
    const { a, b, event, tickets } = await pair();
    for (const t of tickets) await admitSignedTicket(a, event.id, t.payload);
    const request = await startReceive(b, event.id),
      out = (await acceptFrame(a, event.id, frameText(request.request)))
        .session;
    await acceptFrame(b, event.id, frameText(out.offer!));
    await acceptFrame(b, event.id, out.frames['0']!);
    const frame = parseFrame(out.frames['1']!);
    if (frame.k !== 'data') throw new Error('Expected data');
    const altered = { ...frame, i: 0 };
    altered.z = await sign(
      'ENTRYLOOP:SYNC:2\n' +
        canonical(
          Object.fromEntries(
            Object.entries(altered).filter(([k]) => k !== 'z'),
          ),
        ),
      (await identity(a)).privateKey,
    );
    await expect(acceptFrame(b, event.id, frameText(altered))).rejects.toThrow(
      'Conflicting frame',
    );
    expect((await b.syncSessions.get(out.id))?.frames['0']).toBe(
      out.frames['0'],
    );
  });
  it('rejects corrupted/unsupported/over-capacity payloads with explicit errors', () => {
    expect(() => parseFrame('{')).toThrow('Corrupted');
    expect(() => parseFrame('{"v":99}')).toThrow('Unsupported');
    expect(() => parseFrame('{}')).toThrow('schema');
    expect(() => parseFrame('x'.repeat(901))).toThrow('900-byte');
  });
  it('persists scanner identity and signed admissions across database restarts', async () => {
    const { a, event, tickets } = await pair();
    const own = await identity(a);
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const root = (await trustedSnapshot(a, event.id)).root;
    a.close();
    const reopened = database(a.name.replace('entryloop-v1-', ''));
    expect((await identity(reopened)).scannerId).toBe(own.scannerId);
    expect((await trustedSnapshot(reopened, event.id)).root).toBe(root);
    await admitSignedTicket(reopened, event.id, tickets[1]!.payload);
    expect((await trustedSnapshot(reopened, event.id)).state.attendance).toBe(
      2,
    );
  });
  it('binds proofs to the exact organizer credential content', async () => {
    const { a, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const snap = await trustedSnapshot(a, event.id);
    expect(snap.operations[0]!.proof.credentialHash).toBe(
      await credentialHash(snap.credentials[0]!),
    );
    expect(
      await credentialHash({ ...snap.credentials[0]!, s: 'A'.repeat(86) }),
    ).toBe(await credentialHash(snap.credentials[0]!));
    expect(canonical(unsigned(snap.credentials[0]!))).not.toContain(
      'privateKey',
    );
  });
});

describe('security edge regressions', () => {
  it('merges trusted admissions alongside historical evidence without including unsigned records in trusted totals', async () => {
    const { a, b, event, tickets } = await pair();
    await b.operations.add({
      operationId: crypto.randomUUID(),
      eventId: event.id,
      ticketId: tickets[0]!.ticketId,
      scannerId: crypto.randomUUID(),
      recordedAt: '2026-01-01T00:00:00.000Z',
    });
    await admitSignedTicket(a, event.id, tickets[1]!.payload);
    const source = await trustedSnapshot(a, event.id);
    expect(
      await mergeTrusted(b, event.id, source.operations, source.credentials),
    ).toEqual({ transferred: 1, imported: 1, skipped: 0, rejected: 0 });
    const destination = await trustedSnapshot(b, event.id);
    expect(destination.legacy).toBe(1);
    expect(destination.state.attendance).toBe(1);
    expect(await b.records(event.id)).toHaveLength(2);
  });

  it('does not leave a partially created event when initial policy signing fails', async () => {
    const db = database();
    const failure = vi
      .spyOn(crypto.subtle, 'sign')
      .mockRejectedValueOnce(new Error('Policy signing unavailable'));
    await expect(
      createEvent(db, {
        name: 'Atomic event',
        date: '2026-11-12',
        location: 'Lagos',
        description: '',
      }),
    ).rejects.toThrow('unavailable');
    failure.mockRestore();
    expect(await db.events.count()).toBe(0);
    expect(await db.signingKeys.count()).toBe(0);
    expect(await db.policies.count()).toBe(0);
  });

  it('preserves transactional import counters when interrupted after merge but before acknowledgment signing', async () => {
    const { a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const request = await startReceive(b, event.id);
    const out = (await acceptFrame(a, event.id, frameText(request.request)))
      .session;
    await acceptFrame(b, event.id, frameText(out.offer!));
    const failure = vi
      .spyOn(crypto.subtle, 'sign')
      .mockRejectedValueOnce(new Error('Interrupted before acknowledgment'));
    await expect(acceptFrame(b, event.id, out.frames['0']!)).rejects.toThrow(
      'Interrupted',
    );
    failure.mockRestore();
    expect(await b.records(event.id)).toHaveLength(1);
    expect((await b.syncSessions.get(out.id))?.result?.imported).toBe(1);
    expect((await b.syncSessions.get(out.id))?.ack).toBeUndefined();
    const resumed = (await acceptFrame(b, event.id, out.frames['0']!)).session;
    expect(resumed.result).toMatchObject({
      imported: 1,
      skipped: 0,
      transferred: 1,
    });
    expect(resumed.ack).toBeDefined();
  });
  it('rejects a different authorized scanner impersonating the intended acknowledgment receiver', async () => {
    const { org, a, b, event } = await pair();
    await enroll(org, org, event.id);
    const request = await startReceive(b, event.id);
    const out = (await acceptFrame(a, event.id, frameText(request.request)))
      .session;
    const incoming = (await acceptFrame(b, event.id, frameText(out.offer!)))
      .session;
    const body = Object.fromEntries(
      Object.entries(incoming.ack!).filter(([k]) => k !== 'z'),
    );
    const forged = {
      ...incoming.ack!,
      z: await sign(
        'ENTRYLOOP:SYNC:2\n' + canonical(body),
        (await identity(org)).privateKey,
      ),
    };
    await expect(acceptFrame(a, event.id, frameText(forged))).rejects.toThrow(
      'signature',
    );
    expect((await a.syncSessions.get(out.id))?.ack).toBeUndefined();
  });
  it('rejects authorization metadata reuse under an existing operation ID even with a fresh valid author signature', async () => {
    const { org, a, b, event, tickets } = await pair();
    await admitSignedTicket(a, event.id, tickets[0]!.payload);
    const snap = await trustedSnapshot(a, event.id),
      original = snap.operations[0]!;
    const policy = await changePolicy(org, event.id, {
      ticket: tickets[5]!.ticketId,
    });
    await importPolicy(a, event.id, policy);
    await importPolicy(b, event.id, policy);
    await mergeTrusted(b, event.id, [original], snap.credentials);
    const changed = {
      ...original,
      proof: { ...original.proof, authorizationEpoch: 2 },
    };
    changed.proof.signature = await sign(
      operationMessage(changed),
      (await identity(a)).privateKey,
    );
    await expect(
      mergeTrusted(b, event.id, [changed], snap.credentials),
    ).rejects.toThrow('Operation ID collision in signed evidence');
    expect((await b.operationProofs.toArray())[0]!.authorizationEpoch).toBe(1);
  });
  it('paginates exact missing indices beyond one 32-index request without truncating the snapshot', async () => {
    const { org, a, b, event, tickets } = await setup(70);
    await enroll(org, a, event.id);
    await enroll(org, b, event.id);
    for (const ticket of tickets)
      await admitSignedTicket(a, event.id, ticket.payload);
    const request = await startReceive(b, event.id),
      out = (await acceptFrame(a, event.id, frameText(request.request)))
        .session;
    await acceptFrame(b, event.id, frameText(out.offer!));
    const first = parseFrame(await missingRequest(b, out.id));
    if (first.k !== 'missing') throw new Error('Expected missing request');
    expect(first.total).toBe(35);
    expect(first.m).toEqual(Array.from({ length: 32 }, (_, i) => i));
    for (const i of first.m)
      await acceptFrame(b, event.id, out.frames[String(i)]!);
    const second = parseFrame(await missingRequest(b, out.id));
    if (second.k !== 'missing') throw new Error('Expected missing request');
    expect(second.total).toBe(3);
    expect(second.m).toEqual([32, 33, 34]);
    expect(await b.records(event.id)).toHaveLength(0);
    let done;
    for (const i of second.m)
      done = (await acceptFrame(b, event.id, out.frames[String(i)]!)).session;
    expect(done?.result?.imported).toBe(70);
    expect((await trustedSnapshot(a, event.id)).root).toBe(
      (await trustedSnapshot(b, event.id)).root,
    );
  });
});
