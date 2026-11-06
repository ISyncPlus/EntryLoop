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

Executed results, build identity, measurements and snapshot verification are populated after the final validation below. Physical cameras/phone OS installs remain unverified even when the browser scenario passes.

## Performance and deployment readiness

Before measurements: six clean desktop browser contexts (three per engine), local preview/no artificial throttling, recorded under `.cache/stage3/startup-before.json`. First entry JS 1,056,669 bytes. Decoder splitting reduces entry evaluation; it does not reduce the total initial offline installation download. QR/IndexedDB/list/sync behavior was inspected and measured at the seven-person rehearsal; maximum-scale/low-end-phone throughput is not established. No speculative caching of trust decisions or cryptographic rewrite was added.

The existing SPA rewrite, prompt/waiting SW lifecycle and HTTPS/camera requirements remain. Added public build-info.json, source fingerprint/revision/dirty state in storage diagnostics, and a local-only allowlisted staging snapshot command. Account/project/domain setup is not done: no Vercel CLI or linkage was found. Stable staging needs a separately approved project/origin; see STAGING_DEPLOYMENT.md. A desktop local route/engine test does not establish an actual Android/iOS deployment visit.

## Validation, provenance and artifact

Pending final run; do not interpret this section as a pass until actual results and artifact identity are recorded.

## Stage 4 preparation and remaining gates

STAGE_4_UX_SPEC.md contains personas, screen questions/IA, journeys, state matrix, mobile/accessibility requirements, proposed pairing/sync, trust-preserving engineering dependencies and novice-test criteria. Used the selected app skill for planning only: Accent ladder, seed 877116420, current palette/type kept, no redraw or full implementation. No visual-inspector scores or novice study were fabricated.

Remaining: unexplained original event/key location, live stable staging approval/deployment, Android/iOS/Mac camera/install/permission testing, human trust-ceremony usability, offline revocation freshness, absent organizer-key recovery/rotation, malicious-origin/unlocked-device risk, large-event throughput and independent security/privacy review. Lost non-exportable authority cannot be rebuilt from public packages. PHYSICAL_ACCEPTANCE.md supplies exact safe steps and evidence requirements. Stop after Stage 3; Stage 4 implementation requires explicit authorization.
