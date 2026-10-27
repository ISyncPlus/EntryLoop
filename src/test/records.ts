import type {
  CheckInRecord,
  ScannerDevice,
} from '../features/check-in/domain/models';
export const eventId = 'launchpad-lab';
export const scannerA: ScannerDevice = {
  id: '11111111-1111-4111-8111-111111111111',
  label: 'A',
};
export const scannerB: ScannerDevice = {
  id: '22222222-2222-4222-8222-222222222222',
  label: 'B',
};
export function record(
  n: number,
  ticketId = `TEST-${String(n).padStart(3, '0')}`,
  scannerId = scannerA.id,
): CheckInRecord {
  return {
    operationId: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    eventId,
    ticketId,
    scannerId,
    recordedAt: '2026-10-27T10:00:00.000Z',
  };
}
