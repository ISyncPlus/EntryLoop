import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import type { ManagedEvent } from '../events/models';
import { createEvent, updateEvent } from '../events/repository';
import { href, message } from './shared';
import { Feedback } from './Feedback';
export function EventForm({
  db,
  event,
}: {
  db: EntryLoopDB;
  event?: ManagedEvent;
}) {
  const [fields, setFields] = useState({
    name: event?.name ?? '',
    date: event?.date ?? '',
    location: event?.location ?? '',
    description: event?.description ?? '',
  });
  const [baseRevision, setBaseRevision] = useState(event?.revision);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (event) {
        await updateEvent(db, event.id, fields, baseRevision!);
        setBaseRevision(baseRevision! + 1);
        setNotice('Event saved. Re-export scanner packages after any change.');
      } else {
        const created = await createEvent(db, fields);
        window.location.assign(href(`/events/${created.id}`));
      }
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="event-form" onSubmit={(e) => void save(e)}>
      {event?.locked && (
        <p className="notice-strip">
          Tickets or scanner packages already exist. Name, date and location are
          locked; the description remains editable.
        </p>
      )}
      <div className="form-grid">
        <label>
          Event name
          <input
            name="name"
            required
            maxLength={100}
            value={fields.name}
            disabled={event?.locked || busy}
            onChange={(e) => setFields({ ...fields, name: e.target.value })}
          />
        </label>
        <label>
          Event date
          <input
            name="date"
            type="date"
            required
            value={fields.date}
            disabled={event?.locked || busy}
            onChange={(e) => setFields({ ...fields, date: e.target.value })}
          />
        </label>
      </div>
      <label>
        Location
        <input
          name="location"
          required
          maxLength={160}
          value={fields.location}
          disabled={event?.locked || busy}
          onChange={(e) => setFields({ ...fields, location: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          value={fields.description}
          disabled={busy}
          onChange={(e) =>
            setFields({ ...fields, description: e.target.value })
          }
        />
      </label>
      <Feedback error={error} notice={notice} />
      {event && baseRevision !== event.revision && (
        <button
          type="button"
          onClick={() => {
            setFields({
              name: event.name,
              date: event.date,
              location: event.location,
              description: event.description,
            });
            setBaseRevision(event.revision);
            setError('');
          }}
        >
          Reload current event details (discard draft)
        </button>
      )}
      <div className="action-row">
        <button className="primary" disabled={busy}>
          {busy ? 'Saving locally…' : event ? 'Save event' : 'Create event'}
        </button>
        {!event && <a href={href('/')}>Cancel</a>}
      </div>
      {!event && (
        <p className="fine-print">
          Creates an event and a private signing key on this device. Keep this
          browser’s data: no cloud copy or key recovery is available.
        </p>
      )}
    </form>
  );
}
