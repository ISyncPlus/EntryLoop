# Physical device evidence log · Stage 5A

**All entries below are NOT RUN.** Prepared November 9, 2026. Fill with observed evidence only after staging is separately approved. Do not paste/export private keys, real attendee data or deployment tokens. An unexplained original disappearance keeps the independent reliability gate FAILED even if this rehearsal passes.

| Device  | Role            | OS/browser version | Browser or installed app | Exact stable origin/profile                 | Build                     | Result  |
| ------- | --------------- | ------------------ | ------------------------ | ------------------------------------------- | ------------------------- | ------- |
| MacBook | Maya, organizer | Not recorded       | Not recorded             | Pending staging approval / stage5-organizer | Pending live verification | NOT RUN |
| Pixel 8 | North entrance  | Not recorded       | Not recorded             | Same stable origin / gate-north             | Pending                   | NOT RUN |
| iPhone  | South entrance  | Not recorded       | Not recorded             | Same stable origin / gate-south             | Pending                   | NOT RUN |

Record event ID, organizer public fingerprint, both scanner public IDs/fingerprints, policy epoch/catalog revision and safe diagnostic counts in a private test record. Do not expose signing-key objects. Record cache control/offline reload, available storage and camera permission state.

| Check                       | Expected evidence                                                               | Actual/evidence reference | Result  |
| --------------------------- | ------------------------------------------------------------------------------- | ------------------------- | ------- |
| Setup                       | 7 guests / 7 issued tickets; two separately authorized entrance identities      | —                         | NOT RUN |
| All radios off              | Normal reload succeeds on all devices; no transfer-network dependency           | —                         | NOT RUN |
| Admission                   | North 4 ops, South 3 ops; same Dara ticket on both                              | —                         | NOT RUN |
| Invalid/local duplicate     | Wrong event/modified signature rejected, counters unchanged                     | —                         | NOT RUN |
| Partial transfer            | South stages first of two North batches, still only 3 trusted ops               | —                         | NOT RUN |
| Restart/missing batch       | Same South identity/session; one missing frame requested/recovered              | —                         | NOT RUN |
| South completion            | 7 ops / 6 unique / 1 conflicted ticket; repeated batch unchanged                | —                         | NOT RUN |
| First acknowledgment        | North verifies receipt and reports logs differ                                  | —                         | NOT RUN |
| Reverse and acknowledgment  | Both exact operation IDs/content roots/context agree                            | —                         | NOT RUN |
| Organizer receipt, optional | Explicit third authorized computer identity; organizer 7 ops /6 /1              | —                         | NOT RUN |
| Browser/app restart         | Event/keys/tickets/admissions/receipt evidence retained offline                 | —                         | NOT RUN |
| Compatible update           | Waiting worker activates after normal close/reopen, same keys/records           | —                         | NOT RUN |
| Optics                      | Ten attempts per sample/distance/light, original/download/screenshot identified | —                         | NOT RUN |

For each failure record time, build, URL, prior/actual counts, safe IDs, exact displayed error and interruption point; retain screenshots/download hashes. Stop on changed identities, missing records, signature failures or misleading completion. Do not clear data, fabricate scan success, replace the event or force-update to make the test pass. Use STAGING_ACCEPTANCE.md and PHYSICAL_ACCEPTANCE.md for the sequence.
