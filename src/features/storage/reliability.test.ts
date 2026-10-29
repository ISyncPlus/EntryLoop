import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntryLoopDB, scannerProfile } from '../check-in/persistence/database';
import {
  createEvent,
  addAttendees,
  issueTickets,
  updateEvent,
  exportEventPackage,
  importEventPackage,
  admitSignedTicket,
} from '../events/repository';
import {
  authorize,
  enrollmentRequest,
  identity,
  importOwnCredential,
} from '../security/authority';
import { generateSigningKey } from '../tickets/signatures';
import { workspaceHealth } from './health';
import { exportRecoverableRecords } from './backup';
import { assertCompatibleSchema, SCHEMAS } from './schema';
import {
  existingProfiles,
  launchProfile,
  workspaceInventory,
  workspaceUrl,
} from './workspaces';
const databases: Dexie[] = [];
function database(profile = crypto.randomUUID().replaceAll('-', '')) {
  const db = new EntryLoopDB(profile);
  databases.push(db);
  return db;
}
afterEach(async () => {
  for (const db of databases) await db.delete();
  databases.length = 0;
});
async function issued(db: EntryLoopDB) {
  const event = await createEvent(db, {
    name: 'Reliability fixture',
    date: '2026-11-12',
    location: 'Synthetic lab',
    description: '',
  });
  await addAttendees(db, event.id, [
    { name: 'Test Guest', email: 'guest@example.com' },
  ]);
  await issueTickets(db, event.id, [(await db.attendees.toArray())[0]!.id]);
  return event;
}
describe('non-destructive storage and profile reliability', () => {
  it('keeps legacy default names but requires a choice for ambiguous or fresh bare launches', () => {
    expect(scannerProfile('')).toBe('main');
    expect(launchProfile('', [])).toBeNull();
    expect(launchProfile('', ['main', 'organizer'])).toBeNull();
    expect(launchProfile('', ['organizer'])).toBe('organizer');
    expect(launchProfile('?scanner=main', ['organizer'])).toBe('main');
    expect(() => launchProfile('?scanner=main&scanner=organizer', [])).toThrow(
      'Multiple',
    );
    expect(workspaceUrl('/scan', 'organizer', '?theme=dark&scanner=main')).toBe(
      '/scan?theme=dark&scanner=organizer',
    );
  });
  it('does not create databases during read-only inspection', async () => {
    const db = database();
    await assertCompatibleSchema(db.name);
    expect(
      (await indexedDB.databases()).some((item) => item.name === db.name),
    ).toBe(false);
    await db.open();
    expect(await db.devices.count()).toBe(0);
    expect(await db.scannerKeys.count()).toBe(0);
    const before = (await indexedDB.databases()).map((db) => db.name).sort();
    expect(
      (await workspaceInventory()).find((item) => item.name === db.name)
        ?.snapshot?.counts.events,
    ).toBe(0);
    expect((await indexedDB.databases()).map((db) => db.name).sort()).toEqual(
      before,
    );
  });
  it('reports unsupported inventory rather than pretending no profiles exist', async () => {
    await expect(existingProfiles({} as IDBFactory)).rejects.toThrow(
      'cannot list',
    );
  });
  it.each([10, 20])(
    'validates and additively upgrades native schema %i without replacing legacy IDs/operations',
    async (nativeVersion) => {
      const profile = crypto.randomUUID().replaceAll('-', ''),
        name = 'entryloop-v1-' + profile;
      const old = new Dexie(name);
      databases.push(old);
      old
        .version(nativeVersion / 10)
        .stores(
          Object.assign(
            {},
            ...SCHEMAS.filter(([v]) => v <= nativeVersion / 10).map(
              ([, schema]) => schema,
            ),
          ),
        );
      const record = {
        operationId: crypto.randomUUID(),
        eventId: 'launchpad-lab',
        ticketId: 'TEST-001',
        scannerId: crypto.randomUUID(),
        recordedAt: '2026-10-27T00:00:00.000Z',
      };
      await old.table('operations').add(record);
      await old
        .table('devices')
        .add({ id: record.scannerId, label: 'Existing scanner' });
      old.close();
      const db = database(profile);
      await db.open();
      expect(db.backendDB().version).toBe(30);
      expect(await db.records(record.eventId)).toEqual([record]);
      expect((await db.devices.toArray())[0]!.id).toBe(record.scannerId);
      expect((await workspaceHealth(db)).issues).toEqual([]);
    },
  );
  it('blocks future schemas without deleting or downgrading them', async () => {
    const profile = crypto.randomUUID().replaceAll('-', ''),
      old = new Dexie('entryloop-v1-' + profile);
    databases.push(old);
    old.version(4).stores({ events: 'id' });
    await old.table('events').add({ id: 'existing', evidence: 'keep' });
    old.close();
    const db = database(profile);
    await expect(db.open()).rejects.toThrow('Unsupported database version 40');
    const check = new Dexie(db.name);
    databases.push(check);
    await check.open();
    expect(check.backendDB().version).toBe(40);
    expect(await check.table('events').get('existing')).toEqual({
      id: 'existing',
      evidence: 'keep',
    });
  });
  it('prevents silent same-version schema repair', async () => {
    const profile = crypto.randomUUID().replaceAll('-', ''),
      old = new Dexie('entryloop-v1-' + profile);
    databases.push(old);
    const schemas = Object.assign({}, ...SCHEMAS.map(([, schema]) => schema));
    old.version(3).stores({ ...schemas, events: 'id,role' });
    await old.table('events').add({ id: 'existing', name: 'Keep' });
    old.close();
    const db = database(profile);
    await expect(db.open()).rejects.toThrow('Unexpected schema');
    const check = new Dexie(db.name);
    databases.push(check);
    await check.open();
    expect(check.backendDB().version).toBe(30);
    expect(await check.table('events').count()).toBe(1);
  });
  it('detects missing and mismatched organizer keys without replacing them', async () => {
    const db = database(),
      event = await issued(db),
      original = (await db.signingKeys.get(event.id))!;
    await db.signingKeys.delete(event.id);
    expect((await workspaceHealth(db)).issues.join(' ')).toContain(
      'signing key unavailable',
    );
    const wrong = await generateSigningKey();
    await db.signingKeys.add({
      eventId: event.id,
      privateKey: wrong.privateKey,
    });
    expect((await workspaceHealth(db)).issues.join(' ')).toContain(
      'does not match',
    );
    await db.signingKeys.put(original);
    expect((await workspaceHealth(db)).issues).toEqual([]);
  });
  it('detects orphaned records and keys instead of reporting a fresh workspace', async () => {
    const db = database(),
      event = await issued(db);
    await db.events.delete(event.id); // Disposable fixture: simulate loss; production code has no deletion path.
    const health = await workspaceHealth(db);
    expect(health.counts.events).toBe(0);
    expect(health.counts.attendees).toBe(1);
    expect(health.issues.join(' ')).toContain('without their event');
    expect(health.issues.join(' ')).toContain('signing key has no event');
  });
  it('detects event metadata missing its indexed date', async () => {
    const db = database(),
      event = await issued(db);
    await db.events.update(event.id, { date: undefined } as never);
    expect(await db.events.orderBy('date').count()).toBe(0);
    expect((await workspaceHealth(db)).issues.join(' ')).toContain(
      'invalid or incomplete',
    );
  });
  it('rolls back a failed event/key/policy transaction and preserves existing events', async () => {
    const db = database();
    await issued(db);
    const before = {
      events: await db.events.toArray(),
      ids: await db.signingKeys.toCollection().primaryKeys(),
    };
    const fail = vi
      .spyOn(db.policies, 'add')
      .mockRejectedValueOnce(
        new DOMException('Synthetic quota failure', 'QuotaExceededError'),
      );
    await expect(
      createEvent(db, {
        name: 'Should fail',
        date: '2026-11-12',
        location: 'Lab',
        description: '',
      }),
    ).rejects.toThrow('quota');
    fail.mockRestore();
    expect(await db.events.toArray()).toEqual(before.events);
    expect(await db.signingKeys.toCollection().primaryKeys()).toEqual(
      before.ids,
    );
  });
  it('keeps concurrent event revisions safe across database connections', async () => {
    const a = database(),
      event = await issued(a),
      b = database(a.name.replace('entryloop-v1-', ''));
    const latest = (await a.events.get(event.id))!;
    const fields = {
      name: latest.name,
      date: latest.date,
      location: latest.location,
      description: 'First',
    };
    const result = await Promise.allSettled([
      updateEvent(a, event.id, fields, latest.revision),
      updateEvent(
        b,
        event.id,
        { ...fields, description: 'Second' },
        latest.revision,
      ),
    ]);
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await a.events.count()).toBe(1);
    expect(await a.signingKeys.count()).toBe(1);
  });
  it('exports recoverable data explicitly without private keys, signing authority or identity replacement', async () => {
    const db = database(),
      event = await issued(db),
      own = await identity(db);
    await authorize(
      db,
      event.id,
      await enrollmentRequest(db, event.id, 'North'),
      own.fingerprint,
    );
    const text = await exportRecoverableRecords(
      db,
      'https://test.invalid',
      'build-test',
    );
    const backup = JSON.parse(text) as {
      tables: Record<string, unknown[]>;
      restoresSigningAuthority: boolean;
    };
    expect(backup.restoresSigningAuthority).toBe(false);
    expect(backup.tables.attendees).toHaveLength(1);
    expect(backup.tables.issuedTickets).toHaveLength(1);
    expect(backup.tables.credentials).toHaveLength(1);
    expect(backup.tables.signingKeys).toBeUndefined();
    expect(backup.tables.scannerKeys).toBeUndefined();
    expect(text).not.toContain('privateKey');
    expect((await db.scannerKeys.get('local'))!.scannerId).toBe(own.scannerId);
    expect((await workspaceHealth(db)).issues).toEqual([]);
  });
  it('does not generate a scanner identity on failed admission or credential import', async () => {
    const org = database(),
      gate = database(),
      event = await issued(org);
    await importEventPackage(
      gate,
      await exportEventPackage(org, event.id),
      event.fingerprint,
    );
    await expect(
      admitSignedTicket(
        gate,
        event.id,
        (await org.issuedTickets.toArray())[0]!.payload,
      ),
    ).rejects.toThrow('not authorized');
    expect(await gate.scannerKeys.count()).toBe(0);
    const own = await identity(org),
      credential = await authorize(
        org,
        event.id,
        await enrollmentRequest(org, event.id, 'Org'),
        own.fingerprint,
      );
    await expect(
      importOwnCredential(gate, event.id, credential),
    ).rejects.toThrow('No replacement');
    expect(await gate.scannerKeys.count()).toBe(0);
  });
});
