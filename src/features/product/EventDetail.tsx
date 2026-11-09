import { SecureSyncPanel } from './SecureSyncPanel';
import { AttendanceReview } from './AttendanceReview';
import { useCallback, useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { trustedSnapshot } from '../security/operations';
import { ScannerAuthority } from './ScannerAuthority';
import { useLiveData, eventDate, href } from './shared';
import { StorageFailure } from './StorageFailure';
import { EventForm } from './EventForm';
import { AttendeeManager } from './AttendeeManager';
import { TicketManager } from './TicketManager';
import { EventOverview } from './EventOverview';
import { LoadingState, ViewTabs } from './ProductUI';
import { DeviceExport } from './Provisioning';
export function EventDetail({ db, id }: { db: EntryLoopDB; id: string }) {
  const tabs = [
    'Overview',
    'Guest list',
    'Tickets',
    'Scanner devices',
    'Attendance & sync',
    'Event details',
  ];
  const [view, setViewState] = useState(
    () =>
      tabs.find(
        (tab) => encodeURIComponent(tab) === window.location.hash.slice(1),
      ) ?? 'Overview',
  );
  function setView(tab: string) {
    setViewState(tab);
    window.history.replaceState(
      null,
      '',
      window.location.pathname +
        window.location.search +
        '#' +
        encodeURIComponent(tab),
    );
  }
  const query = useCallback(
    async () => ({
      event: await db.events.get(id),
      attendees: await db.attendees.where('eventId').equals(id).toArray(),
      tickets: await db.issuedTickets.where('eventId').equals(id).toArray(),
      snapshot: await trustedSnapshot(db, id),
      credentials: await db.credentials.where('e').equals(id).toArray(),
    }),
    [db, id],
  );
  const { data, error } = useLiveData(query);
  if (error) return <StorageFailure error={error} database={db.name} />;
  if (!data) return <LoadingState>Opening event…</LoadingState>;
  const { event, attendees, tickets, snapshot } = data;
  if (!event)
    return (
      <div className="empty-state">
        <h1>Event not found</h1>
        <p>
          This event is not stored in this device’s current workspace. Keep the
          original browser and address; do not clear storage or create a
          replacement to recover it. See recovery help below.
        </p>
        <a href={href('/')}>Back to events</a>
      </div>
    );
  if (event.role !== 'organizer')
    return (
      <div>
        <h1>Prepared scanner event</h1>
        <p>
          This device can verify tickets; it does not have the organizer’s
          signing key or attendee list.
        </p>
        <a className="button primary" href={href(`/scan/${id}`)}>
          Open check-in
        </a>
      </div>
    );
  const attendance = snapshot.state;
  const eventMetrics = (
    <div className="event-metrics">
      <div>
        <span>On the guest list</span>
        <strong data-testid="attendee-count">{attendees.length}</strong>
      </div>
      <div>
        <span>Tickets issued</span>
        <strong data-testid="issued-count">{tickets.length}</strong>
      </div>
      <div>
        <span>Trusted check-ins locally</span>
        <strong>{attendance.attendance}</strong>
      </div>
      <div>
        <span>Admission conflicts</span>
        <strong className={attendance.conflicts.length ? 'danger-text' : ''}>
          {attendance.conflicts.length}
        </strong>
      </div>
    </div>
  );
  return (
    <>
      <a className="back-link" href={href('/')}>
        ← All events
      </a>
      <div className="workspace-heading">
        <div>
          <h1>{event.name}</h1>
          <p>
            {eventDate(event.date)} · {event.location}
          </p>
        </div>
        <a className="button" href={href(`/scan/${id}`)}>
          Open check-in
        </a>
      </div>
      {view === 'Overview' ? (
        eventMetrics
      ) : (
        <details className="compact-event-totals">
          <summary>
            {attendees.length} guests · {tickets.length} tickets ·{' '}
            {attendance.attendance} admissions received here
          </summary>
          {eventMetrics}
        </details>
      )}
      <ViewTabs
        label="Event workspace"
        items={tabs}
        value={view}
        onChange={setView}
        prefix="event-tab"
      />
      <div
        id="event-tab-panel"
        role="tabpanel"
        aria-labelledby={`event-tab-${tabs.indexOf(view)}`}
        className="event-tab-panel"
      >
        {view === 'Overview' && (
          <EventOverview
            event={event}
            guests={attendees.length}
            issued={tickets.length}
            credentials={data.credentials}
            policy={snapshot.policy}
            conflicts={attendance.conflicts.length}
            operations={attendance.operations}
            onView={setView}
          />
        )}
        {view === 'Guest list' && (
          <AttendeeManager
            db={db}
            eventId={id}
            attendees={attendees}
            tickets={tickets}
          />
        )}
        {view === 'Tickets' && (
          <TicketManager
            event={event}
            attendees={attendees}
            tickets={tickets}
          />
        )}
        {view === 'Scanner devices' && (
          <>
            <DeviceExport db={db} event={event} issuedCount={tickets.length} />
            <ScannerAuthority db={db} event={event} />
          </>
        )}
        {view === 'Attendance & sync' && (
          <section aria-label="Organizer attendance and synchronization">
            <h2>Attendance and synchronization</h2>
            <p>
              These totals include only signed admissions stored here. Receive
              the entrance logs before reviewing them; disconnected entrances
              may hold additional records.
            </p>
            <p>
              The organizer must explicitly authorize its own scanner identity
              to exchange signed records. This grants admission authority too;
              it is not a read-only credential.
            </p>
            <button onClick={() => setView('Scanner devices')}>
              Open scanner authorization
            </button>
            <p data-testid="organizer-attendance">
              {attendance.attendance} unique tickets ·{' '}
              {attendance.operations.length} operations ·{' '}
              {attendance.conflicts.length} conflicts
            </p>
            <SecureSyncPanel db={db} eventId={id} />
            <AttendanceReview
              records={attendance.operations}
              scannerId=""
              conflicts={attendance.conflicts}
              attendees={attendees}
            />
          </section>
        )}
        {view === 'Event details' && (
          <section className="event-details">
            <h2>Event details</h2>
            <p>
              Stable event ID: <code>{event.id}</code>
            </p>
            <EventForm db={db} event={event} />
          </section>
        )}
      </div>
    </>
  );
}
