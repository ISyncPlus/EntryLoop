import { useEffect, useState } from 'react';
import type { Attendee, IssuedTicket, ManagedEvent } from '../events/models';
import {
  downloadText,
  renderTicketSvg,
  renderTicketSheet,
} from '../tickets/export';
import { makeQrImage } from '../sync/qr';
import { eventDate, message, href } from './shared';
import { Feedback } from './Feedback';
function TicketPreview({
  event,
  attendee,
  ticket,
}: {
  event: ManagedEvent;
  attendee: Attendee;
  ticket: IssuedTicket;
}) {
  const [qr, setQr] = useState<{ image: string; displaySize: number } | null>(
    null,
  );
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    void makeQrImage(ticket.payload, 280)
      .then((image) => {
        if (!cancelled) setQr(image);
      })
      .catch((failure) => {
        if (!cancelled) setError(message(failure));
      });
    return () => {
      cancelled = true;
    };
  }, [ticket.payload]);
  return (
    <article
      className="digital-ticket"
      aria-label={`Digital ticket for ${attendee.name}`}
    >
      <div className="ticket-top">
        <span className="ticket-brand">EntryLoop</span>
        <span>Admission</span>
      </div>
      <div className="ticket-event">
        <h3>{event.name}</h3>
        <p>
          {eventDate(event.date)}
          <br />
          {event.location}
        </p>
      </div>
      <div className="ticket-guest">
        <span>Reserved for</span>
        <strong>{attendee.name}</strong>
      </div>
      <div className="ticket-optical">
        {qr ? (
          <img
            data-testid="ticket-qr"
            style={{ width: qr.displaySize }}
            src={qr.image}
            alt={`Signed ticket QR for ${attendee.name}`}
          />
        ) : (
          <p role="status">Preparing QR…</p>
        )}
        <code>{ticket.ticketId}</code>
      </div>
      <div className="ticket-bottom">
        <strong>Your place in the room.</strong>
        <span>Show this signed QR at entry.</span>
      </div>
      <Feedback error={error} />
    </article>
  );
}
export function TicketManager({
  event,
  attendees,
  tickets,
}: {
  event: ManagedEvent;
  attendees: Attendee[];
  tickets: IssuedTicket[];
}) {
  const [selected, setSelected] = useState(tickets[0]?.ticketId ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ticket =
    tickets.find((ticket) => ticket.ticketId === selected) ?? tickets[0];
  const attendee = attendees.find((row) => row.id === ticket?.attendeeId);
  async function save(all: boolean) {
    setBusy(true);
    setError('');
    try {
      if (all)
        downloadText(
          `entryloop-${event.id}-tickets.html`,
          await renderTicketSheet(event, attendees, tickets),
          'text/html',
        );
      else if (ticket && attendee)
        downloadText(
          `entryloop-${ticket.ticketId}.svg`,
          await renderTicketSvg(event, attendee, ticket),
          'image/svg+xml',
        );
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>Signed admission tickets</h2>
          <p>
            Each QR contains only an event ID, an opaque ticket ID and its
            signature.
          </p>
        </div>
        <button
          disabled={busy || !tickets.length}
          onClick={() => void save(true)}
        >
          Download ticket sheet
        </button>
      </div>
      <Feedback error={error} />
      {!ticket || !attendee ? (
        <div className="empty-state compact">
          <h3>No tickets issued yet.</h3>
          <p>
            Open the guest list to issue individual tickets or all unissued
            tickets.
          </p>
        </div>
      ) : (
        <div className="ticket-workspace">
          <div className="ticket-controls">
            <label>
              Preview attendee
              <select
                value={ticket.ticketId}
                onChange={(e) => setSelected(e.target.value)}
              >
                {tickets.map((ticket) => (
                  <option key={ticket.ticketId} value={ticket.ticketId}>
                    {attendees.find((row) => row.id === ticket.attendeeId)
                      ?.name ?? ticket.ticketId}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {tickets.length} signed tickets issued. Ticket IDs and signatures
              are retained across repeated exports.
            </p>
            <button
              className="primary"
              disabled={busy}
              onClick={() => void save(false)}
            >
              Download digital ticket
            </button>
            <p className="fine-print">
              Individual download: SVG. Ticket sheet: offline HTML, printable
              through your browser. These layouts contain attendee names; share
              each ticket only with its intended attendee.
            </p>
            <a href={href(`/scan/${event.id}`)}>Open event check-in</a>
          </div>
          <TicketPreview
            key={ticket.ticketId}
            event={event}
            attendee={attendee}
            ticket={ticket}
          />
        </div>
      )}
    </section>
  );
}
