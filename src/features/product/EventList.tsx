import { useCallback } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { trustedSnapshot } from '../security/operations';
import { useLiveData, href, eventDate } from './shared';
import { StorageFailure } from './StorageFailure';
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
  if (error) return <StorageFailure error={error} database={db.name} />;
  return (
    <>
      <div className="workspace-heading">
        <div>
          <h1>{scanner ? 'Event check-in' : 'Your events'}</h1>
          <p>
            {scanner
              ? 'Prepare your phone, then welcome guests — even without internet.'
              : 'Bring people together. Keep the doors moving.'}
          </p>
        </div>
        {!scanner && (
          <a className="button primary" href={href('/events/new')}>
            Create event
          </a>
        )}
      </div>
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
                      <span>{attendance} check-ins received here</span>
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
                    : 'No events saved here yet.'}
                </h2>
                <p>
                  {scanner
                    ? 'Import an event package from the organizer, confirm their key, then check signed tickets without a server.'
                    : 'Nothing is saved in this browser workspace yet. If you created an event before, open Storage context and recovery below before making another. Your event may be in a different browser or workspace.'}
                </p>
                {!scanner && (
                  <a className="button primary" href={href('/events/new')}>
                    Create an event in this workspace
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
