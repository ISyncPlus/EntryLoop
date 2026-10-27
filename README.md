# EntryLoop · Phase 2B

EntryLoop manages local events, issues signed QR tickets and reconciles check-ins between disconnected entrances through QR codes. Phase 2B adds event-scoped scanner authorization, signed admissions, revocation policies and resumable authenticated optical exchange. No backend, Wi-Fi, Bluetooth or internet is needed for the prepared core workflow.

This is a working MVP prototype with explicit limits, not an independent security certification. The owner observed Phase 1 reconciliation on two physical devices. New Phase 2B behavior has automated browser/QR-image evidence; **physical phone camera acceptance remains unverified**. UI/UX redesign is deferred to Stage 4; the existing interface is retained.

## Local setup

Node 22.12+ and npm (validated with Node 24.20.0):

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
npm run dev -- --host 127.0.0.1
```

Development URL: `http://127.0.0.1:5173/`. Actual offline/PWA testing requires production resources:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/`, wait for **App resources cached**, then normally reload. Camera, WebCrypto and service workers require HTTPS or localhost. A phone visiting an HTTP LAN IP is not localhost. [TESTING_PHASE_2B.md](docs/TESTING_PHASE_2B.md) includes the supported manual local-TLS procedure. No deployment was performed.

```sh
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium webkit
npm run check
```

The gate runs strict TypeScript, lint, formatting, unit/integration tests, fresh production build and Chromium/WebKit browser tests. `test:e2e` alone uses existing `dist`, so build first after source changes. [DEVELOPMENT_LOG.md](docs/DEVELOPMENT_LOG.md) records executed results and fixed failures.

## Routes and storage

| Route                  | Purpose                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `/`                    | Organizer events                                                                       |
| `/events/new`          | Create event and local organizer key                                                   |
| `/events/<event UUID>` | Guests, signed tickets, scanner provisioning/enrollment/revocation and guarded editing |
| `/scan`                | Event-package import and prepared events                                               |
| `/scan/<event UUID>`   | Authorized ticket admission, local trusted totals, evidence and authenticated sync     |
| `/dev/workbench`       | Clearly labeled synthetic Phase 1 experiment, retaining unsigned v1 exchange           |

Use `?scanner=organizer`, `?scanner=gate-a`, `?scanner=gate-b` for isolated desktop test databases. Same-profile tabs intentionally share data. **Profiles are namespaces, not authorization or separate physical devices.** Theme links retain `?theme=light|dark`. The additive Dexie v3 migration preserves the original database names, organizer keys, tickets and all historical logs.

Do not clear site data to update the PWA. Close old app tabs/windows so a waiting worker can activate; then reload normally. Clearing/eviction can destroy logs and non-exportable signing keys.

## Organizer and enrollment workflow

1. Create an event with stable UUID, name/date/location/description. Name/date/location lock after ticket issuance or provisioning; descriptions remain editable with stale-revision protection.
2. Add attendees manually or via bounded `name,email` CSV (1 MiB, 5,000 rows). Preview validates every row, skips normalized per-event email duplicates and blocks invalid batches. Names/emails stay organizer-local.
3. Issue unique signed tickets, retaining original tokens across repeated issuance. Download individual digital SVGs or self-contained printable HTML sheets (up to 500 tickets per sheet). Display names appear outside ticket QRs; handle exported files deliberately.
4. In **Scanner devices**, download the v2 event package. It contains event metadata, public organizer key, issued opaque IDs and a signed revocation policy. It contains no attendee roster or private key. Independently compare the full organizer fingerprint on every scanner.
5. Each prepared scanner opens **Scanner authorization and policy → Create enrollment request**. Use entrance aliases, not personal names. The scanner generates its own non-exportable key and shows its fingerprint/request QR.
6. Organizer scans the request, compares the full fingerprint directly on that scanner, enters it and explicitly authorizes. Return the organizer-signed credential QR to the requesting scanner. Other devices cannot use that credential without its private key. The organizer must choose **Authorize this device** if it also needs to check tickets.
7. Distribute updated packages after new ticket issuance. Distribute updated signed policy/package after revocation, and confirm the epoch on every device before its shift.

