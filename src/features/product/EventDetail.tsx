import { useCallback, useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { trustedSnapshot } from '../security/operations';
import { ScannerAuthority } from './ScannerAuthority';
import { useLiveData, eventDate, href, navigateTabs } from './shared';
import { Feedback } from './Feedback';
import { EventForm } from './EventForm';
import { AttendeeManager } from './AttendeeManager';
import { TicketManager } from './TicketManager';
import { DeviceExport } from './Provisioning';
export function EventDetail({ db, id }: { db: EntryLoopDB; id: string }) {
  const [view, setView] = useState('Guest list');
  const query = useCallback(
    async () => ({
      event: await db.events.get(id),
      attendees: await db.attendees.where('eventId').equals(id).toArray(),
      tickets: await db.issuedTickets.where('eventId').equals(id).toArray(),
      snapshot: await trustedSnapshot(db, id),
    }),
    [db, id],
  );
  const { data, error } = useLiveData(query);
  if (error) return <Feedback error={error} />;
  if (!data) return <p role="status">Opening event…</p>;
  const { event, attendees, tickets, snapshot } = data;
  if (!event)
    return (
      <div className="empty-state">
        <h1>Event not found</h1>
        <p>This event is not stored in this device’s current profile.</p>
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
      <div
        className="view-tabs"
        role="tablist"
        aria-label="Event workspace"
        onKeyDown={navigateTabs}
      >
        {['Guest list', 'Tickets', 'Scanner devices', 'Event details'].map(
          (tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={view === tab}
              tabIndex={view === tab ? 0 : -1}
              aria-controls="event-tab-panel"
              id={`tab-${tab.replaceAll(' ', '-')}`}
              onClick={() => setView(tab)}
            >
              {tab}
            </button>
          ),
        )}
      </div>
      <div
        id="event-tab-panel"
        role="tabpanel"
        aria-labelledby={`tab-${view.replaceAll(' ', '-')}`}
        className="event-tab-panel"
      >
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
