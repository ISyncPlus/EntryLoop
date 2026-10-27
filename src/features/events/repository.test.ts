import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { EntryLoopDB } from '../check-in/persistence/database';
import {
  createEvent,
  updateEvent,
  addAttendees,
  issueTickets,
  exportEventPackage,
  importEventPackage,
  admitSignedTicket,
} from './repository';
import {
  generateSigningKey,
  inspectPackage,
  signPackage,
  signTicket,
} from '../tickets/signatures';
import { authorize, enrollmentRequest, identity, importOwnCredential } from '../security/authority';
import { trustedSnapshot, mergeTrusted } from '../security/operations';
import { encodeTransfer } from '../sync/codec';
import { reconcile } from '../check-in/domain/reconcile';
import { record as legacyRecord } from '../../test/records';
const databases: EntryLoopDB[] = [];
function db(profile = crypto.randomUUID().replaceAll('-', '')) {
  const instance = new EntryLoopDB(profile);
  databases.push(instance);
  return instance;
}
const input = {
  name: 'Open Room',
  date: '2026-11-12',
  location: 'The Assembly, Lagos',
  description: 'Meet, make, exchange.',
};
async function issuedEvent(instance: EntryLoopDB) {
  const event = await createEvent(instance, input);
  await addAttendees(instance, event.id, [
    { name: 'Ada Stone', email: 'ada@example.com' },
    { name: 'Sam River', email: 'sam@example.com' },
  ]);
  const attendees = await instance.attendees
    .where('eventId')
    .equals(event.id)
    .toArray();
  await issueTickets(
    instance,
    event.id,
    attendees.map((row) => row.id),
  );
  const tickets = await instance.issuedTickets
    .where('eventId')
    .equals(event.id)
    .toArray();
  return { event, attendees, tickets };
}
async function enroll(organizer: EntryLoopDB, scanner: EntryLoopDB, eventId: string) {
  const own = await identity(scanner);
  const credential = await authorize(organizer, eventId, await enrollmentRequest(scanner, eventId, 'Gate'), own.fingerprint);
  if (organizer !== scanner) await importOwnCredential(scanner, eventId, credential);
}
afterEach(async () => {
  for (const instance of databases) await instance.delete();
  databases.length = 0;
});
describe('real event workflow and storage boundaries', () => {
  it('creates stable events, persists signing capability after reopen and prevents key export', async () => {
    const a = db();
    const event = await createEvent(a, input);
    expect(event.id).toMatch(/^[a-f0-9-]{36}$/);
    const key = await a.signingKeys.get(event.id);
    expect(key?.privateKey.extractable).toBe(false);
    a.close();
    const b = db(a.name.replace('entryloop-v1-', ''));
    expect(await b.events.get(event.id)).toEqual(event);
    await addAttendees(b, event.id, [
      { name: 'Ada', email: 'ada@example.com' },
    ]);
    const attendee = (await b.attendees.toArray())[0]!;
    expect(await issueTickets(b, event.id, [attendee.id])).toMatchObject({
      issued: 1,
    });
    await expect(
      crypto.subtle.exportKey(
        'jwk',
        (await b.signingKeys.get(event.id))!.privateKey,
      ),
    ).rejects.toThrow();
  });
  it('validates inputs, event boundaries and normalized attendee duplicates atomically', async () => {
    const a = db();
    const e = await createEvent(a, input);
    await expect(
      createEvent(a, { ...input, date: '2026-02-30' }),
    ).rejects.toThrow();
    await expect(
      addAttendees(a, e.id, [
        { name: 'Ada', email: 'ada@example.com' },
        { name: '', email: 'broken' },
      ]),
    ).rejects.toThrow();
    expect(await a.attendees.count()).toBe(0);
    const results = await Promise.all([
      addAttendees(a, e.id, [{ name: 'Ada', email: ' ADA@EXAMPLE.COM ' }]),
      addAttendees(a, e.id, [{ name: 'Ada copy', email: 'ada@example.com' }]),
    ]);
    expect(results.reduce((total, result) => total + result.added, 0)).toBe(1);
    expect(await a.attendees.count()).toBe(1);
    const b = await createEvent(a, { ...input, name: 'Another Room' });
    await expect(
      issueTickets(a, b.id, [(await a.attendees.toArray())[0]!.id]),
    ).rejects.toThrow('belong');
  });
  it('guards stale edits and locks identity-facing details after issuance while permitting descriptions', async () => {
    const a = db();
    const e = await createEvent(a, input);
    await updateEvent(a, e.id, { ...input, name: 'New Room' }, e.revision);
    await expect(
      updateEvent(a, e.id, { ...input, name: 'Lost Update' }, e.revision),
    ).rejects.toThrow('another tab');
    await addAttendees(a, e.id, [{ name: 'Ada', email: 'ada@example.com' }]);
    await issueTickets(a, e.id, [(await a.attendees.toArray())[0]!.id]);
    const latest = (await a.events.get(e.id))!;
    await expect(
      updateEvent(
        a,
        e.id,
        { ...input, name: 'Replacement Room' },
        latest.revision,
      ),
    ).rejects.toThrow('locked');
    await updateEvent(
      a,
      e.id,
      {
        name: latest.name,
        date: latest.date,
        location: latest.location,
        description: 'Updated description',
      },
      latest.revision,
    );
    expect((await a.events.get(e.id))?.description).toBe('Updated description');
    expect((await a.events.get(e.id))?.id).toBe(e.id);
  });
  it('issues once even with concurrent calls and preserves the issued payload on repeated exports', async () => {
    const a = db();
    const e = await createEvent(a, input);
    await addAttendees(a, e.id, [{ name: 'Ada', email: 'ada@example.com' }]);
    const row = (await a.attendees.toArray())[0]!;
    const results = await Promise.all([
      issueTickets(a, e.id, [row.id]),
      issueTickets(a, e.id, [row.id]),
    ]);
    expect(results.map((result) => result.issued).sort()).toEqual([0, 1]);
    const ticket = (await a.issuedTickets.toArray())[0]!;
    await issueTickets(a, e.id, [row.id]);
    expect((await a.issuedTickets.toArray())[0]).toEqual(ticket);
    expect(row.ticketId).toMatch(/^T-[A-F0-9]{22}$/);
  });
  it('exports only public provisioning data and requires fingerprint confirmation without organizer replacement', async () => {
    const a = db(),
      b = db();
    const { event, attendees } = await issuedEvent(a);
    const text = await exportEventPackage(a, event.id);
    const parsed = await inspectPackage(text);
    for (const row of attendees) {
      expect(text).not.toContain(row.name);
      expect(text).not.toContain(row.email);
    }
    expect(text).not.toContain('privateKey');
    expect(Object.keys(parsed.package.publicKey).sort()).toEqual([
      'crv',
      'kty',
      'x',
      'y',
    ]);
    await expect(importEventPackage(b, text, 'bad')).rejects.toThrow(
      'fingerprint',
    );
    expect(await b.events.count()).toBe(0);
    await importEventPackage(b, text, event.fingerprint);
    await importEventPackage(b, text, event.fingerprint);
    expect(await b.events.count()).toBe(1);
    expect(await b.attendees.count()).toBe(0);
    expect(await b.signingKeys.count()).toBe(0);
    expect(await b.issuedTickets.count()).toBe(0);
    expect(await b.ticketCatalog.count()).toBe(2);
    await expect(
      importEventPackage(a, text, event.fingerprint),
    ).rejects.toThrow('organizer data');
  });
  it('preserves pinned keys, rejects tampering/stale revisions, and adds newly issued tickets only after reprovisioning', async () => {
    const a = db(),
      b = db();
    const { event } = await issuedEvent(a);
    const first = await exportEventPackage(a, event.id);
    await importEventPackage(b, first, event.fingerprint);
    await expect(
      importEventPackage(
        b,
        first.replace('Open Room', 'Evil Room'),
        event.fingerprint,
      ),
    ).rejects.toThrow('signature');
    const foreign = await generateSigningKey();
    const parsed = await inspectPackage(first);
    const forged = await signPackage(
      { ...parsed.package, publicKey: foreign.publicKey },
      foreign.privateKey,
    );
    await expect(
      importEventPackage(b, forged, foreign.fingerprint),
    ).rejects.toThrow('key mismatch');
    await addAttendees(a, event.id, [
      { name: 'New Guest', email: 'new@example.com' },
    ]);
    const row = (await a.attendees
      .where('[eventId+email]')
      .equals([event.id, 'new@example.com'])
      .first())!;
    await issueTickets(a, event.id, [row.id]);
    await enroll(a, b, event.id);
    const newTicket = (await a.issuedTickets.get([event.id, row.ticketId]))!;
    await expect(
      admitSignedTicket(b, event.id, newTicket.payload),
    ).rejects.toThrow('snapshot');
    await importEventPackage(
      b,
      await exportEventPackage(a, event.id),
      event.fingerprint,
    );
    await admitSignedTicket(b, event.id, newTicket.payload);
    await expect(
      importEventPackage(b, first, event.fingerprint),
    ).rejects.toThrow('Stale');
    expect(await b.records(event.id)).toHaveLength(1);
  });
  it('validates signatures/event/local status, stores admissions and preserves offline sync conflicts with no PII', async () => {
    const a = db(),
      b = db();
    const { event, tickets } = await issuedEvent(a);
    const ticket = tickets[0]!;
    await importEventPackage(
      b,
      await exportEventPackage(a, event.id),
      event.fingerprint,
    );
    await expect(
      admitSignedTicket(
        a,
        event.id,
        ticket.payload.replace(ticket.ticketId, 'T-INVALID'),
      ),
    ).rejects.toThrow('signature');
    const other = await createEvent(a, { ...input, name: 'Other Event' });
    await expect(
      admitSignedTicket(a, other.id, ticket.payload),
    ).rejects.toThrow('Wrong event');
    await enroll(a, a, event.id);
    await enroll(a, b, event.id);
    await admitSignedTicket(a, event.id, ticket.payload);
    await admitSignedTicket(b, event.id, ticket.payload);
    await expect(
      admitSignedTicket(a, event.id, ticket.payload),
    ).rejects.toThrow('already admitted');
    const snapshotA = await trustedSnapshot(a, event.id);
    const payload = JSON.stringify(snapshotA.operations);
    expect(payload).not.toContain('Ada');
    expect(payload).not.toContain('@');
    await mergeTrusted(b, event.id, snapshotA.operations, snapshotA.credentials);
    const snapshotB = await trustedSnapshot(b, event.id);
    await mergeTrusted(a, event.id, snapshotB.operations, snapshotB.credentials);
    expect(await a.records(event.id)).toEqual(await b.records(event.id));
    expect(reconcile(event.id, await a.records(event.id))).toMatchObject({
      attendance: 1,
      conflicts: [{ ticketId: ticket.ticketId }],
    });
    const unknown = {
      ...legacyRecord(9),
      eventId: event.id,
      ticketId: 'T-UNKNOWN',
    };
    await expect(
      b.importTransfer(event.id, await encodeTransfer(event.id, [unknown])),
    ).rejects.toThrow('Unsigned transfers');
    expect(await b.records(event.id)).toHaveLength(2);
  });
  it('rejects validly signed but unissued ticket IDs and scanner issuance', async () => {
    const a = db(),
      b = db();
    const { event } = await issuedEvent(a);
    await importEventPackage(
      b,
      await exportEventPackage(a, event.id),
      event.fingerprint,
    );
    const key = (await a.signingKeys.get(event.id))!;
    await enroll(a, b, event.id);
    const unknown = await signTicket(event.id, 'T-UNISSUED', key.privateKey);
    await expect(admitSignedTicket(b, event.id, unknown)).rejects.toThrow(
      'snapshot',
    );
    await expect(
      addAttendees(b, event.id, [{ name: 'No', email: 'no@example.com' }]),
    ).rejects.toThrow('organizer');
    expect(await b.records(event.id)).toHaveLength(0);
  });
  it('migrates v1 IndexedDB without losing legacy operations or scanner identity', async () => {
    const profile = crypto.randomUUID().replaceAll('-', '');
    const old = new Dexie(`entryloop-v1-${profile}`);
    old
      .version(1)
      .stores({ operations: '[eventId+operationId],eventId', devices: 'id' });
    const record = legacyRecord(1);
    await old.table('operations').add(record);
    await old
      .table('devices')
      .add({ id: '11111111-1111-4111-8111-111111111111', label: 'legacy' });
    old.close();
    const migrated = db(profile);
    expect(await migrated.records(record.eventId)).toEqual([record]);
    expect((await migrated.scanner()).label).toBe('legacy');
    expect(await migrated.events.count()).toBe(0);
  });
});
