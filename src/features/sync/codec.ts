import { z } from 'zod';
import { BatchRejectedError } from './rejection';
import { eventIdSchema, ticketIdSchema } from '../check-in/domain/models';
import type { CheckInRecord, SyncEnvelope } from '../check-in/domain/models';
import { reconcile } from '../check-in/domain/reconcile';
export const MAX_RECORDS = 5;
export const MAX_PAYLOAD_BYTES = 900;
const tupleSchema = z.tuple([
  z.uuid(),
  ticketIdSchema,
  z.uuid(),
  z.number().int().min(0).max(8640000000000000),
]);
const wireSchema = z
  .object({
    v: z.literal(1),
    e: eventIdSchema,
    r: z.array(tupleSchema).min(1).max(MAX_RECORDS),
    h: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const utf8 = new TextEncoder();
export const payloadBytes = (text: string): number => utf8.encode(text).length;
function capacity(text: string): void {
  if (payloadBytes(text) > MAX_PAYLOAD_BYTES)
    throw new Error(
      `Payload exceeds supported capacity (${MAX_PAYLOAD_BYTES} UTF-8 bytes). Select fewer records.`,
    );
}
async function digest(text: string): Promise<string> {
  if (!globalThis.crypto?.subtle)
    throw new Error('SHA-256 requires a secure origin (HTTPS or localhost).');
  const hash = await crypto.subtle.digest('SHA-256', utf8.encode(text));
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}
export async function encodeTransfer(
  eventId: string,
  records: readonly CheckInRecord[],
): Promise<string> {
  if (!records.length || records.length > MAX_RECORDS)
    throw new Error(
      `Select 1–${MAX_RECORDS} records. Larger batches are unsupported; nothing was truncated.`,
    );
  reconcile(eventId, records);
  const body = {
    v: 1 as const,
    e: eventId,
    r: records.map((record) => [
      record.operationId,
      record.ticketId,
      record.scannerId,
      Date.parse(record.recordedAt),
    ]),
  };
  const envelope = { ...body, h: await digest(JSON.stringify(body)) };
  wireSchema.parse(envelope);
  const text = JSON.stringify(envelope);
  capacity(text);
  return text;
}
export async function decodeTransfer(
  text: string,
  expectedEventId: string,
): Promise<SyncEnvelope> {
  capacity(text);
  let input: unknown;
  try {
    input = JSON.parse(text);
  } catch {
    throw new Error('Corrupted payload: invalid JSON.');
  }
  if (
    typeof input === 'object' &&
    input !== null &&
    'v' in input &&
    input.v !== 1
  )
    throw new Error(
      'Unsupported payload version. This workbench supports version 1.',
    );
  const parsed = wireSchema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      'Invalid payload schema or record capacity. Batch rejected.',
    );
  const { v, e, r, h } = parsed.data;
  if ((await digest(JSON.stringify({ v, e, r }))) !== h)
    throw new BatchRejectedError(
      'Corrupted payload: SHA-256 checksum mismatch.',
      r.length,
    );
  if (e !== expectedEventId)
    throw new BatchRejectedError(
      'Event mismatch. Select the matching event before importing.',
      r.length,
    );
  const records = r.map(([operationId, ticketId, scannerId, time]) => ({
    operationId,
    eventId: e,
    ticketId,
    scannerId,
    recordedAt: new Date(time).toISOString(),
  }));
  try {
    reconcile(e, records);
  } catch (failure) {
    throw new BatchRejectedError(
      failure instanceof Error ? failure.message : 'Invalid operations.',
      r.length,
    );
  }
  return { version: v, eventId: e, records, checksum: h };
}
