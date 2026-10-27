import Dexie, { type Table } from 'dexie';
import type { CheckInRecord, ScannerDevice, Ticket } from '../domain/models';
import { createCheckIn, mergeLogs } from '../domain/reconcile';
import { requireSyntheticTicket } from '../domain/fixtures';
import { decodeTransfer } from '../../sync/codec';
import { BatchRejectedError } from '../../sync/rejection';
import type {
  ManagedEvent,
  Attendee,
  IssuedTicket,
  CatalogTicket,
  SigningKey,
} from '../../events/models';
import type {
  ScannerKey,
  Policy,
  Credential,
  OperationProof,
} from '../../security/models';
import type { SyncSession } from '../../security/exchange';
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
  events!: Table<ManagedEvent, string>;
  attendees!: Table<Attendee, string>;
  issuedTickets!: Table<IssuedTicket, [string, string]>;
  ticketCatalog!: Table<CatalogTicket, [string, string]>;
  signingKeys!: Table<SigningKey, string>;
  scannerKeys!: Table<ScannerKey, string>;
  policies!: Table<Policy, [string, number]>;
  credentials!: Table<Credential, [string, string]>;
  operationProofs!: Table<OperationProof, [string, string]>;
  syncSessions!: Table<SyncSession, string>;
  constructor(profile: string) {
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(profile))
      throw new Error('Invalid scanner profile.');
    super(`entryloop-v1-${profile}`);
    this.version(1).stores({
      operations: '[eventId+operationId],eventId',
      devices: 'id',
    });
    this.version(2).stores({
      events: 'id,role,date',
      attendees: 'id,eventId,&[eventId+email],&[eventId+ticketId]',
      issuedTickets: '[eventId+ticketId],eventId,attendeeId',
      ticketCatalog: '[eventId+ticketId],eventId',
      signingKeys: 'eventId',
    });
    this.version(3).stores({
      scannerKeys: 'id',
      policies: '[eventId+epoch],eventId',
      credentials: '[e+d],e',
      operationProofs: '[eventId+operationId],eventId',
      syncSessions: 'id,eventId,direction',
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
    if (eventId !== 'launchpad-lab' && eventId !== 'community-lab')
      throw new Error(
        'Unsigned transfers are restricted to the synthetic workbench. Use authenticated synchronization.',
      );
    // WebCrypto must complete before entering an IndexedDB transaction.
    const envelope = await decodeTransfer(payload, eventId);
    try {
      return await this.transaction(
        'rw',
        this.operations,
        this.ticketCatalog,
        async () => {
          for (const record of envelope.records) {
            if (eventId === 'launchpad-lab' || eventId === 'community-lab')
              requireSyntheticTicket(eventId, record.ticketId);
            else if (
              !(await this.ticketCatalog.get([eventId, record.ticketId]))
            )
              throw new Error(
                'Unknown issued ticket. Prepare this device with an updated event package.',
              );
          }
          const local = await this.records(eventId);
          const result = mergeLogs(eventId, local, envelope.records);
          const known = new Set(local.map((record) => record.operationId));
          await this.operations.bulkAdd(
            result.operations.filter(
              (record) => !known.has(record.operationId),
            ),
          );
          return result;
        },
      );
    } catch (failure) {
      throw new BatchRejectedError(
        failure instanceof Error ? failure.message : 'Local import failed.',
        envelope.records.length,
      );
    }
  }

  async resetEvent(eventId: string): Promise<void> {
    if (eventId !== 'launchpad-lab' && eventId !== 'community-lab')
      throw new Error('Only synthetic test data can be reset here.');
    await this.operations.where('eventId').equals(eventId).delete();
  }
}
