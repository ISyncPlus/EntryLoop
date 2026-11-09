import type { ManagedEvent } from '../events/models';
import type { CheckInRecord } from '../check-in/domain/models';
import type { Credential, Policy } from '../security/models';
export function EventOverview({
  event,
  guests,
  issued,
  credentials,
  policy,
  conflicts,
  operations,
  onView,
}: {
  event: ManagedEvent;
  guests: number;
  issued: number;
  credentials: Credential[];
  policy: Policy | undefined;
  conflicts: number;
  operations: readonly CheckInRecord[];
  onView: (tab: string) => void;
}) {
  const active = credentials.filter(
    (c) =>
      policy && c.at <= policy.epoch && !policy.revokedScanners.includes(c.d),
  );
  const next = !guests
    ? {
        title: 'Start with your guests',
        text: 'Add a guest or bring your list from a spreadsheet.',
        tab: 'Guest list',
        action: 'Build guest list',
      }
    : issued < guests
      ? {
          title: 'Give every guest a ticket',
          text: `${guests - issued} guests are waiting for their signed admission ticket.`,
          tab: 'Guest list',
          action: 'Issue remaining tickets',
        }
      : !active.length
        ? {
            title: 'Prepare your entrances',
            text: 'Your tickets are ready. Prepare and approve each phone before the doors open.',
            tab: 'Scanner devices',
            action: 'Prepare an entrance',
          }
        : conflicts
          ? {
              title: 'Review admission conflicts',
              text: 'The same ticket was admitted independently. Both admissions are preserved for review.',
              tab: 'Attendance & sync',
              action: 'Review conflicts',
            }
          : {
              title: 'Bring the entrances together',
              text: 'Receive records from each entrance to review attendance on this device.',
              tab: 'Attendance & sync',
              action: 'Review attendance',
            };
  return (
    <section className="event-overview" aria-label="Event overview">
      <div className="next-action">
        <div>
          <h2>{next.title}</h2>
          <p>{next.text}</p>
        </div>
        <button className="primary" onClick={() => onView(next.tab)}>
          {next.action}
        </button>
      </div>
      <div className="overview-columns">
        <section>
          <h2>Before the doors open</h2>
          <div className="issuance-progress">
            <div>
              <span>Ticket issuance</span>
              <strong>
                {issued} / {guests} guests
              </strong>
            </div>
            {guests > 0 && (
              <progress
                aria-label="Ticket issuance"
                value={issued}
                max={guests}
              />
            )}
            <p>
              {guests
                ? guests === issued
                  ? 'Every guest on this list has a signed ticket.'
                  : `${guests - issued} guests still need tickets.`
                : 'Add guests to begin issuing tickets.'}
            </p>
          </div>
          <ol className="setup-list">
            <li>
              <span className={guests ? 'step-status done' : 'step-status'}>
                {guests ? 'Added' : 'To do'}
              </span>
              <div>
                <button
                  className="text-action"
                  onClick={() => onView('Guest list')}
                >
                  Build your guest list
                </button>
                <p>{guests} guests on this device</p>
              </div>
            </li>
            <li>
              <span
                className={
                  issued && issued === guests
                    ? 'step-status done'
                    : 'step-status'
                }
              >
                {issued && issued === guests ? 'Issued' : 'To do'}
              </span>
              <div>
                <button
                  className="text-action"
                  onClick={() => onView('Tickets')}
                >
                  Share admission tickets
                </button>
                <p>
                  {issued} of {guests} guests have a signed ticket
                </p>
              </div>
            </li>
            <li>
              <span
                className={active.length ? 'step-status done' : 'step-status'}
              >
                {active.length ? 'Approved' : 'To do'}
              </span>
              <div>
                <button
                  className="text-action"
                  onClick={() => onView('Scanner devices')}
                >
                  Prepare and approve phones
                </button>
                <p>
                  {active.length} authorized identities known here. Approval
                  does not prove a phone is cached or ready offline.
                </p>
              </div>
            </li>
          </ol>
        </section>
        <aside className="event-brief">
          <h2>At a glance</h2>
          <p>{event.description || 'No description added.'}</p>
          <dl>
            <div>
              <dt>Authorized identities known here</dt>
              <dd>{active.length}</dd>
            </div>
            <div>
              <dt>Revoked identities known here</dt>
              <dd>{credentials.length - active.length}</dd>
            </div>
            <div>
              <dt>Policy revision installed here</dt>
              <dd>{policy?.epoch ?? 'Not installed'}</dd>
            </div>
          </dl>
          <p>
            Attendance is local to each device until records are exchanged.
            Offline entrances can admit the same ticket independently.
          </p>
          <button
            className="text-action"
            onClick={() => onView('Event details')}
          >
            Edit event details
          </button>
        </aside>
      </div>
      <section className="overview-received">
        <div className="section-heading">
          <div>
            <h2>Records received on this device</h2>
            <p>
              Signed admissions available here. Other entrances may hold
              additional records.
            </p>
          </div>
          <button onClick={() => onView('Attendance & sync')}>
            Review attendance & conflicts
          </button>
        </div>
        {operations.length ? (
          <ul className="admission-list">
            {operations.slice(0, 3).map((record) => (
              <li key={record.operationId}>
                <div>
                  <strong>{record.ticketId}</strong>
                  <span>
                    Saved signed admission · full evidence available in
                    Attendance & sync
                  </span>
                </div>
                <span className="state-tag good">Received here</span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state compact">
            <h3>No admissions received yet</h3>
            <p>
              When your entrances start checking tickets, exchange their records
              to bring attendance here.
            </p>
          </div>
        )}
      </section>
    </section>
  );
}
