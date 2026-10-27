# EntryLoop · Phase 2A

EntryLoop manages local events, imports guest lists, issues signed QR tickets, provisions scanners and reconciles offline admissions through QR batches. It runs without an application backend. **This is a working local-first prototype with documented security limits, not a claim of production readiness.**

The owner confirmed Phase 1 QR reconciliation on two physical devices: matching operations and the expected duplicate admission conflict. Phase 2A signed-ticket scanning has automated Chromium/WebKit coverage; no new mobile hardware validation was performed in this session.

## Run locally

Node 22.12+ and npm required; validated with Node 24.20.0.

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`. For actual service-worker/offline tests:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/`, wait for the app resources to cache, then reload normally. The development server does not prove offline support. Existing Phase 1 installations may need all app tabs/windows closed before a waiting service-worker update activates. Do not clear site data to update: doing so also deletes local events and signing keys.

## Product routes and local profiles

| Route                  | Purpose                                                             |
| ---------------------- | ------------------------------------------------------------------- |
| `/`                    | Organizer workspace and locally created events                      |
| `/events/new`          | Create an event and its organizer signing key                       |
| `/events/<event UUID>` | Guest list, tickets, scanner provisioning and guarded event editing |
| `/scan`                | Prepared event selection and event-package import                   |
| `/scan/<event UUID>`   | Signed-ticket check-in, local totals and QR synchronization         |
| `/dev/workbench`       | Clearly labeled synthetic Phase 1 engineering workbench             |

Append `?scanner=organizer`, `?scanner=gate-a` or `?scanner=gate-b` for separate local test databases. The same profile across tabs intentionally shares a database. Profiles are a testing convenience, **not authentication or a security boundary**. The original database name is retained so existing Phase 1 records survive. An additive schema-v2 migration adds event/attendee/ticket/key tables.

The current practical interface uses native accessible controls, light/dark themes, locally cached IBM Plex Sans and responsive layouts. Theme choice is carried by `?theme=light` or `?theme=dark` across product links. The latest user instruction defers the UI/UX redesign to **Stage 4**. The brief agency-style experiment, its libraries and supplied video were removed; they are not shipped.

## Organizer workflow

1. **Create event** with name, calendar date, location and description. It receives a stable UUID and its own non-exportable ECDSA P-256 private key stored in IndexedDB.
2. Add attendees manually or choose **Import from CSV**. Required headers are exactly `name,email`; quoted fields and UTF-8 BOM/CRLF are supported. Email matching is trimmed/case-insensitive and unique per event. Preview shows accepted rows, duplicates and errors. Any invalid row blocks the import; duplicates are explicitly skipped. CSV limit: 1 MiB and 5,000 rows; event capacity: 5,000 attendees.
3. Search by name, email or ticket ID. Every attendee gets a stable random opaque ticket ID. Issue tickets individually or choose **Issue all unissued tickets**. Repeated issuance preserves the existing signed token.
4. In **Tickets**, preview an attendee and **Download digital ticket** (SVG), or **Download ticket sheet** (self-contained printable HTML). Individual tickets and sheets contain names outside the QR. Share them deliberately; anyone with a copy of a valid QR can present it. Sheets support up to 500 issued tickets; larger events can still download individual SVGs. No email-sending service or PDF-generation dependency is used.
5. In **Scanner devices**, download an event package and compare the organizer fingerprint on each scanner through a trusted channel. Packages contain public event details, a public verification key, a signature and opaque issued-ticket IDs. They contain no attendee names/emails or private signing key. Issue additional tickets before exporting an updated package.
6. **Event details** allows editing before issuance/provisioning. Name/date/location lock after either operation; description remains editable. Loaded revision checks reject stale concurrent edits. The UI offers an explicit reload that discards the stale draft. Event ID and signing key never change through editing.

**Keep the organizer browser data safe.** The private key cannot be exported, and no backup/recovery feature exists. Browser clearing, eviction or device loss can permanently remove the ability to issue more tickets for that event. Scanner devices do not hold the organizer key.

## Offline scanner workflow

