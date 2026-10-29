# Engineering decisions

## 001 · Append-only admissions and deterministic set union

Use random UUID operation identity and immutable admissions. Set union gives convergence without clock assumptions. Distinct admissions for one ticket remain as evidence. Attendance counts unique tickets, not operations; there is no automatic winner. Rejected local attempts are not admitted events. Divergent operation ID content is invalid and rejects atomically instead of silently overwriting or timestamp-resolving.

## 002 · Simple transport first

Use compact JSON v1, tuples, explicit event ID and full lowercase SHA-256 digest. Cap at five entries and 900 UTF-8 bytes; H error correction, four-module quiet zone. The raster uses eight pixels per module and the displayed width uses integral module sizes where space permits, avoiding double resampling. No compression dependency, animated frames, automatic peer inventory or batch acknowledgment. The operator selects each batch; an over-capacity selection errors instead of truncating. Revisit only after real physical measurements.

## 003 · Integrity is not authenticity

Unsigned payloads are adversary-recomputable. The UI says checksum matches and author unverified. Production device identity, provisioning, signatures and offline revocation policy are unresolved. UUID scanner claims are not trusted authorization.

## 004 · Dexie with atomic operations

Use one database per explicit test profile and compound event/operation keys. Atomic read/check/write prevents same-database concurrent local admissions; it cannot coordinate disconnected devices. Deduplication by operation ID handles repeated and overlapping batches without a receipt table. Hash before starting the write transaction. Initialize scanner identity outside live queries; Dexie live queries are read-only.

## 005 · Canonical timestamp representation

A QR tuple carries integer epoch milliseconds. Domain timestamps must be exactly `new Date(value).toISOString()` so encode/decode preserves record equality. Time is untrusted metadata only. The transport accepts nonnegative supported JavaScript Date values; no production ticket validity/time policy exists yet.

## 006 · Native controls and local assets

React + strict TypeScript, Tailwind v4 build integration and simple CSS/native controls suffice. shadcn/ui was considered but adds no necessary primitive for this workbench. No icon library, hosted font, analytics, backend or design system dependency. The user selected `design-taste-frontend`; its app-screen principles inform readability and evidence, with full design explicitly deferred.

Skill draw reference: framed-sheet, seed 263006709. Kept quiet surfaces, green-grey scope, tabular figures and operation evidence. Simplified to a single workbench without sidebar or remote typography to honor Phase 1 scope and offline provisioning. No marketing sections, motion or full visual identity. The screen asks: do these stored operations converge and where do they conflict? Its specific element is the operation/scanner ledger beside actual QR exchange. Synthetic data lives only in `fixtures.ts`.

## 007 · Production-build offline evidence

Use generated Workbox precache, no transfer networking, no development service worker. Browser tests use real QR pixels decoded by ZXing and actual IndexedDB, plus offline reload/restart. These tests do not substitute for physical cameras or OS installation. Optional Vite preview TLS supports a future trusted local test; no public deployment was authorized or performed.

## 008 · Deliberate limits

The single scanner-containing bundle triggers Vite's large-chunk warning. Keep it for a small prototype instead of introducing loading state and cache complexity before hardware testing; measure download/parse costs before splitting. Logs are bounded per transfer, not in aggregate. Reset is event/profile-scoped and confirmed. Recovery and quotas await production requirements.

## 009 · Phase 2A native asymmetric signing

Choose WebCrypto ECDSA P-256/SHA-256: no new crypto package, compact raw 64-byte signatures and native Chromium/WebKit tests. Generate a non-exportable organizer private CryptoKey per event; export only public JWK coordinates. This prevents accidental key serialization but does not prevent same-origin malicious code invoking signing. No recovery/rotation is claimed. Ticket IDs remain short opaque values compatible with the unchanged record codec.

## 010 · Public scanner snapshot and independent first trust

A signed scanner package contains event metadata, public key and issued IDs, excluding PII/private keys. Initial fingerprint confirmation must come from the organizer independently; the included signature alone proves only consistency. Pin the key, reject rollback/conflicting revisions, disallow ticket removal, and protect organizer-role data from package replacement. Reprovision after new issuance; offline snapshots are deliberately explicit.

