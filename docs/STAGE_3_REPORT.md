# Stage 3 product readiness and integration report

November 6, 2026. Work is confined to EntryLoop. **Original incident gate: FAILED/unexplained.** Stage 3 does not claim restoration or permanent resolution. Stage 4 implementation, production deployment/push, account changes, cloud services and payments were not performed.

## Scope and findings

Audited organizer event/manual+CSV/ticket/export/provision/enrollment/attendance/conflict flows and staff first launch/preparation/authorization/offline/admission/reconciliation/interruption/receipt/restart. Read current AGENTS, architecture, roadmap, Phase 2B report, persistence/recovery/QR/test/UX audits and relevant source/tests. Prior user changes were preserved. Exact workflow inventory: END_TO_END_WORKFLOWS.md.

Confirmed corrections:

- Organizer attendance/conflicts lacked a direct event-management connection. Added **Attendance & sync**, reusing existing verified exchange and ledger, explaining local scope and linking to explicit authorization. No observer capability was invented.
- Workspace-enumeration failure could also say no workspace was detected. Error guidance now makes no empty-state conclusion.
- Diagnostic raw error text could include attendee values. Downloaded diagnostic metadata now uses a generic storage status, while actionable local errors remain visible. Keys/rosters remain excluded; recoverable-record export is a separate PII-containing feature.
- Exact ticket-payload labeling became unstable after entry in the seven-person workflow. Added a stable accessible name and repeated-admission coverage.
- Starting a new exchange could expose a previous acknowledgment while preparation was pending. Busy state hides old QR output; pending-state unit and actual reverse/organizer exchange tests cover it.
- Eager decoder code contributed to the ~1.06MB entry script. It now loads on first image/camera use; all chunks stay precached. Cancellation before load completion does not open a camera.
- Tailwind scanned documentation as potential classes, making CSS depend on nonapplication text. Restricted scanning to app source for reproducible staging output, without a redesign.
- A privacy test's `not.toContain('Ada')` randomly matched a valid Base64 signature. Retained the test and strengthened it to exact allowed fields/full personal values; no PII leak was inferred from that false positive.

## Storage and compatibility

Database names, historical schema declarations and versions remain unchanged; no migration, clearing, key replacement or private-key export. Existing transactional writes/revision checks and read-only diagnostics/health guard were verified. App cannot discover another browser/OS/origin partition or prove why a currently absent event disappeared. Existing event/key restart/migration/update tests remain mandatory. The reconciliation engine and signed/ELQ1 protocols were not rewritten. Legacy signed JSON remains supported; old peers still need compatibility output.

## Automated integrated scenario

`tests/stage3.spec.ts` uses one fictional event/seven guests, two separately enrolled entrance devices, real native signatures and actual QR-image exchange. It exercises manual+CSV deduplication, seven-ticket export, offline provisioning/enrollment, valid/duplicate/forged/wrong-event rejection, independent duplicate admission, durable partial staging/process restart/missing request, repeat-safe imports, returned acknowledgment/reverse exchange and exact identity/root agreement. It then explicitly authorizes organizer receipt and verifies organizer-local attendance plus three-device restart/key retention. Expected final state: **seven immutable operations, six unique tickets, one conflicted ticket; seventh guest unused**. Two entrance devices admit; optional organizer reporting uses a third authorized identity on the computer and grants admission authority too. No successful camera callback is mocked.

The complete scenario passed in Chromium and WebKit; actual IDs/verified receipt roots are retained in STAGE_3_EVIDENCE.json. Physical cameras/phone OS installs remain unverified even when the browser scenario passes.

## Performance and deployment readiness

Before measurements: six clean desktop browser contexts (three per engine), local preview/no artificial throttling, recorded under `.cache/stage3/startup-before.json`. First entry JS 1,056,669 bytes. Decoder splitting reduces entry evaluation; it does not reduce the total initial offline installation download. QR/IndexedDB/list/sync behavior was inspected and measured at the seven-person rehearsal; maximum-scale/low-end-phone throughput is not established. No speculative caching of trust decisions or cryptographic rewrite was added.

The existing SPA rewrite, prompt/waiting SW lifecycle and HTTPS/camera requirements remain. Added public build-info.json, source fingerprint/revision/dirty state in storage diagnostics, and a local-only allowlisted staging snapshot command. Account/project/domain setup is not done: no Vercel CLI or linkage was found. Stable staging needs a separately approved project/origin; see STAGING_DEPLOYMENT.md. A desktop local route/engine test does not establish an actual Android/iOS deployment visit.

## Validation, provenance and artifact

| Gate                                    | Actual final result                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript / ESLint / formatting | Passed                                                                                                                      |
| Unit/integration                        | **126 passed across 19 files**, all earlier coverage retained                                                               |
| Browser                                 | **64 passed (32 per Chromium/WebKit, 3.3 minutes)**; `.cache/stage3/final-complete-tests/.last-run.json` passed/no failures |
| Production build                        | Passed; 15 precache resources; existing >500kB warning retained, not suppressed                                             |
| Staging snapshot rebuild                | All **15 output files byte-identical**, including SW, entry/chunks/CSS and public build metadata                            |
| Original persistence incident           | **FAILED/unexplained**, not waived by test results                                                                          |
| Live staging / physical acceptance      | **Not performed**, require account/project approval and actual devices                                                      |

