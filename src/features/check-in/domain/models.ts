import { z } from 'zod';
export const eventIdSchema = z.string().regex(/^[a-z0-9-]{1,40}$/);
export const ticketIdSchema = z.string().regex(/^[A-Z0-9-]{1,24}$/);
export const recordSchema = z
  .object({
    operationId: z.uuid(),
    eventId: eventIdSchema,
    ticketId: ticketIdSchema,
    scannerId: z.uuid(),
    recordedAt: z.iso.datetime().refine((value) => {
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.toISOString() === value;
    }, 'Timestamp must be canonical UTC with milliseconds.'),
  })
  .strict();
export type Event = Readonly<{ id: string; name: string }>;
export type Ticket = Readonly<{ id: string; eventId: string; label: string }>;
export type ScannerDevice = Readonly<{ id: string; label: string }>;
export type CheckInRecord = Readonly<z.infer<typeof recordSchema>>;
export type AdmissionConflict = Readonly<{
  ticketId: string;
  operationIds: readonly string[];
}>;
export type Attendance = Readonly<{
  operations: readonly CheckInRecord[];
  attendance: number;
  conflicts: readonly AdmissionConflict[];
}>;
export type SyncEnvelope = Readonly<{
  version: 1;
  eventId: string;
  records: readonly CheckInRecord[];
  checksum: string;
}>;
export type SyncResult = Attendance &
  Readonly<{
    transferred: number;
    imported: number;
    skipped: number;
    rejected: number;
  }>;
