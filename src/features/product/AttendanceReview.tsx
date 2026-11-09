import type {
  CheckInRecord,
  AdmissionConflict,
} from '../check-in/domain/models';
import type { Attendee } from '../events/models';
import { OperationsLedger } from '../workbench/OperationsLedger';
export function AttendanceReview({
  records,
  conflicts,
  scannerId,
  attendees = [],
}: {
  records: readonly CheckInRecord[];
  conflicts: readonly AdmissionConflict[];
  scannerId: string;
  attendees?: readonly Attendee[];
}) {
  const name = (ticket: string) =>
    attendees.find((a) => a.ticketId === ticket)?.name ?? ticket;
  return (
    <section className="attendance-review" aria-label="Attendance review">
      <div className="section-heading">
        <div>
          <h2>Attendance received here</h2>
          <p>
            {records.length} saved admissions. Other entrances may have records
            you have not received.
          </p>
        </div>
      </div>
      {conflicts.length > 0 && (
        <div className="conflict-review" role="status">
          <h3>
            {conflicts.length}{' '}
            {conflicts.length === 1 ? 'ticket needs' : 'tickets need'} review
          </h3>
          <p>
            Admitted at more than one entrance. All evidence is kept; EntryLoop
            does not choose a winner by time.
          </p>
          <ul>
            {conflicts.map((c) => (
              <li key={c.ticketId}>
                <strong>{name(c.ticketId)}</strong>
                <span>{c.operationIds.length} admissions</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!records.length ? (
        <p>
          No admissions received yet. Exchange records with an approved entrance
          to bring its attendance here.
        </p>
      ) : (
        <ul className="admission-list">
          {records.slice(-5).map((r) => (
            <li key={r.operationId}>
              <div>
                <strong>{name(r.ticketId)}</strong>
                <span>
                  {r.scannerId === scannerId
                    ? 'Admitted on this device'
                    : 'Received from another entrance'}
                </span>
              </div>
              <time dateTime={r.recordedAt}>
                {new Date(r.recordedAt).toLocaleTimeString()}
              </time>
            </li>
          ))}
        </ul>
      )}
      <details>
        <summary>All admission records & conflict evidence</summary>
        <OperationsLedger
          records={records}
          conflicts={conflicts}
          scannerId={scannerId}
          selected={[]}
        />
      </details>
    </section>
  );
}
