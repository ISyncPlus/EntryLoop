import { describe, expect, it } from 'vitest';
import { createCheckIn, mergeLogs, reconcile } from './reconcile';
import { eventId, record, scannerA, scannerB } from '../../../test/records';
import { ticketsFor } from './fixtures';
describe('immutable operation reconciliation', () => {
  it('creates independent local admissions with caller-supplied IDs and time', () => {
    const ticket = ticketsFor(eventId)[0]!;
    const a = createCheckIn(
      eventId,
      ticket,
      scannerA,
      [],
      record(1).operationId,
      record(1).recordedAt,
    );
    const b = createCheckIn(
      eventId,
      ticket,
      scannerB,
      [],
      record(2).operationId,
      record(1).recordedAt,
    );
    expect(a.operationId).not.toBe(b.operationId);
    expect(reconcile(eventId, [a, b])).toMatchObject({
      attendance: 1,
      conflicts: [
        { ticketId: ticket.id, operationIds: [a.operationId, b.operationId] },
      ],
    });
  });
  it('rejects locally known duplicate admissions', () => {
    expect(() =>
      createCheckIn(
        eventId,
        ticketsFor(eventId)[0]!,
        scannerA,
        [record(1)],
        record(2).operationId,
        record(2).recordedAt,
      ),
    ).toThrow('already admitted');
  });
  it('merges logs without mutating inputs and deduplicates operation IDs', () => {
    const local = Object.freeze([Object.freeze(record(1))]);
    const result = mergeLogs(eventId, local, [record(1), record(2), record(2)]);
    expect(result).toMatchObject({
      attendance: 2,
      transferred: 3,
      imported: 1,
      skipped: 2,
      rejected: 0,
    });
    expect(local).toHaveLength(1);
    expect(
      mergeLogs(eventId, result.operations, [record(1), record(2)]).imported,
    ).toBe(0);
  });
  it('preserves same-ticket conflicts regardless of timestamps or scanner IDs', () => {
    const a = record(1);
    const b = {
      ...record(2, 'TEST-001'),
      recordedAt: '2025-01-01T00:00:00.000Z',
    };
    const result = reconcile(eventId, [b, a]);
    expect(result.operations).toEqual([a, b]);
    expect(result.attendance).toBe(1);
    expect(result.conflicts).toHaveLength(1);
  });
  it('is idempotent, commutative and associative for overlapping valid sets', () => {
    const a = [record(1), record(2)];
    const b = [record(2), record(3, 'TEST-001', scannerB.id)];
    const c = [record(4), record(1)];
    const merge = (
      x: readonly ReturnType<typeof record>[],
      y: readonly ReturnType<typeof record>[],
    ) => reconcile(eventId, x, y).operations;
    expect(merge(a, a)).toEqual(merge(a, []));
    expect(merge(a, b)).toEqual(merge(b, a));
    expect(merge(merge(a, b), c)).toEqual(merge(a, merge(b, c)));
    for (const logs of [
      [a, b, c],
      [c, b, a],
      [b, a, c],
      [b, c, a],
      [a, c, b],
      [c, a, b],
    ])
      expect(reconcile(eventId, ...logs)).toEqual(reconcile(eventId, a, b, c));
  });
  it('converges across many shuffled partitions and repeated imports', () => {
    const all = Array.from({ length: 30 }, (_, i) =>
      record(
        i + 1,
        `TEST-${String((i % 10) + 1).padStart(3, '0')}`,
        i % 2 ? scannerA.id : scannerB.id,
      ),
    );
    for (let offset = 0; offset < all.length; offset++) {
      const shuffled = [
        ...all.slice(offset),
        ...all.slice(0, offset),
      ].reverse();
      let state: readonly ReturnType<typeof record>[] = [];
      for (const item of [...shuffled, ...all])
        state = mergeLogs(eventId, state, [item]).operations;
      expect(reconcile(eventId, state)).toEqual(reconcile(eventId, all));
    }
  });
  it('rejects mismatched event IDs', () => {
    expect(() =>
      reconcile(eventId, [{ ...record(1), eventId: 'other-event' }]),
    ).toThrow('Event mismatch');
    expect(() =>
      createCheckIn(
        eventId,
        { id: 'TEST-001', label: 'test', eventId: 'other-event' },
        scannerA,
        [],
        record(1).operationId,
        record(1).recordedAt,
      ),
    ).toThrow('Event mismatch');
  });
  it('rejects divergent operation ID reuse in either order, even within one batch', () => {
    const a = record(1);
    const b = { ...a, ticketId: 'TEST-002' };
    for (const list of [
      [a, b],
      [b, a],
    ])
      expect(() => reconcile(eventId, list)).toThrow('ID collision');
  });
  it('rejects malformed records and noncanonical timestamps rather than changing identities in transit', () => {
    expect(() =>
      reconcile(eventId, [{ ...record(1), operationId: 'bad' }]),
    ).toThrow();
    expect(() =>
      reconcile(eventId, [
        { ...record(1), recordedAt: '2026-10-27T10:00:00Z' },
      ]),
    ).toThrow();
  });
});
