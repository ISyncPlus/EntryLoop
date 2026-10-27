# Phase 2A delivery report

All work is inside `/Users/InhouseHQ/Desktop/EntryLoop/`. No deployment, push, backend, cloud synchronization, payments or Phase 2B implementation was performed. The user's final steering retains the existing UI and defers full UI/UX redesign to Stage 4.

## 1. Implemented features

- Locally persisted real events with stable UUID, name/date/location/description, organizer workspace, guarded editing and loaded-revision checks.
- Manual and CSV attendees, case-insensitive per-event email duplicate detection, all-or-nothing invalid import rejection, search and opaque stable ticket allocation.
- Native ECDSA P-256/SHA-256 ticket signatures, retained issuance, actual QR preview, individual digital SVG and self-contained printable HTML ticket sheets.
- Public-only signed event packages with minimum scanner catalog, independent full-fingerprint confirmation, pinned keys, revision/rollback/conflict checks and safe update imports.
- Actual signed-ticket check-in through camera, image or explicitly labeled payload fallback. Verify signature/event/issued snapshot/local status, then store immutable admissions in IndexedDB.
- Preserved offline operation reconciliation, real-event membership checks, conflicts and development workbench at `/dev/workbench`.
- Production PWA resource caching, local fonts, modular screens, strict validation, meaningful unit/integration/browser regressions and updated documentation/attribution.

## 2. Architecture changes

Pure `reconcile.ts` is byte-for-byte unchanged, including its SHA-256 recorded in ARCHITECTURE.md. Its idempotent/commutative/associative valid-set behavior remains covered by Phase 1 tests. The sync wire format and 5-record/900-byte limits are unchanged.

Additive Dexie schema v2 retains the original database names and operations/device tables, adding events, attendees, issuedTickets, ticketCatalog and signingKeys. Event workflows and crypto adapters sit outside the pure engine. WebCrypto finishes before write transactions. Scanner packages never populate attendees, issued payloads or private-key tables.

Ticket tokens are bounded to 512 UTF-8 bytes and contain only protocol/version/event ID/ticket ID/signature. Packages are bounded to 1 MiB/5,000 ticket IDs, strictly public-only and separately domain-signed. The organizer private key is non-exportable and remains a CryptoKey in local IndexedDB. See README for canonical signed messages and trust assumptions.

## 3. Current interface decisions

Keep the practical green-grey organizer workspace, separate gate view, local IBM Plex Sans, responsive layouts, native accessible controls, explicit local/cache state and light/dark modes already present before the canceled visual-reference experiment. Ticket QRs stay black/white, including dark mode. No hosted typography, background video or motion/icon/dialog dependency is shipped.

The installed design-taste-frontend skill was consulted. The user then deferred full UI/UX work to Stage 4; this delivery makes no claim that the final premium design is complete. See DESIGN.md for the provisional reference, review and canceled experiment.

## 4. Exact end-to-end testing

Run `npm ci`, install Playwright runtimes as documented, then `npm run check`. For manual testing run `npm run build` followed by `npm run preview -- --port 4173 --strictPort`.

Open `/?scanner=organizer`, create an event, import `name,email` CSV, issue tickets, download the SVGs and event JSON, then open `/scan?scanner=gate-a` and import/confirm the organizer fingerprint. Cache the production app, disconnect networking, read a real ticket image or use the camera, confirm an admission and reject a repeat. Prepare gate B, admit the same ticket independently, exchange operation QRs both ways and compare full logs/conflicts.

[TESTING_PHASE_2A.md](TESTING_PHASE_2A.md) contains the full reproducible desktop and physical-phone procedure, exact local TLS commands, expected counters, invalid-ticket checks, event editing, new-ticket reprovisioning and restart tests.

## 5. Automated results

`npm run check` passed strict TypeScript, lint, formatting, **64 unit/integration tests**, the production build and **20 Chromium/WebKit browser tests**. An extended real-event run passed **30 executions** after fixing the full-ticket SVG detector case. Exact evidence and retained early failures are in DEVELOPMENT_LOG.md. Unit/integration coverage includes all 35 Phase 1 regressions plus CSV, native signatures, private-key export rejection, event/attendee services, transaction concurrency, v1 migration, key persistence, safe packages, stale edits and escaped ticket export.

Browser coverage uses actual native crypto, IndexedDB, QR pixels, downloaded SVGs and offline production resources in Chromium and WebKit. It tests creation through issuance/provisioning/admission, wrong-event and invalid-signature rejection, duplicates, real-event QR conflict reconciliation, invalid input, mobile overflow and organizer-key persistence across an actual browser-process restart. Retained full-ticket SVG fixtures guard optical decoding.

No new physical mobile camera/install test or comprehensive accessibility/security/load audit is claimed. Owner-reported Phase 1 two-device success is recorded separately from this session's automated Phase 2A evidence.

## 6. Remaining security and usability risks

- Ticket signatures authenticate IDs to a correctly pinned key; the first fingerprint still needs independent trust. A copied ticket does not establish presenter identity.
- **Admission-sync records remain unsigned** despite signed tickets. Knowing an issued ticket ID is enough to forge a raw admission batch under the current Phase 1 protocol. Staff-device authorization and signed operation evidence remain unresolved.
- No backup/key recovery, key rotation, ticket cancellation/reissue or offline revocation/freshness policy. Clearing/evicting organizer storage can permanently end issuance for that event.
- Attendee PII is not encrypted at rest. Same-origin code/extensions can access data and invoke signing; test profiles are not authorization boundaries.
- Native browser tests do not prove phone camera performance, permission behavior, install partitioning or storage durability. Large-event performance and aggregate quotas remain unverified.
- Email uniqueness does not yet support multiple attendees sharing an inbox. Names/dates/venues lock after issuance; description updates need reprovisioning. Sheets cap at 500 tickets; no large-event distribution workflow exists.
- The scanner-containing application bundle remains large; wait for caching before disconnecting. Waiting service-worker updates require old app windows to close; do not clear site data to update.

## 7. Recommended Phase 2B

Authenticate staff and admission evidence first; define safe key recovery/rotation and ticket revocation; run actual signed-ticket physical-device acceptance; design privacy/roster-correction and recovery policy; measure larger rosters, export size, cache updates and throughput. These are recommendations only. Full UI/UX redesign remains Stage 4; cloud sync, payments and unrelated additions are not authorized.
