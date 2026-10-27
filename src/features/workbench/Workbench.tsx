import { useCallback, useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import type { CheckInRecord, ScannerDevice } from '../check-in/domain/models';
import { events, ticketsFor } from '../check-in/domain/fixtures';
import { reconcile } from '../check-in/domain/reconcile';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { TransferPanel } from '../sync/TransferPanel';
import { OperationsLedger } from './OperationsLedger';

type Snapshot = { records: CheckInRecord[]; scanner: ScannerDevice };
function EventWorkbench({ db, eventId }: { db: EntryLoopDB; eventId: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [ticketId, setTicketId] = useState(ticketsFor(eventId)[0]?.id ?? '');
  const [selected, setSelected] = useState<string[]>([]);
  const [resetArmed, setResetArmed] = useState(false);
  const [resetVersion, setResetVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | undefined;
    const fail = (failure: unknown) => {
      if (!cancelled)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Local storage could not be read.',
        );
    };
    // Scanner initialization writes once; reactive queries must remain read-only.
    void db
      .scanner()
      .then((scanner) => {
        if (cancelled) return;
        subscription = liveQuery(() => db.records(eventId)).subscribe({
          next: (records) => setSnapshot({ records, scanner }),
          error: fail,
        });
      })
      .catch(fail);
    return () => {
      cancelled = true;
      subscription?.unsubscribe();
    };
  }, [db, eventId]);
  const imported = useCallback(() => {
    setNotice('Imported operations are now in the local ledger.');
  }, []);
  if (!snapshot)
    return (
      <section className="panel">
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Opening local IndexedDB…</p>
        )}
      </section>
    );
  const { records, scanner } = snapshot;
  const state = reconcile(eventId, records);
  const locallyCreated = records.filter(
    (record) => record.scannerId === scanner.id,
  ).length;
  async function admit() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const ticket = ticketsFor(eventId).find((item) => item.id === ticketId);
      if (!ticket) throw new Error('Select a synthetic ticket.');
      await db.admit(ticket);
      setNotice(`Admitted ${ticket.id}. Stored locally.`);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Admission failed.',
      );
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await db.resetEvent(eventId);
      setSelected([]);
      setResetVersion((value) => value + 1);
      setNotice(
        'Selected event’s synthetic operations cleared. Scanner identity retained.',
      );
      setResetArmed(false);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="panel identity" aria-labelledby="scanner-title">
        <div>
          <h2 id="scanner-title">Local scanner · {scanner.label}</h2>
          <code data-testid="scanner-id">{scanner.id}</code>
          <p className="muted">
            Database: {db.name}. Same profile shares data across tabs.
          </p>
        </div>
        <div className="profile-links">
          <a href="/?scanner=a">Open isolated profile A</a>
          <a href="/?scanner=b">Open isolated profile B</a>
          <span>
            Same-browser test profiles. Use separate physical devices for the
            real offline test.
          </span>
        </div>
      </section>
      <section className="metrics" aria-label="Merged attendance totals">
        <div className="leading">
          <span>Unique tickets admitted</span>
          <strong data-testid="attendance">{state.attendance}</strong>
        </div>
        <div>
          <span>Stored operations</span>
          <strong data-testid="operations">{records.length}</strong>
        </div>
        <div>
          <span>Local / imported</span>
          <strong>
            <span data-testid="local-total">{locallyCreated}</span> /{' '}
            <span data-testid="imported-total">
              {records.length - locallyCreated}
            </span>
          </strong>
        </div>
        <div>
          <span>Tickets with conflicts</span>
          <strong
            className={state.conflicts.length ? 'danger-text' : ''}
            data-testid="conflicts"
          >
            {state.conflicts.length}
          </strong>
        </div>
      </section>
      <section className="panel admission" aria-labelledby="admit-title">
        <div>
          <h2 id="admit-title">Create a local admission</h2>
          <p>
            Synthetic tickets only. A disconnected scanner cannot know another
            scanner has already admitted a ticket.
          </p>
        </div>
        <div className="admit-controls">
          <label>
            Synthetic ticket
            <select
              value={ticketId}
              onChange={(event) => setTicketId(event.target.value)}
            >
              {ticketsFor(eventId).map((ticket) => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.id} · {ticket.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void admit()}
          >
            Admit ticket
          </button>
        </div>
      </section>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <TransferPanel
        key={resetVersion}
        db={db}
        eventId={eventId}
        selected={records.filter((record) =>
          selected.includes(record.operationId),
        )}
        onImported={imported}
      />
      <OperationsLedger
        records={state.operations}
        scannerId={scanner.id}
        selected={selected}
        onToggle={(id) =>
          setSelected((ids) =>
            ids.includes(id)
              ? ids.filter((value) => value !== id)
              : [...ids, id],
          )
        }
        conflicts={state.conflicts}
      />
      <section className="reset">
        <h2>Reset synthetic data</h2>
        <p>
          Deletes this event’s operations in this scanner profile. Other events
          and scanner identity are retained.
        </p>
        {!resetArmed ? (
          <button onClick={() => setResetArmed(true)}>
            Reset selected event…
          </button>
        ) : (
          <div>
            <button disabled={busy} onClick={() => void reset()}>
              Confirm reset selected event
            </button>
            <button onClick={() => setResetArmed(false)}>Cancel reset</button>
          </div>
        )}
      </section>
    </>
  );
}
export function Workbench({ db }: { db: EntryLoopDB }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [cached, setCached] = useState(
    Boolean(navigator.serviceWorker?.controller),
  );
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const control = () =>
      setCached(Boolean(navigator.serviceWorker?.controller));
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    navigator.serviceWorker?.addEventListener('controllerchange', control);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
      navigator.serviceWorker?.removeEventListener('controllerchange', control);
    };
  }, []);
  return (
    <div className="shell">
      <header>
        <a href="/" className="wordmark">
          EntryLoop
        </a>
        <span>Phase 1 · Engineering workbench</span>
        <span className="connection">
          {offline ? 'Browser reports offline' : 'Browser reports online'}
        </span>
      </header>
      <main>
        <div className="page-heading">
          <div>
            <h1>Offline reconciliation lab</h1>
            <p>
              Real local operations. Synthetic tickets. Exchange, inspect,
              repeat.
            </p>
          </div>
          <label>
            Test event
            <select
              aria-label="Test event"
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <aside className="scope-note">
          {cached
            ? 'Service worker controls this page. Test a normal offline reload before relying on cached resources.'
            : 'Offline shell not yet controlling this page. Use the production build, allow caching, then reload.'}{' '}
          Physical camera-to-camera transfer remains unverified until tested on
          two devices. SHA-256 detects corruption; it does not authenticate
          scanners.
        </aside>
        <EventWorkbench key={eventId} db={db} eventId={eventId} />
      </main>
      <footer>
        EntryLoop · LaunchPad Hacks 2026 · Synthetic data only · No backend
      </footer>
    </div>
  );
}
