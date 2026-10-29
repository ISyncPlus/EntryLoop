import { useState } from 'react';
import { workspaceInventory } from '../storage/workspaces';
import { BUILD_ID } from '../storage/build';
import { downloadText } from '../tickets/export';
import { message } from './shared';
export function StorageFailure({
  error,
  database,
}: {
  error: string;
  database: string;
}) {
  const [diagnosticError, setDiagnosticError] = useState('');
  async function diagnostic() {
    setDiagnosticError('');
    try {
      const workspaces = await workspaceInventory();
      downloadText(
        'entryloop-storage-diagnostic.json',
        JSON.stringify(
          {
            origin: window.location.origin,
            database,
            build: BUILD_ID,
            error,
            workspaces,
          },
          null,
          2,
        ),
        'application/json',
      );
    } catch (failure) {
      setDiagnosticError(message(failure));
    }
  }
  return (
    <section
      className="notice-strip"
      aria-labelledby="storage-error-title"
      data-testid="storage-error"
    >
      <h1 id="storage-error-title">Storage unavailable — recovery required</h1>
      <p role="alert">{error}</p>
      <p>
        Database: <code>{database}</code>. This is a storage error, not evidence
        that your event list is empty. Do not clear site data, reset a database,
        or replace signing keys.
      </p>
      <p>
        Keep the same browser profile, origin and workspace URL. If an update is
        blocked, close other EntryLoop tabs and reopen with a compatible build.
      </p>
      <button onClick={() => window.location.reload()}>
        Retry this workspace safely
      </button>
      <a href="/">Choose an existing workspace</a>
      <button onClick={() => void diagnostic()}>
        Download read-only storage diagnostic
      </button>
      {diagnosticError && (
        <p role="alert">Diagnostic unavailable: {diagnosticError}</p>
      )}
    </section>
  );
}
