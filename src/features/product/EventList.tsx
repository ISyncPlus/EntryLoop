import { useCallback } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { trustedSnapshot } from '../security/operations';
import { useLiveData, href, eventDate } from './shared';
import { Feedback } from './Feedback';
import { PackageImport } from './Provisioning';
export function EventList({
  db,
  scanner = false,
}: {
  db: EntryLoopDB;
  scanner?: boolean;
}) {
  const query = useCallback(async () => {
    const events = await db.events.orderBy('date').toArray();
    return Promise.all(
      events
        .filter((event) => scanner || event.role === 'organizer')
        .map(async (event) => ({
          event,
          issued: await db.ticketCatalog
            .where('eventId')
            .equals(event.id)
            .count(),
          attendance: (await trustedSnapshot(db, event.id)).state.attendance,
        })),
    );
  }, [db, scanner]);
  const { data, error } = useLiveData(query);
  return (
    <>
      <div className="workspace-heading">
        <div>
          <h1>{scanner ? 'Choose your entrance.' : 'Your next gathering.'}</h1>
          <p>
            {scanner
              ? 'Choose a prepared event to start checking tickets.'
              : 'A guest list, a signed ticket, a confident welcome.'}
          </p>
        </div>
        {!scanner && (
          <a className="button primary" href={href('/events/new')}>
            Create event
          </a>
        )}
      </div>
      <Feedback error={error} />
      {data ? (
        <>
          {data.length > 0 ? (
            <div className="event-grid">
              {data.map(({ event, issued, attendance }) => (
                <a
                  key={event.id}
                  className="event-card"
                  href={href(
                    scanner ? `/scan/${event.id}` : `/events/${event.id}`,
                  )}
                >
                  <div className="event-date-stub">
                    <strong>
                      {new Date(event.date + 'T12:00:00Z').getUTCDate()}
                    </strong>
                    <span>
                      {new Intl.DateTimeFormat('en', {
                        month: 'short',
                        timeZone: 'UTC',
                      }).format(new Date(event.date + 'T12:00:00Z'))}
                    </span>
                  </div>
                  <div className="event-card-body">
                    <span className="state-tag">
                      {event.role === 'organizer'
                        ? 'Organizer device'
                        : 'Prepared scanner'}
                    </span>
                    <h2>{event.name}</h2>
                    <p>{event.location}</p>
                    <time dateTime={event.date}>{eventDate(event.date)}</time>
                    <div className="event-card-counts">
                      <span>{issued} issued tickets</span>
                      <span>{attendance} checked in</span>
                    </div>
                    <span className="event-card-action">
                      {scanner ? 'Open check-in' : 'Manage event'}{' '}
                      <span aria-hidden="true">↗</span>
                    </span>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-ticket">
                <span>EntryLoop</span>
                <strong>
                  {scanner ? 'No prepared events' : 'The room is yours.'}
                </strong>
                <span>
                  {scanner
                    ? 'Bring your event package.'
                    : 'Start with the details.'}
                </span>
              </div>
              <div>
                <h2>
                  {scanner
                    ? 'Prepare once. Check in offline.'
                    : 'Start with your event.'}
                </h2>
                <p>
                  {scanner
                    ? 'Import an event package from the organizer, confirm their key, then check signed tickets without a server.'
                    : 'Create your event, bring in your guest list and issue signed QR tickets. Every check-in stays on the device until you exchange it.'}
                </p>
                {!scanner && (
                  <a className="button primary" href={href('/events/new')}>
                    Create your first event
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        !error && <p role="status">Opening local events…</p>
      )}
      {scanner ? (
        <PackageImport db={db} />
      ) : (
        <aside className="local-note">
          <h2>Built for the moment the network isn’t.</h2>
          <p>
            Events, guest lists and signing keys live in this browser. Prepare
            your scanners before going offline, and keep this organizer device’s
            data safe.
          </p>
          <a href={href('/scan')}>Prepare a scanner</a>
        </aside>
      )}
    </>
  );
}