Tested build **`362466aa0c8b`**, revision **`8d718e7cbc188460bac23fbe58ecd60f893de87e`**, **modified checkout: true**. This is the exact composite metadata used by the served/tested build, not a claim of clean HEAD. Reporting HEAD is `8c90457c475f0521be7b6dc263a7057077ac07c1`; a commit made after a build does not retroactively relabel tested assets. Source snapshot and SHA-256 manifests preserve the actual tested inputs/output; provenance metadata is not cryptographic authority.

Prepared snapshot: `/Users/InhouseHQ/Desktop/EntryLoop/.cache/stage3/staging-362466aa0c8b-1793928842604` (106 allowlisted files), recorded in `.cache/stage3/staging-latest.json`. Rebuilt output digests/equality and safe synthetic acceptance IDs/roots are in STAGE_3_EVIDENCE.json. It contains no private keys or real attendees. No credentials, .vercel links, browser data, key files or environment files were included. No CLI/account/project/deployment/push operation was run.

Early failures were retained and fixed, not erased: stale ticket label caused the initial workflow timeout; old acknowledgment capture exposed pending-QR state; keyboard expectations were extended to traverse the new tab without dropping coverage. The old zero-request test initially counted cached decoder resource URLs during first-use initialization. It now performs an offline negative-control image initialization (zero admissions) before retaining the strict **zero requests during actual record exchange** assertion; separate readiness coverage verifies first-use offline loading. Earlier formatting/typing corrections and an interrupted WebKit teardown are not reported as passes. Final clean rerun passed every case.

| Measurement                          | Before     | After                 |
| ------------------------------------ | ---------- | --------------------- |
| Entry JS, decoded bytes              | 1,056,669  | 581,853 (44.9% lower) |
| Entry JS gzip (build output)         | ~302.75 kB | ~179.33 kB            |
| chromium workspace ready wall median | 148.0 ms   | 126.0 ms              |
| chromium DOMContentLoaded median     | 88.8 ms    | 64.1 ms               |
| webkit workspace ready wall median   | 202.0 ms   | 118.0 ms              |
| webkit DOMContentLoaded median       | 90.0 ms    | 55.0 ms               |

Three fresh contexts per engine on this local desktop/preview, no CPU/network throttling. These small observations include automation and warm OS caches, not controlled statistical speed/phone claims. First Chromium sample was slower after; do not hide that variation. Raw samples are retained in STAGE_3_EVIDENCE.json. WebKit resource timing can report zero decoded body bytes for SW responses; that is unavailable byte accounting, not a zero-byte decoder. Build-file sizes establish actual artifact sizes.

| Area                       | Observed result / decision                                                                                                                                                                                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decoder initialization     | Two deferred chunks (~26.87/453.91 kB) absent from initial document requests, then loaded from offline precache on first real image import. Cancelling during load never starts capture in its unit regression. Physical camera permission/focus initialization remains unmeasured. |
| chromium QR workflow       | Generate 60 ms; first offline image decode/import 67 ms in this sample (includes automation/state updates, not isolated CPU or camera latency).                                                                                                                                     |
| webkit QR workflow         | Generate 104 ms; first offline image decode/import 84 ms in this sample (includes automation/state updates, not isolated CPU or camera latency).                                                                                                                                    |
| IndexedDB / list rendering | Seven-person actual transactions/search/import/issuance and reopen work; indexes/atomic writes retained, attendee rendering already capped at 50 rows. No measured large-list bottleneck justified refactoring. 5,000-attendee/10,000-operation ceilings are not proven throughput. |
| Sync recovery              | Exact partial staging/missing/receipt workflow passes; crypto verification remains conservative and may dominate larger snapshots. No speculative trust cache or engine rewrite.                                                                                                    |
| Offline startup            | All 15 resources/chunks precached; first-use decoder and offline process restart pass. Total install resources are ~1200 KiB, slightly above the prior ~1198 KiB; reduced initial evaluation is not reduced full download.                                                          |

## Stage 4 preparation and remaining gates

STAGE_4_UX_SPEC.md contains personas, screen questions/IA, journeys, state matrix, mobile/accessibility requirements, proposed pairing/sync, trust-preserving engineering dependencies and novice-test criteria. Used the selected app skill for planning only: Accent ladder, seed 877116420, current palette/type kept, no redraw or full implementation. No visual-inspector scores or novice study were fabricated.

Remaining: unexplained original event/key location, live stable staging approval/deployment, Android/iOS/Mac camera/install/permission testing, human trust-ceremony usability, offline revocation freshness, absent organizer-key recovery/rotation, malicious-origin/unlocked-device risk, large-event throughput and independent security/privacy review. Lost non-exportable authority cannot be rebuilt from public packages. PHYSICAL_ACCEPTANCE.md supplies exact safe steps and evidence requirements. Stop after Stage 3; Stage 4 implementation requires explicit authorization.
