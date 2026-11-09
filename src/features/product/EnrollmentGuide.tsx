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
  outgoing: 'request' | 'approval' | 'policy' | null;
  reviewing: boolean;
}) {
  const stage = revoked
    ? 'Approval withdrawn'
    : outgoing === 'policy'
      ? 'Share the updated policy'
      : outgoing === 'approval'
        ? 'Return approval to the phone'
        : outgoing === 'request'
          ? 'Show this enrollment request'
          : authorized
            ? 'Ready to admit guests'
            : organizer
              ? reviewing
                ? 'Review this entrance'
                : 'Approve an entrance phone'
              : 'Prepare this phone';
  const instruction = revoked
    ? 'Do not admit guests with this identity. Ask the organizer to prepare a new device identity; do not clear this phone’s stored evidence.'
    : outgoing === 'policy'
      ? 'Every entrance needs this signed policy update. Disconnected devices cannot learn it until you transfer it to them.'
      : outgoing === 'approval'
        ? 'Keep the requesting phone nearby. It must scan this approval, then show Authorized for this event.'
        : outgoing === 'request'
          ? organizer
            ? 'This is this computer’s own request, not an approval for a phone. Use Authorize this device only if this computer needs to admit guests or receive signed records.'
            : 'Organizer scans the QR shown on this phone. Keep this screen open so they can compare your full fingerprint directly. Then use this phone to scan their approval.'
          : authorized
            ? 'Approval is stored for this event. Confirm the latest event package and policy with the organizer, then test an offline reload before your shift.'
            : organizer
              ? reviewing
                ? 'Check the phone in front of you. Compare every fingerprint character on that phone before you approve it.'
                : 'Ask staff to prepare the event package and show their request. Scan it below to review the intended phone.'
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
