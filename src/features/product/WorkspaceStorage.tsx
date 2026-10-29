import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { EntryLoopDB } from '../check-in/persistence/database';
import { workspaceHealth } from '../storage/health';
import type { WorkspaceHealth } from '../storage/health';
import { workspaceInventory, workspaceUrl } from '../storage/workspaces';
import { exportRecoverableRecords } from '../storage/backup';
import { BUILD_ID } from '../storage/build';
import { downloadText } from '../tickets/export';
import { useLiveData, message } from './shared';
import { StorageFailure } from './StorageFailure';
import { Feedback } from './Feedback';
export function WorkspaceStorage({
  db,
  children,
}: {
  db: EntryLoopDB;
  children: ReactNode;
}) {
  const query = useCallback(() => workspaceHealth(db), [db]);
  const { data, error } = useLiveData(query);
  if (error) return <StorageFailure error={error} database={db.name} />;
  if (!data)
    return <p role="status">Checking stored events and signing identities…</p>;
  return (
    <>
      <StorageTools db={db} health={data} />
      {data.issues.length ? (
        <section className="notice-strip" data-testid="recovery-required">
          <h1>Stored records need recovery review</h1>
          <p>
            Data exists here but its associations or signing identities are
            inconsistent. It has not been reset or replaced. Normal writes are
            paused; save recoverable records before investigating.
          </p>
          <ul>
            {data.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </section>
      ) : (
        children
      )}
    </>
  );
}
function StorageTools({
  db,
  health,
}: {
  db: EntryLoopDB;
  health: WorkspaceHealth;
}) {
  const [inventory, setInventory] = useState<Awaited<
    ReturnType<typeof workspaceInventory>
  > | null>(null);
  const [persistence, setPersistence] = useState('Checking…');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () =>
      navigator.storage?.persisted
        ? (await navigator.storage.persisted())
          ? 'Granted'
          : 'Not granted'
        : 'Unsupported')()
      .then((value) => {
        if (active) setPersistence(value);
      })
      .catch((failure: unknown) => {
        if (active) setPersistence('Status unavailable: ' + message(failure));
      });
    return () => {
      active = false;
    };
  }, []);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  }
  const profile = db.name.replace('entryloop-v1-', '');
  return (
    <details
      id="workspace-storage"
      className="workspace-storage"
      open={health.eventIds.length === 0 || health.issues.length > 0}
    >
      <summary>Storage context and recovery</summary>
      <dl>
        <div>
          <dt>Workspace</dt>
          <dd data-testid="storage-profile">{profile}</dd>
        </div>
        <div>
          <dt>Database</dt>
          <dd>
            <code>{db.name}</code>
          </dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>
            <code>{window.location.origin}</code>
          </dd>
        </div>
        <div>
          <dt>Build / Dexie schema</dt>
          <dd>
            <code data-testid="build-id">{BUILD_ID}</code> / {db.verno} (native
            IndexedDB {db.verno * 10})
          </dd>
        </div>
        <div>
          <dt>Local events</dt>
          <dd>
            {health.organizerCount} organizer · {health.scannerCount}{' '}
            scanner-only
          </dd>
        </div>
        <div>
          <dt>Storage persistence</dt>
          <dd>{persistence}</dd>
        </div>
      </dl>
      <p>
        Only this browser/profile and origin can access these records. Database
        profiles such as main and organizer are separate workspaces, not staff
        permissions. A different browser, private window, origin or
        installed-app partition may have different storage.
      </p>
      <p>
        If an event is missing, do not clear site data or create a replacement
        as a recovery step. Check the original workspace and saved package/event
        ID. This page cannot discover another browser’s or device’s storage.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            setInventory(await workspaceInventory());
          })
        }
      >
        Find other workspaces in this browser
      </button>
      {inventory && (
        <div data-testid="workspace-inventory">
          {inventory.length ? (
            <ul>
              {inventory.map((item) => (
                <li key={item.name}>
                  <a
                    href={workspaceUrl(
                      '/',
                      item.profile,
                      window.location.search,
                    )}
                  >
                    Open workspace {item.profile}
                  </a>{' '}
                  ·{' '}
                  {item.snapshot
                    ? item.snapshot.counts.events === undefined
                      ? 'Legacy schema has no events table'
                      : `${item.snapshot.counts.events} event rows`
                    : 'Database disappeared during inspection; no count available'}{' '}
                  · {item.snapshot?.counts.signingKeys ?? 'unknown'} signing-key
                  entries · native version{' '}
                  {item.snapshot?.version ?? 'not present'}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No workspace remains detectable in this browser context. That
              alone cannot establish what happened to previous data.
            </p>
          )}
        </div>
      )}
      <button
        disabled={busy || !navigator.storage?.persist}
        onClick={() =>
          void run(async () => {
            setPersistence(
              (await navigator.storage.persist()) ? 'Granted' : 'Not granted',
            );
          })
        }
      >
        Request storage persistence
      </button>
      <p>
        Persistence can reduce automatic eviction risk. It cannot prevent user
        deletion, device loss or every browser/storage failure.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const text = await exportRecoverableRecords(
              db,
              window.location.origin,
              BUILD_ID,
            );
            downloadText(
              `entryloop-${profile}-recoverable-records.json`,
              text,
              'application/json',
            );
          })
        }
      >
        Download recoverable records (no keys)
      </button>
      <p>
        This local file contains attendee information, issued ticket tokens and
        public signed records. Store it securely. It contains no organizer or
        scanner private keys, cannot restore signing authority, and is not an
        automatic trusted restore package.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const entries = await workspaceInventory();
            downloadText(
              'entryloop-storage-diagnostic.json',
              JSON.stringify(
                {
                  origin: window.location.origin,
                  workspace: profile,
                  build: BUILD_ID,
                  health,
                  workspaces: entries,
                },
                null,
                2,
              ),
              'application/json',
            );
          })
        }
      >
        Download read-only storage diagnostic
      </button>
      <Feedback error={error} />
    </details>
  );
}
