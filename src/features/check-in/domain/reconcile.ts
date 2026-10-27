import { eventIdSchema, recordSchema } from './models';
import type {
  Attendance,
  CheckInRecord,
  ScannerDevice,
  SyncResult,
  Ticket,
} from './models';

// Field order is explicit: object property order must never determine record equality.
export function recordKey(record: CheckInRecord): string {
  return JSON.stringify([
    record.operationId,
    record.eventId,
    record.ticketId,
    record.scannerId,
    record.recordedAt,
  ]);
}
export function reconcile(
  eventId: string,
  ...logs: readonly (readonly CheckInRecord[])[]
): Attendance {
  eventIdSchema.parse(eventId);
  const byId = new Map<string, CheckInRecord>();
  for (const log of logs)
    for (const input of log) {
      const record = recordSchema.parse(input);
      if (record.eventId !== eventId)
        throw new Error('Event mismatch. No records written.');
      const previous = byId.get(record.operationId);
      if (previous && recordKey(previous) !== recordKey(record))
        throw new Error(
          'Operation ID collision: different contents share an ID. No records written.',
        );
      byId.set(record.operationId, record);
    }
  const operations = [...byId.values()].sort((a, b) =>
    a.operationId < b.operationId ? -1 : a.operationId > b.operationId ? 1 : 0,
  );
  const tickets = new Map<string, string[]>();
  for (const record of operations)
    tickets.set(record.ticketId, [
      ...(tickets.get(record.ticketId) ?? []),
      record.operationId,
    ]);
  const conflicts = [...tickets.entries()]
    .filter(([, ids]) => ids.length > 1)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([ticketId, operationIds]) => ({ ticketId, operationIds }));
  return { operations, attendance: tickets.size, conflicts };
}
export function mergeLogs(
  eventId: string,
  local: readonly CheckInRecord[],
  incoming: readonly CheckInRecord[],
): SyncResult {
  const state = reconcile(eventId, local, incoming);
  const known = new Set(local.map((record) => record.operationId));
  let imported = 0;
  for (const record of incoming)
    if (!known.has(record.operationId)) {
      imported++;
      known.add(record.operationId);
    }
  return {
    ...state,
    transferred: incoming.length,
    imported,
    skipped: incoming.length - imported,
    rejected: 0,
  };
}
export function createCheckIn(
  eventId: string,
  ticket: Ticket,
  scanner: ScannerDevice,
  local: readonly CheckInRecord[],
  operationId: string,
  recordedAt: string,
): CheckInRecord {
  const state = reconcile(eventId, local);
  if (ticket.eventId !== eventId)
    throw new Error('Event mismatch. No records written.');
  if (state.operations.some((record) => record.ticketId === ticket.id))
    throw new Error('Ticket already admitted in this local log.');
  const record = recordSchema.parse({
    operationId,
    eventId,
    ticketId: ticket.id,
    scannerId: scanner.id,
    recordedAt,
  });
  reconcile(eventId, local, [record]);
  return record;
}
