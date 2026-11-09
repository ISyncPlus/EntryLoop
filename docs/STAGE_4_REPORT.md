# Stage 4 product experience report

November 9, 2026. Implemented locally inside EntryLoop. **The original persistence incident remains unexplained; its reliability/release gate remains FAILED.** This phase does not restore the absent organizer event or establish its historical cause. No deployment, push, external account/project change, backend, cloud sync, payments or Stage 5 implementation.

## New product experience

EntryLoop now leads with event operations rather than storage diagnostics. Fresh successfully inspected contexts offer an organizing or entrance-preparation choice; existing contexts/errors retain explicit safe resolution. Organizer event management opens an Overview showing actual guest/ticket/local-attendance/conflict figures and a next action derived from stored data. Guests, Tickets, Scanner devices, Attendance & sync and Event details remain distinct keyboard-accessible task views. The selected view is retained in the URL fragment; all navigation still preserves the explicit storage namespace and theme.

The organizer can add/import/search/issue through existing services. Mobile guest tables become readable stacked rows with retained ticket IDs. Ticket selection/export remains real SVG/HTML and signed QR; technical compatibility/format detail is disclosed progressively. AttendanceReview gives a small received-admission list and clear concurrent-admission warnings with organizer-local guest lookup; the full original immutable ledger remains available.

Staff open Event check-in and their prepared event directly. The event/entrance, local count, large scan action and textual admission outcomes carry the screen. AdmissionFeedback distinguishes duplicate, wrong-event, unknown-ticket, authorization/revocation and signature failures, retains exact failure detail and offers a practical next action. Each camera read still stops for review, then the same prominent control starts the next read. No automatic acceptance or mocked physical success is introduced.

## Enrollment and offline exchange

EnrollmentGuide presents prepare → request & approve → ready with instructions for the specific displaying/reading device. The organizer scans the intended phone, independently compares the complete fingerprint, explicitly authorizes and returns the bound response. Local authorization requires an installed policy with a compatible epoch; revoked/outdated/unknown states are never silently called ready. Known approvals are local permissions, not presence/online status. Preparing the event file is not authorization.

The initial launch puts clear organizer/entrance choices before technical workspace controls, retains missing-event cautions and never creates signing identities from role selection. Optional authorization of the organizer computer is behind a separately named disclosure and explains that it grants admission authority as well as record reception. There is no fabricated observer-only credential. Full fingerprint verification and initial event-file transfer remain necessary: removing them honestly requires a separately reviewed/versioned pairing/provisioning protocol. No new enrollment cryptography or security downgrade was implemented. The later dashboard reference is used for hierarchy, compact metrics and preparation/received-admission panels, using existing React components and real stored data. No template statistics or task-throughput chart were introduced.

ExchangeGuide follows the existing saved request/incoming/outgoing session: choose receive/send, show request, read offer/batches, recover missing batches, return signed confirmation and exchange the opposite direction when needed. Progress and result counts use actual durable session fields. Choosing to send clears the previous displayed-session context so an old receipt QR cannot look like a new request. Busy actions hide stale targets. Full IDs/capacity details remain available through disclosure. Signed acknowledgments and operation/content-root comparison remain the authority for snapshot agreement; no continuous global synchronization claim.

## Reliability, accessibility and design

Storage checks still run before normal writes. Diagnostics move below the task content and default closed for healthy contexts, including a successful empty read; recovery-required associations/errors still surface immediately and block normal writes. Failed reads do not become first-event guidance. Local origin/workspace boundaries remain visible. Records-only exports and non-exportable key limitations remain explicit. No namespace/schema/version/key/operation migration or reset is required.

Design uses the selected Accent ladder direction, seed 877116420, green neutral tint roles, local IBM Plex Sans and a small consistent SVG icon set. No external fonts/images, new dependencies, agency video, decorative charts, gradients or motion framework. Layout is responsive across desktop/tablet/phone; QR outputs stay white/black with existing quiet zones and physical module alignment. Native disclosure, shared roving-tabindex tabs, live feedback, visible focus and reduced-motion support preserve accessible semantics. Details are in DESIGN_SYSTEM.md and UX_BEFORE_AFTER.md.

A screenshot review caught repeated phone metrics pushing task controls down; those now collapse into a summary outside Overview. Actual WebKit measurements caught a native select below the touch target, fixed with explicit height. Browser selected-text contrast/target/overflow tests accompany the existing authorization contrast tests. These checks are not a complete WCAG audit or novice-user acceptance.

