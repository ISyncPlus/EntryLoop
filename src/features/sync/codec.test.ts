import { describe, expect, it } from 'vitest';
import {
  decodeTransfer,
  encodeTransfer,
  MAX_PAYLOAD_BYTES,
  MAX_RECORDS,
  payloadBytes,
} from './codec';
import { eventId, record } from '../../test/records';
describe('QR payload v1', () => {
  it('round trips a real bounded batch with millisecond identity preserved', async () => {
    const records = Array.from({ length: MAX_RECORDS }, (_, i) =>
      record(i + 1),
    );
    const payload = await encodeTransfer(eventId, records);
    expect(payloadBytes(payload)).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES);
    expect(await decodeTransfer(payload, eventId)).toMatchObject({
      version: 1,
      eventId,
      records,
    });
  });
  it('normalizes wire object key ordering before verifying checksum', async () => {
    const wire = JSON.parse(
      await encodeTransfer(eventId, [record(1)]),
    ) as Record<string, unknown>;
    expect(
      (
        await decodeTransfer(
          JSON.stringify({ h: wire.h, r: wire.r, e: wire.e, v: wire.v }),
          eventId,
        )
      ).records,
    ).toEqual([record(1)]);
  });
  it('rejects corrupted content', async () => {
    const payload = await encodeTransfer(eventId, [record(1)]);
    await expect(
      decodeTransfer(payload.replace('TEST-001', 'TEST-002'), eventId),
    ).rejects.toThrow('checksum mismatch');
  });
  it.each([
    '',
    '{broken',
    'null',
    '[]',
    '{}',
    '{"v":1,"e":"launchpad-lab","r":[],"h":"x"}',
  ])('rejects invalid payload %s', async (input) => {
    await expect(decodeTransfer(input, eventId)).rejects.toThrow();
  });
  it('explains unsupported versions', async () => {
    await expect(decodeTransfer('{"v":99}', eventId)).rejects.toThrow(
      'Unsupported payload version',
    );
  });
  it('rejects event mismatch', async () => {
    await expect(
      decodeTransfer(
        await encodeTransfer(eventId, [record(1)]),
        'community-lab',
      ),
    ).rejects.toThrow('Event mismatch');
  });
  it('never truncates over-capacity batches or oversized input', async () => {
    await expect(
      encodeTransfer(
        eventId,
        Array.from({ length: 6 }, (_, i) => record(i + 1)),
      ),
    ).rejects.toThrow('nothing was truncated');
    await expect(encodeTransfer(eventId, [])).rejects.toThrow('Select');
    await expect(
      decodeTransfer('x'.repeat(MAX_PAYLOAD_BYTES + 1), eventId),
    ).rejects.toThrow('capacity');
    await expect(decodeTransfer('é'.repeat(451), eventId)).rejects.toThrow(
      'capacity',
    );
  });
  it('rejects integrity-valid but internally divergent operation identities', async () => {
    await expect(
      encodeTransfer(eventId, [
        record(1),
        { ...record(1), ticketId: 'TEST-002' },
      ]),
    ).rejects.toThrow('collision');
  });
});
