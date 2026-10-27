import { afterEach, describe, expect, it } from 'vitest';
import { EntryLoopDB, scannerProfile } from './database';
import { eventId, record } from '../../../test/records';
import { ticketsFor } from '../domain/fixtures';
import { encodeTransfer } from '../../sync/codec';
const databases: EntryLoopDB[] = [];
function db(profile: string = crypto.randomUUID().replaceAll('-', '')) {
  const instance = new EntryLoopDB(profile);
  databases.push(instance);
  return instance;
}
afterEach(async () => {
  for (const instance of databases) await instance.delete();
  databases.length = 0;
});
describe('IndexedDB integration', () => {
  it('retains stored operations and scanner identity after close and reopen', async () => {
    const first = db();
    const scanner = await first.scanner();
    const admission = await first.admit(ticketsFor(eventId)[0]!);
    first.close();
    const reopened = db(first.name.replace('entryloop-v1-', ''));
    expect(await reopened.records(eventId)).toEqual([admission]);
    expect(await reopened.scanner()).toEqual(scanner);
  });
  it('isolates profiles and event logs and scopes reset to one event', async () => {
    const a = db();
    const b = db();
    await a.admit(ticketsFor(eventId)[0]!);
    await a.admit(ticketsFor('community-lab')[0]!);
    expect(await b.records(eventId)).toEqual([]);
    expect((await a.scanner()).id).not.toBe((await b.scanner()).id);
    await a.resetEvent(eventId);
    expect(await a.records(eventId)).toHaveLength(0);
    expect(await a.records('community-lab')).toHaveLength(1);
  });
  it('serializes duplicate local admissions across two connections', async () => {
    const a = db();
    const b = db(a.name.replace('entryloop-v1-', ''));
    const results = await Promise.allSettled([
      a.admit(ticketsFor(eventId)[0]!),
      b.admit(ticketsFor(eventId)[0]!),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(await a.records(eventId)).toHaveLength(1);
    expect(await a.scanner()).toEqual(await b.scanner());
  });
  it('imports once, skips repeats, preserves conflicts and converges both ways', async () => {
    const a = db();
    const b = db();
    await a.admit(ticketsFor(eventId)[0]!);
    await b.admit(ticketsFor(eventId)[0]!);
    const payload = await encodeTransfer(eventId, await a.records(eventId));
    expect(await b.importTransfer(eventId, payload)).toMatchObject({
      transferred: 1,
      imported: 1,
      skipped: 0,
      attendance: 1,
    });
    expect(await b.importTransfer(eventId, payload)).toMatchObject({
      imported: 0,
      skipped: 1,
    });
    await a.importTransfer(
      eventId,
      await encodeTransfer(eventId, await b.records(eventId)),
    );
    expect(await a.records(eventId)).toEqual(await b.records(eventId));
  });
  it('rolls back the whole import when an operation ID collides', async () => {
    const a = db();
    await a.importTransfer(eventId, await encodeTransfer(eventId, [record(1)]));
    const payload = await encodeTransfer(eventId, [
      record(2),
      { ...record(1), ticketId: 'TEST-003' },
    ]);
    await expect(a.importTransfer(eventId, payload)).rejects.toThrow(
      'collision',
    );
    expect(await a.records(eventId)).toEqual([record(1)]);
  });
  it('rejects unknown synthetic tickets, corruption and mismatched events without writes', async () => {
    const a = db();
    await expect(
      a.importTransfer(
        eventId,
        await encodeTransfer(eventId, [record(1, 'TEST-999')]),
      ),
    ).rejects.toThrow('Unknown synthetic');
    await expect(
      a.importTransfer(
        'community-lab',
        await encodeTransfer(eventId, [record(1)]),
      ),
    ).rejects.toThrow('Event mismatch');
    await expect(a.importTransfer(eventId, 'bad')).rejects.toThrow();
    expect(await a.records(eventId)).toEqual([]);
  });
  it('validates the explicit database namespace', () => {
    expect(scannerProfile('?scanner=a')).toBe('a');
    expect(scannerProfile('')).toBe('main');
    expect(() => scannerProfile('?scanner=../bad')).toThrow();
    expect(() => new EntryLoopDB('')).toThrow();
  });
  it('accepts concurrent repeated imports only once', async () => {
    const a = db();
    const payload = await encodeTransfer(eventId, [record(1), record(2)]);
    const results = await Promise.all([
      a.importTransfer(eventId, payload),
      a.importTransfer(eventId, payload),
    ]);
    expect(results.map((result) => result.imported).sort()).toEqual([0, 2]);
    expect(await a.records(eventId)).toHaveLength(2);
  });
});
