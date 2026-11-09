export function EnrollmentGuide({
  organizer,
  authorized,
  revoked,
  outgoing,
  reviewing,
}: {
  organizer: boolean;
  authorized: boolean;
  revoked: boolean;
  outgoing: boolean;
  reviewing: boolean;
}) {
  const stage = revoked
    ? 'Approval withdrawn'
    : authorized
      ? 'Ready to admit guests'
      : organizer
        ? reviewing
          ? 'Review this entrance'
          : outgoing
            ? 'Return approval to the phone'
            : 'Approve an entrance phone'
        : outgoing
          ? 'Show your request to the organizer'
          : 'Prepare this phone';
  const instruction = revoked
    ? 'Do not admit guests with this identity. Ask the organizer to prepare a new device identity; do not clear this phone’s stored evidence.'
    : authorized
      ? 'Approval is stored for this event. Confirm the latest event package and policy with the organizer, then test an offline reload before your shift.'
      : organizer
        ? reviewing
          ? 'Check the phone in front of you. Compare every fingerprint character on that phone before you approve it.'
          : outgoing
            ? 'Keep the requesting phone nearby. It must scan this approval, then show Authorized for this event.'
            : 'Ask staff to prepare the event package and show their request. Scan it below to review the intended phone.'
        : outgoing
          ? 'Organizer scans the QR shown on this phone. Keep this screen open so they can compare your full fingerprint directly. Then use this phone to scan their approval.'
          : 'Give this phone an entrance name, then create its request. Creating a request does not grant permission to admit guests.';
  return (
    <div className="enrollment-guide">
      <span className="state-tag">
        {organizer ? 'Organizer device' : 'Entrance phone'}
      </span>
      <h3>{stage}</h3>
      <p>{instruction}</p>
      <ol className="handoff-steps" aria-label="Entrance preparation">
        <li>Prepare event</li>
        <li aria-current={!authorized ? 'step' : undefined}>
          Request & approve
        </li>
        <li aria-current={authorized ? 'step' : undefined}>
          Ready to check in
        </li>
      </ol>
    </div>
  );
}
