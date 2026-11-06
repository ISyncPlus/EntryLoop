# End-to-end workflow audit · Stage 3

November 6, 2026. Current scope is integration/readiness, not Stage 4 implementation. The original persistence incident remains unexplained and its reliability gate is FAILED. Source references below are project-relative; all data in automated acceptance is fictional.

## Organizer audit

| Job                    | Existing implementation / persistence                                                                                 | Audit finding / outcome                                                                                                                                                                                                                     |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open/create event      | `main.tsx`, `WorkspaceLaunch`, `events/repository.createEvent`; explicit profile; atomic event/key/policy transaction | Existing context handling retained. Fixed enumeration-error text that could suggest no workspace existed after a failed inspection.                                                                                                         |
| Add attendee manually  | `AttendeeManager`, validated normalized email, atomic uniqueness indexes                                              | Retained; first fictional guest added manually in integrated scenario.                                                                                                                                                                      |
| CSV import             | `attendees/csv.ts`, bounded preview and atomic repository import                                                      | Retained; complete seven-row fixture imported after manual guest, one duplicate skipped, seven retained. Invalid-row regression preserved.                                                                                                  |
| Issue tickets          | `issueTickets`, native non-exportable event key, retained tokens/catalog                                              | Retained; seven signed tickets issued, original IDs/tokens survive restarts.                                                                                                                                                                |
| View/export            | `TicketManager`, SVG/HTML, ELQ1 and explicit legacy JSON                                                              | Retained; actual seven-ticket sheet exported. Pixel/signature export regressions remain.                                                                                                                                                    |
| Prepare entrances      | `DeviceExport`, signed public-only event package                                                                      | Retained; provision before disconnection; no roster/private key sent. Package is preparation, not authorization.                                                                                                                            |
| Authorize entrances    | `ScannerAuthority`, request proof, full independently compared fingerprint, explicit organizer signature              | Retained; North/South have separate device keys. No automatic trust or truncated fingerprints.                                                                                                                                              |
| Review attendance      | `EventDetail`, `trustedSnapshot`                                                                                      | Missing organizer connection fixed: **Attendance & sync** now reuses the verified exchange and ledger inside event management. Local-only totals are explained.                                                                             |
| Receive logs/conflicts | `SecureSyncPanel`, `OperationsLedger`                                                                                 | Organizer needs explicit authorization of its own separate scanner identity under current protocol. The panel links to existing authorization and discloses that it grants admission authority, not an observer role. No protocol shortcut. |

The organizer is not an authenticated online account: possession of local event signing capability is the current authority. Same-origin compromise remains a threat. Local organizer counts do not update from phones automatically; users must exchange records.

## Staff audit

| Job                   | Boundary / state                                                | Audit outcome                                                                                                                                            |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First launch          | Explicit workspace or root chooser                              | Clear storage boundary retained. Workspace names remain technical debt for Stage 4, not staff permissions.                                               |
| Prepare event         | `/scan`, signed package + independently confirmed organizer key | Reject corrupt/wrong/rollback/replacement packages. Same-origin profile/context cannot migrate data from another device.                                 |
| Enroll                | Create local key and event request deliberately                 | Private key stays local. Human trust ceremony remains cumbersome; planned simplification requires review.                                                |
| Receive authorization | Root signature, local scanner UUID/key, policy                  | Credential cannot restore a lost private key or authorize a different device.                                                                            |
| Work offline          | Installed/cached production resources, prepared catalog/policy  | Initial provisioning/caching needs a connection. Offline status alone does not prove readiness; normal offline reload and first-use decoding are tested. |
| Valid ticket          | `verifyTicket` → `admitTrusted`                                 | Full event/signature/catalog/authority/duplicate checks; atomic operation+proof write. Camera and image/manual inputs share acceptance.                  |
| Duplicate/invalid     | Local rejection feedback                                        | Fixed stable accessible name for repeated ticket-payload entry. Disconnected simultaneous duplicates are retained conflicts, never prevented globally.   |
| Exchange              | Request → offer → indexed frames → acknowledgment               | Fixed stale outgoing image while a new exchange/action is pending. No older acknowledgment should masquerade as the new request.                         |
| Interrupt/recover     | Durable staging, saved exchange selector, missing indices       | Restart receiver after one frame; staged operations do not affect totals; resume and request missing code.                                               |
| Confirm completion    | Intended receiver signature, source/result roots, context       | Reverse exchange if roots differ. Matching counts alone never proves agreement; new admissions or policy/catalog changes make receipts historical.       |

## Storage and error matrix

Successful empty reads, loading, read/open failure, unknown schema and inconsistent keys/metadata are distinct. Native read-only inventory returns counts/public IDs only and never creates a committed inspection database. Health checks retain original non-exportable keys and verify associations outside transactions. Unknown schema changes stop before Dexie repair. Critical writes retain transactions/revision checks. No Stage 3 database rename, schema bump, clearing or startup identity replacement was added.

Diagnostic exports now omit raw error messages as well as keys/rosters: browser/database error text could contain a personal value. Operators still see the actionable local error. Recoverable-record exports intentionally contain attendee data/tokens and remain separate, clearly warned, without private keys or trusted restore authority.

The app cannot establish that no historical event was created merely from an empty table, nor enumerate another browser/OS partition. Show current origin/profile/build, explain the uncertainty and preserve evidence. Storage persistence is not guaranteed backup. The original missing event/key has not been found.

## Confirmed corrections and retained complexity

Fixed: enumeration error/empty wording; organizer review connection; repeated-payload accessible label; pending-exchange stale QR; raw diagnostic error leakage risk; eager decoder evaluation; build provenance/reproducible staging inputs. A prior privacy test also falsely matched `Ada` inside random Base64: exact schema and full-value checks replace that probabilistic assertion without removing the test.

Not redesigned: JSON provisioning, full-fingerprint ceremony, manual QR advancement, profile terminology, deep technical controls. They are detailed in STAGE_4_UX_SPEC.md. No scanner/account/crypto/reconciliation engine was rebuilt. QR v1/v2/ELQ1 compatibility and revocation semantics remain.

Automated scenario and expected arithmetic: PHYSICAL_ACCEPTANCE.md. Executed results and remaining blocks: STAGE_3_REPORT.md. Historical incident evidence: PERSISTENCE_AUDIT.md.
