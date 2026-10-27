import { useState } from 'react';
import type { FormEvent } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import type { Attendee, IssuedTicket } from '../events/models';
import { addAttendees, issueTickets } from '../events/repository';
import { parseAttendeeCsv } from '../attendees/csv';
import type { CsvPreview } from '../attendees/csv';
import { downloadText } from '../tickets/export';
import { message } from './shared';
import { Feedback } from './Feedback';
export function AttendeeManager({
  db,
  eventId,
  attendees,
  tickets,
}: {
  db: EntryLoopDB;
  eventId: string;
  attendees: Attendee[];
  tickets: IssuedTicket[];
}) {
  const [search, setSearch] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [limit, setLimit] = useState(50);
  const issued = new Set(tickets.map((ticket) => ticket.attendeeId));
  const filtered = attendees.filter((row) =>
    `${row.name} ${row.email} ${row.ticketId}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  async function task(action: () => Promise<string>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      setNotice(await action());
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }
  function manual(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    void task(async () => {
      const result = await addAttendees(db, eventId, [
        { name, email: email.trim() },
      ]);
      if (result.added) {
        setName('');
        setEmail('');
      }
      return `${result.added} attendee added; ${result.skipped} duplicate skipped.`;
    });
  }
  async function csv(file: File) {
    setError('');
    setPreview(null);
    if (file.size > 1024 * 1024) {
      setError('CSV exceeds 1 MiB.');
      return;
    }
    try {
      setPreview(
        parseAttendeeCsv(
          await file.text(),
          attendees.map((row) => row.email),
        ),
      );
    } catch (failure) {
      setError(message(failure));
    }
  }
  return (
    <section className="attendee-manager" aria-label="Attendee management">
      <div className="section-heading">
        <div>
          <h2>Guest list</h2>
          <p>Names and emails stay on the organizer device.</p>
        </div>
        <button
          disabled={busy || attendees.every((row) => issued.has(row.id))}
          onClick={() =>
            void task(async () => {
              const result = await issueTickets(
                db,
                eventId,
                attendees
                  .filter((row) => !issued.has(row.id))
                  .map((row) => row.id),
              );
              return `${result.issued} tickets issued; ${result.skipped} already issued.`;
            })
          }
        >
          Issue all unissued tickets
        </button>
      </div>
      <div className="import-tools">
        <details>
          <summary>Add an attendee</summary>
          <form onSubmit={manual} className="inline-form">
            <label>
              Full name
              <input
                required
                maxLength={120}
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                autoComplete="off"
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy}>
              Add attendee
            </button>
          </form>
        </details>
        <details>
          <summary>Import from CSV</summary>
          <p>
            UTF-8 CSV with exactly <code>name,email</code> headers. Quoted
            values are supported; email matching is case-insensitive. Invalid
            rows block the whole import.
          </p>
          <button
            onClick={() =>
              downloadText(
                'entryloop-attendees-template.csv',
                'name,email\n',
                'text/csv',
              )
            }
          >
            Download CSV template
          </button>
          <label className="file-label">
            Choose attendee CSV
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void csv(file);
                e.target.value = '';
              }}
            />
          </label>
          {preview && (
            <div className="csv-preview">
              <p>
                {preview.rows.length} valid new attendees · {preview.duplicates}{' '}
                duplicates skipped · {preview.errors.length} invalid rows
              </p>
              {preview.errors.length > 0 && (
                <ul role="alert">
                  {preview.errors.slice(0, 20).map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                  {preview.errors.length > 20 && (
                    <li>Additional errors: {preview.errors.length - 20}</li>
                  )}
                </ul>
              )}
              <ul>
                {preview.rows.slice(0, 3).map((row) => (
                  <li key={row.email}>
                    {row.name} · {row.email}
                  </li>
                ))}
              </ul>
              <button
                disabled={
                  busy || !preview.rows.length || preview.errors.length > 0
                }
                onClick={() =>
                  void task(async () => {
                    const result = await addAttendees(
                      db,
                      eventId,
                      preview.rows,
                    );
                    setPreview(null);
                    return `${result.added} attendees imported; ${preview.duplicates + result.skipped} duplicates skipped.`;
                  })
                }
              >
                Import validated attendees
              </button>
            </div>
          )}
        </details>
      </div>
      <Feedback error={error} notice={notice} />
      <div className="table-toolbar">
        <label>
          Search attendees
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLimit(50);
            }}
            placeholder="Name, email or ticket ID"
          />
        </label>
        <p>
          {filtered.length} of {attendees.length} attendees
        </p>
      </div>
      {attendees.length === 0 ? (
        <div className="empty-state compact">
          <h3>Your guest list starts here.</h3>
          <p>
            Add someone manually or import your CSV. Ticket IDs are assigned
            locally.
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="attendee-table">
            <caption className="sr-only">Attendees and ticket issuance</caption>
            <thead>
              <tr>
                <th scope="col">Attendee</th>
                <th scope="col">Ticket ID</th>
                <th scope="col">Ticket</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, limit).map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.name}</strong>
                    <span>{row.email}</span>
                  </td>
                  <td>
                    <code>{row.ticketId}</code>
                  </td>
                  <td>
                    <span
                      className={
                        issued.has(row.id) ? 'state-tag good' : 'state-tag'
                      }
                    >
                      {issued.has(row.id) ? 'Issued' : 'Not issued'}
                    </span>
                  </td>
                  <td>
                    {!issued.has(row.id) && (
                      <button
                        disabled={busy}
                        aria-label={`Issue ticket for ${row.name}`}
                        onClick={() =>
                          void task(async () => {
                            const result = await issueTickets(db, eventId, [
                              row.id,
                            ]);
                            return `${result.issued} ticket issued.`;
                          })
                        }
                      >
                        Issue ticket
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && (
            <p className="empty-result">No attendees match this search.</p>
          )}
        </div>
      )}
      {filtered.length > limit && (
        <button onClick={() => setLimit((value) => value + 50)}>
          Show 50 more attendees
        </button>
      )}
    </section>
  );
}
