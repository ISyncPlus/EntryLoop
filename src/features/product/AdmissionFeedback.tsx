import type { CheckInRecord } from '../check-in/domain/models';
export function AdmissionFeedback({
  last,
  error,
  busy,
}: {
  last: CheckInRecord | null;
  error: string;
  busy: boolean;
}) {
  let title = 'Ticket not accepted';
  let next =
    'Ask the organizer for help. No admission was saved for this attempt.';
  if (/already|duplicate/i.test(error)) {
    title = 'Already checked in here';
    next =
      'Keep the entrance moving. Check the earlier admission before trying again.';
  } else if (/wrong event/i.test(error)) {
    title = 'Ticket for another event';
    next = 'Confirm the guest has the ticket for the event named above.';
  } else if (/revoked/i.test(error)) {
    title = 'Approval withdrawn';
    next =
      'Stop this admission and ask the organizer to review the current event policy.';
  } else if (/not authorized|unauthorized|credential|enroll/i.test(error)) {
    title = 'This phone needs approval';
    next =
      'Open Scanner authorization and policy above. Ask the organizer to approve this entrance.';
  } else if (/unknown issued ticket|unknown ticket/i.test(error)) {
    title = 'Ticket not in this phone’s event package';
    next =
      'Ask the organizer for the latest event package. Do not bypass ticket verification.';
  } else if (/signature/i.test(error)) {
    title = 'Ticket could not be verified';
    next =
      'Ask the guest for the original ticket. Do not admit using an altered code.';
  }
  return (
    <div className="admission-feedback" aria-atomic="true">
      {busy && <p role="status">Verifying signature and saving locally…</p>}
      {last && (
        <div className="admission-success" role="status">
          <span>Admitted</span>
          <p>Ticket verified. Admission signed and saved on this device.</p>
          <strong>{last.ticketId}</strong>
          <p>Ready for the next guest — use Scan with camera again.</p>
          <time dateTime={last.recordedAt}>
            {new Date(last.recordedAt).toLocaleTimeString()}
          </time>
        </div>
      )}
      {error && (
        <div className="admission-rejected" role="alert">
          <strong>Not admitted · {title}</strong>
          <p>{next}</p>
          <p className="fine-print">{error}</p>
        </div>
      )}
    </div>
  );
}
