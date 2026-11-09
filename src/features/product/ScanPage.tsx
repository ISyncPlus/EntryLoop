import { useCallback, useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { trustedSnapshot } from '../security/operations';
import { ScannerAuthority } from './ScannerAuthority';
import { SecureSyncPanel } from './SecureSyncPanel';
import { admitSignedTicket } from '../events/repository';
import { ScanInput } from './ScanInput';
import { useLiveData, href, message, eventDate } from './shared';
import { ViewTabs } from './ProductUI';
import { AdmissionFeedback } from './AdmissionFeedback';
import { StorageFailure } from './StorageFailure';
import { AttendanceReview } from './AttendanceReview';
import { OperationsLedger } from '../workbench/OperationsLedger';
import type { CheckInRecord } from '../check-in/domain/models';
export function ScanPage({ db, id }: { db: EntryLoopDB; id: string }) {
  const [view, setView] = useState('Check-in');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [last, setLast] = useState<CheckInRecord | null>(null);
  const query = useCallback(
    async () => ({
      event: await db.events.get(id),
      snapshot: await trustedSnapshot(db, id),
      credential: await db.credentials.get([
        id,
        (await db.scannerKeys.get('local'))?.scannerId ?? '',
      ]),
      cryptoIdentity: await db.scannerKeys.get('local'),
      catalog: await db.ticketCatalog.where('eventId').equals(id).count(),
    }),
    [db, id],
  );
  const { data, error: storageError } = useLiveData(query);
  const admit = useCallback(
    async (text: string) => {
      setBusy(true);
      setError('');
      setLast(null);
      try {
        setLast(await admitSignedTicket(db, id, text));
      } catch (failure) {
        setError(message(failure));
      } finally {
        setBusy(false);
      }
    },
    [db, id],
  );
  if (storageError)
    return <StorageFailure error={storageError} database={db.name} />;
  if (!data) return <p role="status">Opening local scanner…</p>;
  if (!data.event)
    return (
      <>
        <h1>Prepare this event first</h1>
        <p>No verification key is stored here for this event.</p>
        <a href={href('/scan')}>Import an event package</a>
      </>
    );
  const { event, snapshot, catalog, cryptoIdentity, credential } = data;
  const { state } = snapshot;
  const records = state.operations;
  const authorized = Boolean(
    credential &&
    snapshot.policy &&
    credential.at <= snapshot.policy.epoch &&
    !snapshot.policy.revokedScanners.includes(credential.d),
  );
  const scanner = { id: cryptoIdentity?.scannerId ?? '' };
  return (
    <>
      <a className="back-link" href={href('/scan')}>
        ← Prepared events
      </a>
      <div className="workspace-heading">
        <div>
          <h1>{event.name}</h1>
          <p>
            {credential?.l ?? 'Entrance not named'} · {eventDate(event.date)} ·{' '}
            {event.location}
          </p>
        </div>
        <span className={authorized ? 'state-tag good' : 'state-tag'}>
          {authorized ? 'Authorized scanner' : 'Authorization required'}
        </span>
      </div>
      <details>
        <summary>Scanner authorization and policy</summary>
        <ScannerAuthority db={db} event={event} />
      </details>
      {(snapshot.legacy > 0 || snapshot.excluded > 0) && (
        <p className="notice-strip">
          {snapshot.legacy} historical unsigned operations and{' '}
          {snapshot.excluded} revoked operations are preserved locally, excluded
          from trusted totals and secure exchange. Do not re-admit legacy
          tickets without investigation.
        </p>
      )}
      <ViewTabs
        label="Scanner view"
        items={['Check-in', 'Sync & conflicts']}
        value={view}
        onChange={setView}
        prefix="scanner-tab"
      />
      {view === 'Check-in' ? (
        <div
          className="gate-layout"
          role="tabpanel"
          id="scanner-tab-panel"
          aria-labelledby="scanner-tab-0"
        >
          <section className="gate" aria-labelledby="gate-title">
            <div className="gate-heading">
              <div>
                <h2 id="gate-title">Welcome them in.</h2>
                <p>Scan a guest’s ticket to verify and save their admission.</p>
              </div>
            </div>
            <ScanInput onPayload={admit} busy={busy} />
            <AdmissionFeedback busy={busy} last={last} error={error} />
          </section>
          <aside className="gate-summary">
            <h2>This entrance</h2>
            <div className="gate-total">
              <span>Guests checked in · received here</span>
              <strong data-testid="real-attendance">{state.attendance}</strong>
            </div>
            <dl>
              <div>
                <dt>Stored operations</dt>
                <dd data-testid="real-operations">{records.length}</dd>
              </div>
              <div>
                <dt>Tickets with conflicts</dt>
                <dd data-testid="real-conflicts">{state.conflicts.length}</dd>
              </div>
              <div>
                <dt>Ticket IDs prepared</dt>
                <dd>{catalog}</dd>
              </div>
              <div>
                <dt>Package revision</dt>
                <dd>{event.revision}</dd>
              </div>
            </dl>
            <details>
              <summary>Device & package details</summary>
              <div className="scanner-id">
                <span>Cryptographic scanner identity</span>
                <code>
                  {scanner.id || 'Create an enrollment request first.'}
                </code>
              </div>
            </details>
            <p>
              Offline totals reflect only operations received here. Exchange
              batches with other entrances to reconcile.
            </p>
            <p className="fine-print">
              Copies of a valid ticket can be admitted on disconnected scanners.
              Reconciliation preserves those admissions as a conflict.
            </p>
          </aside>
        </div>
      ) : (
        <div
          className="sync-view"
          role="tabpanel"
          id="scanner-tab-panel"
          aria-labelledby="scanner-tab-1"
        >
          <SecureSyncPanel db={db} eventId={id} />
          <AttendanceReview
            records={state.operations}
            scannerId={scanner.id}
            conflicts={state.conflicts}
          />
          {(snapshot.legacy > 0 || snapshot.excluded > 0) && (
            <details>
              <summary>
                Preserved evidence — includes unsigned and revoked records
              </summary>
              <p>
                These raw records are for investigation, not trusted attendance.
                Unsigned records have no signature proof; revoked records are
                excluded by the current policy.
              </p>
              <OperationsLedger
                records={snapshot.records}
                scannerId={scanner.id}
                selected={[]}
                conflicts={[]}
              />
            </details>
          )}
        </div>
      )}
    </>
  );
}