## 011 · Editing and CSV policy

Freeze name/date/location after issuance or provisioning, retain ID/key forever, and allow descriptions through loaded-revision checks. This avoids silent changes to existing ticket/scanner expectations. CSV uses a standard parser, strict headers and an explicit preview. Any invalid row blocks the batch; normalized email duplicates are counted/skipped and rechecked transactionally. One attendee per email per event is a documented prototype limitation.

## 012 · Keep ticket proof separate from operation authority

Verify signed tickets before a new admission, then use the existing immutable record engine. Do not rewrite the sync protocol or misrepresent its hash as an admission signature. Ticket-catalog membership narrows imports to known IDs but does not authenticate operations. Staff authorization/signed evidence remains Phase 2B work, not silently implied by signed tickets.

## 013 · Minimal offline export and optical recovery

Use safe self-contained SVG for individual tickets and printable HTML for a sheet, retaining original token signatures across exports. QR viewBoxes/module sizes remain explicit. Whole-ticket SVG image import can crop the rasterized QR by generated geometry; it never reads a hidden payload. A retained failure fixture plus repeated browser tests cover this path. Physical optics remain unverified for Phase 2A.

## 014 · Respect the final design scope

Retain the practical interface already built during Phase 2A. The user deferred UI/UX redesign to Stage 4, superseding the brief agency-reference steering. Remove the experimental components, media and dependencies instead of shipping unused design scaffolding. No unrelated marketing site or agency branding is added.

## 015 · Phase 2B authority without an engine rewrite

Supersedes the real-event unsigned-sync limits in decisions 002/003/012; synthetic workbench v1 remains unchanged. Give every scanner an independent native non-exportable key/UUID. Explicit organizer-issued event/key/identity credentials distinguish database profiles from admission authority. Retain record shapes/engine and add proof sidecars rather than mixing browser cryptography into pure reconciliation.

## 016 · Canonical evidence and deterministic roots

Sign every record field, version, authorization epoch and credential-content hash under a separate admission domain. Verify before accepting trusted records. Compare canonical signed content under reused operation IDs; ECDSA's randomized signature bytes are not identity. Different valid signatures over identical content deduplicate, but changed proof metadata does not. Attendance/conflicts derive from the same unchanged engine over verified active operations.

## 017 · Portable grants and monotonic revocation

Portable organizer-signed credentials avoid a roster-wide package update for every grant. Keep a separate signed append-only revocation policy with increasing epochs. Updated devices exclude every operation from a revoked key/ticket and preserve evidence, since client time cannot establish a reliable theft cutoff. Never claim immediate disconnected revocation or freshness from equally stale agreement. Existing non-exportable organizer keys remain non-exportable; secure recovery is explicitly absent.

## 018 · Explicit bounded optical sessions

Replace manual real-event selections with complete snapshot preparation, a receiver-authenticated request, signed offer/indexed frames, exact missing indices and a receiver-signed acknowledgment. Keep 900-byte/H-correction frames and manual advancement for stable captures; two signed admissions fit per data code. Durable staging admits no partial records before manifest/author verification. Content/context roots establish snapshot agreement; counts alone do not. Return acknowledgments explicitly; reverse exchange handles receiver extras.

## 019 · Migration cannot manufacture trust

Preserve all old tables/keys/logs through additive v3. Package v1 remains legacy preparation but cannot authorize or downgrade a secured event. Unsigned real-event imports fail, and old unsigned records stay visible/excluded; never sign/promote them retrospectively. Legacy-known local tickets still block repeats until investigated. Old builds require operational retirement; protocol validation cannot force an update on an unreachable device.

## 020 · Preserve evidence and explicit storage context

An unexplained production disappearance keeps the reliability gate FAILED independently of automated results. Preserve database names/history and non-exportable keys; stop unknown-schema repair and association failures with actionable recovery states. Resolve root launches from existing namespaces or an explicit choice, then carry the namespace in every normal URL. Read errors cannot become empty lists. Exports are key-free recoverable information, not signing-identity backups or trusted automatic imports. No destructive startup, identity replacement or insecure key backup is an acceptable repair.
