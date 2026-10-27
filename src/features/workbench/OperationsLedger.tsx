import type {
  AdmissionConflict,
  CheckInRecord,
} from '../check-in/domain/models';

type Props = {
  records: readonly CheckInRecord[];
  scannerId: string;
  selected: readonly string[];
  onToggle: (id: string) => void;
  conflicts: readonly AdmissionConflict[];
};
export function OperationsLedger({
  records,
  scannerId,
  selected,
  onToggle,
  conflicts,
}: Props) {
  const conflicting = new Set(
    conflicts.flatMap((conflict) => conflict.operationIds),
  );
  return (
    <section className="panel" aria-labelledby="ledger-title">
      <div className="section-title">
        <h2 id="ledger-title">Operation ledger</h2>
        <span>{records.length} immutable admissions</span>
      </div>
      <p>
        Imported operations retain their original scanner identity. Select
        records explicitly for the next QR batch.
      </p>
      {!records.length ? (
        <p className="empty">
          No admissions stored for this event. Admit a synthetic ticket to
          begin.
        </p>
      ) : (
        <div className="table-scroll">
          <table>
            <caption className="sr-only">
              Stored operations for the selected event
            </caption>
            <thead>
              <tr>
                <th scope="col">Batch</th>
                <th scope="col">Ticket</th>
                <th scope="col">Origin</th>
                <th scope="col">Recorded (UTC)</th>
                <th scope="col">Operation ID</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.operationId}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Select operation ${record.operationId}`}
                      checked={selected.includes(record.operationId)}
                      onChange={() => onToggle(record.operationId)}
                    />
                  </td>
                  <td>
                    {record.ticketId}
                    {conflicting.has(record.operationId) && (
                      <strong className="conflict-label">Conflict</strong>
                    )}
                  </td>
                  <td>
                    <span>
                      {record.scannerId === scannerId ? 'Local' : 'Imported'}
                    </span>
                    <code title={record.scannerId}>{record.scannerId}</code>
                  </td>
                  <td>
                    <time dateTime={record.recordedAt}>
                      {record.recordedAt}
                    </time>
                  </td>
                  <td>
                    <code>{record.operationId}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="conflicts" aria-live="polite">
        <h3>Admission conflicts</h3>
        {conflicts.length ? (
          <>
            <p>
              Multiple operations admit the same ticket. All records are
              preserved; no timestamp chooses a winner.
            </p>
            <ul>
              {conflicts.map((conflict) => (
                <li key={conflict.ticketId}>
                  <strong>{conflict.ticketId}</strong> —{' '}
                  {conflict.operationIds.length} admissions
                  <ul>
                    {conflict.operationIds.map((id) => (
                      <li key={id}>
                        <code>{id}</code>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p>No conflicting admissions in this local log.</p>
        )}
      </div>
    </section>
  );
}