## Files and responsibilities

| Files                                                      | Responsibility                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| ProductApp, WorkspaceLaunch, WorkspaceStorage, product.css | Local-context shell, first use, task-first recovery placement, offline/theme/navigation and responsive tokens.                       |
| ProductUI                                                  | Shared icons, labeled tab navigation and stable loading presentation.                                                                |
| EventDetail, EventOverview                                 | Scoped organizer views, actual metrics and next setup action; view retained without moving browser data.                             |
| AttendeeManager, TicketManager, Provisioning               | Mobile guest rows, CSV/issuance/export controls, ticket presentation and honest event-file trust instructions.                       |
| ScannerAuthority, EnrollmentGuide                          | Intended-device handoff, full independent verification, locally known authorization states and explicit computer self-authorization. |
| ScanPage, AdmissionFeedback                                | Event/entrance scanning, actual signed admission result and actionable failure feedback.                                             |
| SecureSyncPanel, ExchangeGuide, SecurityTransfer           | Guided optical direction/progress/resume/receipt, stale-code protection and advanced transport disclosures.                          |
| AttendanceReview                                           | Local received admissions, organizer-only guest lookup, conflict summary and retained full evidence.                                 |
| ProductExperience.test.tsx, tests/stage4.spec.ts           | New presentation/security-state/browser workflow, responsive, contrast, targets and keyboard/reduced-motion regressions.             |
| Existing events/QR/reliability/Stage 3 browser tests       | All previous cases retained; actions now explicitly open the appropriate guest/advanced views.                                       |

The pure reconciliation, database schemas, storage guards/backups, event/ticket services, WebCrypto authorization/signatures, optical codec/rendering and signed exchange engine were not rewritten. No private-key exports were added. AI-assisted implementation is attributed here and existing THIRD_PARTY_NOTICES.md is retained.

## Verification and exact local review

STAGE_4_TEST_RESULTS.md records the final executed commands, counts, build identity and failed/interrupted early runs. The comprehensive seven-person, two-entrance plus organizer receipt scenario remains a regression. Browser QR pixels/native storage/WebCrypto tests do not establish phone camera hardware acceptance.

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
npm run build
npm run preview -- --port 4173
```

Open `http://127.0.0.1:4173/`. For a deliberately separate review namespace, use `http://127.0.0.1:4173/?scanner=stage4-review`. Existing data is not copied into this new context. Use the same URL/browser thereafter. Stop the preview with Ctrl-C. If an older local application is cached, use the waiting-update notice, preserve this same workspace and close old EntryLoop windows before reopening. Do not clear site data to update the UI. Localhost on a phone refers to the phone, not the Mac; physical camera review requires the existing trusted HTTPS setup or a separately approved stable staging origin. No such deployment was performed.

Review: create a fictional event → Overview → Build guest list → add/import `tests/fixtures/stage3-attendees.csv` → issue → Tickets/select/download → Scanner devices/download package → prepare a separate browser/device at Event check-in → independently verify organizer fingerprint → show request → organizer scans/compares full fingerprint/approves → phone scans response → cache and normal offline reload → scan a ticket → exchange both directions/interrupt/resume/return confirmations → review preserved conflict evidence. Use PHYSICAL_ACCEPTANCE.md for the exact seven-operation/six-ticket/one-conflict scenario. Expanded records/diagnostics remain under native disclosures and `/dev/workbench` stays explicitly labeled development.

## Remaining limits and Stage 5 proposals

The original incident gate is FAILED. Human novice usability, real Android/iOS/MacBook optics/permission/install behavior, actual 200% browser chrome zoom, screen-reader workflows and low-end-camera throughput require the manual plan in USABILITY_TEST_PLAN.md. Full fingerprint comparison and initial file handoff remain burdensome. Technical errors/advanced controls are intentionally retained rather than concealing investigation evidence.

Recommended next authorized scope: run and act on novice/physical acceptance; establish/accountably resolve the persistence incident; independent security review of trust/revocation operations; review a versioned simpler enrollment/provisioning protocol and a genuine receive-only role if needed; measure large-event optical throughput/retention/storage limits; review privacy, recovery/key-loss/reissue and competition attribution requirements. These are proposals, not Stage 5 implementation or permission to deploy.
