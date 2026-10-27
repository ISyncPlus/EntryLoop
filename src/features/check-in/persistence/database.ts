import Dexie, { type Table } from 'dexie';
import type { CheckInRecord, ScannerDevice, Ticket } from '../domain/models';
import { createCheckIn, mergeLogs } from '../domain/reconcile';
import { requireSyntheticTicket } from '../domain/fixtures';
import { decodeTransfer } from '../../sync/codec';
import { BatchRejectedError } from '../../sync/rejection';
export function scannerProfile(search: string): string {
  const profile = new URLSearchParams(search).get('scanner') ?? 'main';
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(profile))
    throw new Error(
      'Scanner profile must be 1–32 letters, numbers, underscores or hyphens.',
    );
  return profile;
}
export class EntryLoopDB extends Dexie {
  operations!: Table<CheckInRecord, [string, string]>;
  devices!: Table<ScannerDevice, string>;
  constructor(profile: string) {
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(profile))
      throw new Error('Invalid scanner profile.');
    super(`entryloop-v1-${profile}`);
    this.version(1).stores({
      operations: '[eventId+operationId],eventId',
      devices: 'id',
    });
  }
  async scanner(): Promise<ScannerDevice> {
    return this.transaction('rw', this.devices, async () => {
      const existing = await this.devices.toCollection().first();
      if (existing) return existing;
      const device = {
        id: crypto.randomUUID(),
        label: this.name.replace('entryloop-v1-', ''),
      };
      await this.devices.add(device);
      return device;
    });
  }
  records(eventId: string): Promise<CheckInRecord[]> {
    return this.operations.where('eventId').equals(eventId).toArray();
  }
  async admit(ticket: Ticket): Promise<CheckInRecord> {
    requireSyntheticTicket(ticket.eventId, ticket.id);
    const scanner = await this.scanner();
    return this.transaction('rw', this.operations, async () => {
      const local = await this.records(ticket.eventId);
      const record = createCheckIn(
        ticket.eventId,
        ticket,
        scanner,
        local,
        crypto.randomUUID(),
        new Date().toISOString(),
      );
      await this.operations.add(record);
      return record;
    });
  }
  async importTransfer(eventId: string, payload: string) {
    // WebCrypto must complete before entering an IndexedDB transaction.
    const envelope = await decodeTransfer(payload, eventId);
    try {
      for (const record of envelope.records)
        requireSyntheticTicket(eventId, record.ticketId);
      return await this.transaction('rw', this.operations, async () => {
        const local = await this.records(eventId);
        const result = mergeLogs(eventId, local, envelope.records);
        const known = new Set(local.map((record) => record.operationId));
        await this.operations.bulkAdd(
          result.operations.filter((record) => !known.has(record.operationId)),
        );
        return result;
      });
    } catch (failure) {
      throw new BatchRejectedError(
        failure instanceof Error ? failure.message : 'Local import failed.',
        envelope.records.length,
      );
    }
  }

  async resetEvent(eventId: string): Promise<void> {
    await this.operations.where('eventId').equals(eventId).delete();
  }
}
