import { useState } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import type { ManagedEvent } from '../events/models';
import { exportEventPackage, importEventPackage } from '../events/repository';
import { inspectPackage } from '../tickets/signatures';
import { downloadText } from '../tickets/export';
import { href, message } from './shared';
import { Feedback } from './Feedback';
export function DeviceExport({
  db,
  event,
  issuedCount,
}: {
  db: EntryLoopDB;
  event: ManagedEvent;
  issuedCount: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function prepare() {
    setBusy(true);
    setError('');
    try {
      const text = await exportEventPackage(db, event.id);
      const exported = await inspectPackage(text);
      downloadText(
        `entryloop-${event.id}-scanner.json`,
        text,
        'application/json',
      );
      setNotice(
        `Scanner package exported with ${exported.package.ticketIds.length} issued ticket IDs. Compare its fingerprint on every new scanner.`,
      );
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="provision-workspace">
      <div>
        <h2>Ready before the doors open.</h2>
        <p>
          Prepare each scanner while you can still transfer files. Once cached
          and provisioned, ticket verification and check-in work offline.
        </p>
        <ol className="prepare-steps">
          <li>Issue the tickets you want scanners to accept.</li>
          <li>Download this event’s scanner package.</li>
          <li>
            Import it on each scanner and compare the full fingerprint below
            through a trusted channel.
          </li>
          <li>
            Complete explicit scanner enrollment with the organizer. Cache the
            app, switch off the radios, then test a signed ticket and a normal
            reload.
          </li>
        </ol>
        <button
          className="primary"
          disabled={busy || !issuedCount}
          onClick={() => void prepare()}
        >
          {busy ? 'Preparing package…' : 'Download scanner package'}
        </button>
        <Feedback error={error} notice={notice} />
      </div>
      <aside className="key-card">
        <h3>Organizer verification key</h3>
        <p>
          Compare all 64 characters. A package’s own signature does not identify
          its organizer.
        </p>
        <code data-testid="organizer-fingerprint">{event.fingerprint}</code>
        <dl>
          <div>
            <dt>Algorithm</dt>
            <dd>ECDSA P-256 / SHA-256</dd>
          </div>
          <div>
            <dt>Issued ticket IDs</dt>
            <dd>{issuedCount}</dd>
          </div>
          <div>
            <dt>Private key exported</dt>
            <dd>No</dd>
          </div>
        </dl>
        <p className="fine-print">
          Package: event details, public key, ticket IDs and signed revocation
          policy. The package does not authorize a scanner. No attendee names,
          emails or private signing key. New tickets require an updated package.
        </p>
      </aside>
    </section>
  );
}
export function PackageImport({ db }: { db: EntryLoopDB }) {
  const [preview, setPreview] = useState<
    (Awaited<ReturnType<typeof inspectPackage>> & { text: string }) | null
  >(null);
  const [confirmed, setConfirmed] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function inspect(file: File) {
    setBusy(true);
    setError('');
    setPreview(null);
    setConfirmed('');
    try {
      if (file.size > 1024 * 1024)
        throw new Error('Event package exceeds 1 MiB.');
      const text = await file.text();
      setPreview({ ...(await inspectPackage(text)), text });
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }
  async function accept() {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      const id = await importEventPackage(
        db,
        preview.text,
        confirmed.replace(/\s/g, '').toLowerCase(),
      );
      window.location.assign(href(`/scan/${id}`));
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="package-import" aria-labelledby="import-event-title">
      <h2 id="import-event-title">Prepare this scanner</h2>
      <p>
        Import the organizer’s event package. Your device receives verification
        data, never the signing key or guest list.
      </p>
      <label className="file-label">
        Choose event package
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(e) => {
            const input = e.currentTarget;
            const file = input.files?.[0];
            if (file)
              void inspect(file).finally(() => {
                input.value = '';
              });
          }}
        />
      </label>
      {preview && (
        <div className="package-review">
          <h3>{preview.package.event.name}</h3>
          <p>
            {preview.package.event.date} · {preview.package.event.location}
          </p>
          <p>
            {preview.package.ticketIds.length} issued ticket IDs · revision{' '}
            {preview.package.event.revision}
          </p>
          <p className="fine-print">
            Package signature matches its included public key. Before trusting
            it, obtain the full fingerprint from the organizer independently.
          </p>
          <label>
            Organizer fingerprint
            <input
              autoComplete="off"
              spellCheck={false}
              value={confirmed}
              onChange={(e) => setConfirmed(e.target.value)}
              placeholder="Paste the organizer’s 64-character fingerprint"
            />
          </label>
          <details>
            <summary>Fingerprint claimed by this package</summary>
            <code>{preview.fingerprint}</code>
          </details>
          <button
            className="primary"
            disabled={
              busy ||
              confirmed.replace(/\s/g, '').toLowerCase() !== preview.fingerprint
            }
            onClick={() => void accept()}
          >
            Trust key and prepare device
          </button>
        </div>
      )}
      <Feedback error={error} />
      {busy && <p role="status">Validating locally…</p>}
    </section>
  );
}