A prepared event is not scanner authorization. Initial fingerprint comparison establishes human trust; an included self-signature alone cannot identify the intended organizer.

## Offline admission and exchange

An enrolled scanner verifies ticket schema, pinned organizer signature, event, issued membership, current locally known revocation policy and local duplicate status. It signs each immutable admission with its authorized device key and saves the record/proof transactionally. Disconnected scanners can still admit copies of the same ticket concurrently; reconciliation retains both operations and reports the conflict.

In **Sync & conflicts**:

1. Receiver chooses **Start receiving** and shows its signed request to the sender.
2. Sender scans it and automatically prepares its complete trusted snapshot: signed offer, any required author credentials and numbered data batches (two operations per data QR).
3. Receiver scans the offer, then data codes in any order. Every QR is capped at **900 UTF-8 bytes**. Maximum snapshot: **10,000 operations**, 1,000 author credentials, 6,000 data frames. Nothing is silently truncated. Codes advance manually for stable camera reads.
4. Progress tracks exact received/missing frame indices. Partial frames are durable staging, absent from attendance. Resume after restart with **Resume saved exchange**; **Request missing batches** covers up to 32 missing indices at a time.
5. After complete manifest/content/signature verification, the receiver atomically merges and displays actual transferred/imported/skipped/rejected counters. Return its signed **Completion acknowledgment** QR to the sender.
6. If the receiver had additional operations, reverse the exchange. Matching canonical operation identity/content roots and policy/catalog context establish snapshot agreement. Counts alone never prove convergence. Later admissions or policy changes require a new exchange.

Camera stops after each code for review. QR image/JSON/manual-payload alternatives use the same verification but are not physical camera evidence. Optical exchange uses no network requests. There is no animated-frame or radio-based transport.

## Compatibility and security limits

- Pure reconciliation remains byte-for-byte unchanged. Check-ins remain immutable UUID operations; timestamps never determine identity, authority or a conflict winner.
- Signed ticket v1 stays compatible. Event-package v1 remains inspectable/importable as legacy preparation, but needs a v2 package and explicit enrollment before trusted admission. It cannot downgrade a secured event.
- Old unsigned real-event records remain preserved and clearly excluded from trusted attendance/sync. They are never auto-signed/promoted. Known local historical tickets still block accidental repeat admission; investigate them. New unsigned real-event transfer imports fail. Synthetic workbench v1 exchange remains operational.
- Organizer and scanner private keys remain non-exportable on their respective devices. There is no secure key backup/recovery or rotation feature. Lost organizer storage can permanently end issuance/revocation authority.
- Revocation is signed, monotonic and permanent. Updated devices exclude all admissions by a revoked scanner or for a revoked ticket, retaining the evidence. Disconnected devices cannot learn immediate revocation; equally stale peers may still agree with each other.
- An authorized scanner can fabricate a claim of physical attendance. Signatures establish key authorization/content integrity, not honest staff conduct, presenter identity or trusted time.
- Same-origin malicious code/extensions or an unlocked compromised device can invoke signing. No account/PIN access control, roster encryption, hardware attestation or independent cryptographic audit is claimed. Sync is authenticated but not encrypted.
- Browser storage eviction, real phone optics/install partitions, maximum-scale throughput and cumulative session/storage growth remain risks. The scanner-containing bundle still triggers the existing large-chunk warning.

## Technical references

- [Phase 2B delivery report](docs/PHASE_2B_REPORT.md)
- [Architecture and major files](docs/ARCHITECTURE.md)
- [Exact signed messages and QR state machine](docs/PROTOCOL_PHASE_2B.md)
- [End-to-end and two-phone acceptance instructions](docs/TESTING_PHASE_2B.md)
- [Recovery and revocation policies](docs/RECOVERY_PHASE_2B.md)
- [Threat model](docs/THREAT_MODEL.md), [decisions](docs/DECISIONS.md), [roadmap](docs/ROADMAP.md)
- [Third-party and AI attribution](THIRD_PARTY_NOTICES.md)

No dependency was added for Phase 2B. Crypto uses native WebCrypto; Dexie/Zod/ZXing/QRCode and all previous package attribution remain. No cloud sync, payments, deployment, push or Stage 4 redesign was performed.
