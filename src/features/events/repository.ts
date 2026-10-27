import { z } from 'zod';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { changePolicy, currentPolicy, verifyPolicy, checkPolicyUpdate } from '../security/authority';
import { admitTrusted } from '../security/operations';
import {
  eventInputSchema,
  attendeeInputSchema,
  eventMetadata,
  MAX_ATTENDEES,
} from './models';
import type {
  EventInput,
  ManagedEvent,
  Attendee,
  IssuedTicket,
} from './models';
import {
  generateSigningKey,
  signTicket,
  verifyTicket,
  signPackage,
  inspectPackage,
  packageMessage,
} from '../tickets/signatures';

export async function createEvent(
  db: EntryLoopDB,
  input: unknown,
): Promise<ManagedEvent> {
  const fields = eventInputSchema.parse(input);
  const keys = await generateSigningKey();
  const event: ManagedEvent = {
    ...fields,
    id: crypto.randomUUID(),
    revision: 1,
    publicKey: keys.publicKey,
    fingerprint: keys.fingerprint,
    role: 'organizer',
    locked: false,
  };
  await db.transaction('rw', db.events, db.signingKeys, async () => {
    await db.events.add(event);
    await db.signingKeys.add({
      eventId: event.id,
      privateKey: keys.privateKey,
    });
  });
  await changePolicy(db, event.id);
  return event;
}
async function organizer(
  db: EntryLoopDB,
  eventId: string,
): Promise<ManagedEvent> {
  const event = await db.events.get(eventId);
  if (!event || event.role !== 'organizer')
    throw new Error('This device is not the organizer for this event.');
  return event;
}
export async function updateEvent(
  db: EntryLoopDB,
  eventId: string,
  input: unknown,
  expectedRevision: number,
): Promise<void> {
  const fields: EventInput = eventInputSchema.parse(input);
  await db.transaction('rw', db.events, async () => {
    const event = await organizer(db, eventId);
    if (event.revision !== expectedRevision)
      throw new Error('Event changed in another tab. Reload before saving.');
    if (
      event.locked &&
      (fields.name !== event.name ||
        fields.date !== event.date ||
        fields.location !== event.location)
    )
      throw new Error(
        'Name, date and location are locked after ticket issuance or scanner provisioning. Description can still be edited.',
      );
    await db.events.put({ ...event, ...fields, revision: event.revision + 1 });
  });
}
function ticketId(): string {
  return (
    'T-' +
    Array.from(crypto.getRandomValues(new Uint8Array(11)), (byte) =>
      byte.toString(16).padStart(2, '0'),
    )
      .join('')
      .toUpperCase()
  );
}
export async function addAttendees(
  db: EntryLoopDB,
  eventId: string,
  input: unknown,
): Promise<{ added: number; skipped: number }> {
  const rows = z
    .array(attendeeInputSchema)
    .min(1)
    .max(MAX_ATTENDEES)
    .parse(input);
  return db.transaction('rw', db.events, db.attendees, async () => {
    await organizer(db, eventId);
    const existing = await db.attendees
      .where('eventId')
      .equals(eventId)
      .toArray();
    const emails = new Set(existing.map((row) => row.email));
    const attendees: Attendee[] = [];
    for (const row of rows) {
      if (emails.has(row.email)) continue;
      emails.add(row.email);
      attendees.push({
        ...row,
        id: crypto.randomUUID(),
        eventId,
        ticketId: ticketId(),
      });
    }
    if (existing.length + attendees.length > MAX_ATTENDEES)
      throw new Error(
        `This prototype supports up to ${MAX_ATTENDEES} attendees per event.`,
      );
    await db.attendees.bulkAdd(attendees);
    return { added: attendees.length, skipped: rows.length - attendees.length };
  });
}
export async function issueTickets(
  db: EntryLoopDB,
  eventId: string,
  attendeeIds: readonly string[],
): Promise<{ issued: number; skipped: number }> {
  if (
    !attendeeIds.length ||
    attendeeIds.length > MAX_ATTENDEES ||
    new Set(attendeeIds).size !== attendeeIds.length
  )
    throw new Error('Select a nonempty, unique attendee list.');
  await organizer(db, eventId);
  const key = await db.signingKeys.get(eventId);
  if (!key)
    throw new Error(
      'Organizer signing key is unavailable. Tickets cannot be issued.',
    );
  const rows = await db.attendees.bulkGet([...attendeeIds]);
  if (rows.some((row) => !row || row.eventId !== eventId))
    throw new Error('Attendee does not belong to this event.');
  const signed: IssuedTicket[] = [];
  for (const attendee of rows) {
    if (!attendee) throw new Error('Attendee missing.');
    if (await db.issuedTickets.get([eventId, attendee.ticketId])) continue;
    signed.push({
      eventId,
      ticketId: attendee.ticketId,
      attendeeId: attendee.id,
      payload: await signTicket(eventId, attendee.ticketId, key.privateKey),
      issuedAt: new Date().toISOString(),
    });
  }
  return db.transaction(
    'rw',
    db.events,
    db.issuedTickets,
    db.ticketCatalog,
    async () => {
      const event = await organizer(db, eventId);
      let issued = 0;
      for (const ticket of signed) {
        if (await db.issuedTickets.get([eventId, ticket.ticketId])) continue;
        await db.issuedTickets.add(ticket);
        await db.ticketCatalog.add({ eventId, ticketId: ticket.ticketId });
        issued++;
      }
      if (issued)
        await db.events.put({
          ...event,
          locked: true,
          revision: event.revision + 1,
        });
      return { issued, skipped: attendeeIds.length - issued };
    },
  );
}
export async function exportEventPackage(
  db: EntryLoopDB,
  eventId: string,
): Promise<string> {
  const snapshot = await db.transaction(
    'rw',
    db.events,
    db.signingKeys,
    db.ticketCatalog,
    async () => {
      const event = await organizer(db, eventId);
      const key = await db.signingKeys.get(eventId);
      if (!key) throw new Error('Organizer signing key is unavailable.');
      const locked = {
        ...event,
        locked: true,
        revision: event.revision + (event.locked ? 0 : 1),
      };
      await db.events.put(locked);
      const ticketIds = (
        await db.ticketCatalog.where('eventId').equals(eventId).toArray()
      )
        .map((ticket) => ticket.ticketId)
        .sort();
      if (!ticketIds.length)
        throw new Error('Issue at least one ticket before preparing scanners.');
      return { event: locked, key: key.privateKey, ticketIds };
    },
  );
  const policy = await currentPolicy(db, eventId) ?? await changePolicy(db, eventId);
  return signPackage(
    {
      kind: 'entryloop-event',
      version: 2,
      policy,
      event: eventMetadata(snapshot.event),
      publicKey: snapshot.event.publicKey,
      ticketIds: snapshot.ticketIds,
    },
    snapshot.key,
  );
}
export async function importEventPackage(
  db: EntryLoopDB,
  text: string,
  confirmedFingerprint: string,
): Promise<string> {
  const inspected = await inspectPackage(text);
  const pkg = inspected.package;
  if (confirmedFingerprint !== inspected.fingerprint)
    throw new Error(
      'Compare and confirm the full public-key fingerprint with the organizer first.',
    );
  const pinned = await db.events.get(pkg.event.id);
  if (pinned && pinned.fingerprint !== inspected.fingerprint) throw new Error('Pinned organizer key mismatch. Existing event was not changed.');
  if (pkg.version === 2) await verifyPolicy(pkg.policy, pkg.event.id, pkg.publicKey);
  return db.transaction('rw', db.events, db.ticketCatalog, db.policies, async () => {
    const previousPolicy = await currentPolicy(db, pkg.event.id);
    if (previousPolicy && pkg.version === 1) throw new Error('Unsigned-policy legacy package cannot downgrade a secured event.');
    if (pkg.version === 2) checkPolicyUpdate(previousPolicy, pkg.policy);
    const existing = await db.events.get(pkg.event.id);
    if (existing) {
      if (existing.fingerprint !== inspected.fingerprint)
        throw new Error(
          'Pinned organizer key mismatch. Existing event was not changed.',
        );
      if (existing.role === 'organizer')
        throw new Error('A scanner package cannot replace organizer data.');
      if (pkg.event.revision < existing.revision)
        throw new Error('Stale event package. Existing event was not changed.');
      const catalog = await db.ticketCatalog
        .where('eventId')
        .equals(existing.id)
        .toArray();
      if (catalog.some((ticket) => !pkg.ticketIds.includes(ticket.ticketId)))
        throw new Error(
          'Event package removes known tickets. Revocation is not supported.',
        );
      if (pkg.event.revision === existing.revision) {
        if (
          packageMessage({
            ...pkg,
            event: eventMetadata(existing),
            ticketIds: catalog.map((ticket) => ticket.ticketId),
          }) !== packageMessage(pkg)
        )
          throw new Error(
            'Conflicting package revision. Existing event was not changed.',
          );
        if (pkg.version === 2 && !(await db.policies.get([pkg.event.id, pkg.policy.epoch]))) await db.policies.add(pkg.policy);
        return existing.id;
      }
    }
    if (pkg.version === 2 && !(await db.policies.get([pkg.event.id, pkg.policy.epoch]))) await db.policies.add(pkg.policy);
    await db.events.put({
      ...pkg.event,
      publicKey: pkg.publicKey,
      fingerprint: inspected.fingerprint,
      role: 'scanner',
      locked: true,
    });
    await db.ticketCatalog.bulkPut(
      pkg.ticketIds.map((ticketId) => ({ eventId: pkg.event.id, ticketId })),
    );
    return pkg.event.id;
  });
}
export async function admitSignedTicket(
  db: EntryLoopDB,
  eventId: string,
  text: string,
) {
  const event = await db.events.get(eventId);
  if (!event)
    throw new Error(
      'Prepare this device with the event package before scanning.',
    );
  const ticket = await verifyTicket(text, eventId, event.publicKey);
  return admitTrusted(db, eventId, ticket.t);
}