1. Load the production app on a trusted HTTPS origin (localhost is acceptable for the local computer), let it cache and reload normally.
2. Open **Event check-in**, import the organizer's event JSON and enter the organizer's full SHA-256 public-key fingerprint obtained independently. The package's self-signature alone cannot identify the organizer. The first accepted key is pinned. Imports cannot replace organizer data, rotate a pinned key, roll back revisions or remove already-known ticket IDs.
3. Select the event and choose **Scan with camera**. The app checks token schema, signature against the pinned key, event identity, issued-ticket membership and the local admission log before storing an admission. An invalid signature, wrong event, unprepared ticket or local duplicate is rejected without an admission write.
4. Image upload and manual signed-payload entry are clearly available fallbacks through the same verifier. They do not constitute a physical camera test. The camera stops after each decoded QR so staff can read the result before starting the next scan.
5. **Sync & conflicts** reuses Phase 1 batch exchange and the unchanged pure reconciliation engine. Select 1–5 operations and generate/scan real QR batches. Exchange every relevant batch both ways. Same valid operations yield the same unique-ticket totals and preserved conflicts. A disconnected scanner cannot prevent another disconnected scanner admitting a copy of the same ticket.

See [exact end-to-end and physical-device test steps](docs/TESTING_PHASE_2A.md), including local trusted HTTPS setup.

## Ticket and provisioning protocols

Ticket v1, bounded to 512 UTF-8 bytes:

```text
{"k":"ELT","v":1,"e":"<event UUID>","t":"<opaque ticket ID>","s":"<86-char base64url signature>"}
```

The ECDSA P-256 / SHA-256 message is `ENTRYLOOP:TICKET:1` + newline + compact `JSON.stringify({e,t})`. Signatures are the WebCrypto 64-byte raw `r || s` form, base64url encoded. Tokens contain no attendee names/emails. The signature authenticates event/ticket IDs to a pinned key, not the identity of the person presenting the QR. Event dates are descriptive; expiry/time-window/revocation rules are not implemented.

Scanner package v1: strict `{kind:"entryloop-event",version:1,event,publicKey,ticketIds,signature}`. Public keys contain only `kty`, `crv`, `x`, `y`; unknown/private-key fields are rejected. The signature uses a separate `ENTRYLOOP:EVENT:1` message domain and canonical event/key fields with sorted ticket IDs. Limit: 1 MiB and 5,000 unique ticket IDs. Validation and cryptography finish before the import transaction. No roster or signing key is transferred.

Check-in synchronization remains the Phase 1 JSON `{v,e,r,h}` format: **1–5 operations / 900 UTF-8 bytes**, H QR error correction, four-module quiet zone. Tuples carry only operation ID, ticket ID, scanner ID and time. SHA-256 detects corruption, **not authenticity of check-in operations**. Ticket signatures do not magically sign synchronization records. A hostile person who knows an issued ticket ID can forge an unsigned admission batch. Do not use unauthenticated sync with untrusted operators; staff-device authorization and signed operation evidence remain Phase 2B priorities.

## Validation

```sh
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium webkit
npm run check
```

The gate runs strict TypeScript, ESLint, Prettier, unit/integration tests, production build and Playwright. Browser tests use actual native WebCrypto, IndexedDB, exported SVG/HTML files, QR pixels and ZXing. They provision isolated devices and disable networking after production caching; no scanner success is mocked. The tests also restart real browser processes and reuse the persisted organizer signing key offline. See [development evidence](docs/DEVELOPMENT_LOG.md) for exact executed results and failures fixed.

## Files and boundaries

- `src/features/check-in/domain/reconcile.ts`: unchanged pure merge/admission engine.
- `src/features/check-in/persistence/database.ts`: additive Dexie v2 schema, legacy scanner/log methods, real-ticket membership on sync imports.
- `src/features/events/models.ts`, `repository.ts`: event/attendee/ticket/package models and transactional workflows.
- `src/features/attendees/csv.ts`: bounded CSV parsing/validation and duplicate preview.
- `src/features/tickets/signatures.ts`, `export.ts`: native signing/verification, fingerprint/package trust and safe offline ticket documents.
- `src/features/product/`: modular organizer, provisioning, ticket and scanner screens.
- `src/features/sync/`: existing codec/camera/transfer behavior with shared optical helpers.
- `tests/events.spec.ts`, `tests/offline.spec.ts`: new real-event workflows and retained Phase 1 regressions.

Read [architecture](docs/ARCHITECTURE.md), [decisions](docs/DECISIONS.md), [threat model](docs/THREAT_MODEL.md), [Phase 2A report](docs/PHASE_2A_REPORT.md), [roadmap](docs/ROADMAP.md) and [third-party/AI attribution](THIRD_PARTY_NOTICES.md).

## Known limits

No backend, account authentication, cloud sync, payment system, key recovery/rotation, ticket revocation/reissue, roster encryption or real-time global admission lock. Device profiles are not access control. Mobile camera/install behavior for signed tickets, large-event performance and storage eviction remain unverified. Signature correctness does not prove who controls an initial trusted key; fingerprint comparison matters. No deployment or GitHub push was performed. Phase 2B is not implemented; full UI/UX design waits for Stage 4.
