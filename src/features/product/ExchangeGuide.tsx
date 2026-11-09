import type { SyncSession } from '../security/exchange';
export function ExchangeGuide({
  session,
  sending,
  missing,
  index,
  total,
}: {
  session: SyncSession | undefined;
  sending: boolean;
  missing: number;
  index: number;
  total: number;
}) {
  let title = sending
    ? 'Scan the receiving device’s request'
    : 'Bring the two devices together';
  let text = sending
    ? 'On the other device, choose Start receiving. Use this device’s camera or image reader below to scan its request.'
    : 'Choose which device will receive first. You can exchange records without internet. Each device must already be approved for this event.';
  if (session?.direction === 'request') {
    title = 'Show this request to the sending device';
    text =
      'Keep this screen open. The sender scans your code and returns an offer, then each numbered batch. Read those codes below.';
  }
  if (session?.direction === 'outgoing') {
    title = session.ack
      ? 'Confirmation received — review the result below'
      : `Show code ${index + 1} of ${total} to the receiving device`;
    text = session.ack
      ? 'This is a saved receipt for one snapshot. If the logs differ, exchange the other direction. New admissions can change the result.'
      : 'The receiver scans your offer first, then every batch. Advance only after they confirm each read. When finished, scan their returned confirmation.';
  }
  if (session?.direction === 'incoming') {
    title = session.ack
      ? 'Return this confirmation to the sender'
      : 'Continue reading the sender’s codes';
    text = session.ack
      ? 'Your receipt is saved. The sender must scan this code. Review whether the signed result matches; exchange the other direction if records differ.'
      : `${missing} batches still missing. Incomplete records stay staged and are not counted as admissions. If interrupted, resume this saved exchange; request only the missing batches.`;
  }
  return (
    <div className="exchange-guide" aria-live="polite">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
