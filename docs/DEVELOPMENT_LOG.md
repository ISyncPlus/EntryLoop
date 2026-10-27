# Development log

## October 27, 2026 · Africa/Lagos · Phase 2B

Inspected AGENTS.md, architecture, Phase 2A report, threat model, persistence, ticket crypto, event repository, scanner/provisioning callers, reconciliation and existing tests before changing code. Applied the Ponytail coding workflow: native crypto, additive tables and existing presentation patterns, with no new dependency or design phase. All work remained in EntryLoop; no deployment, push, backend or unrelated repository changes were performed.

Implemented event-scoped root-signed scanner credentials and explicit fingerprint-reviewed enrollment; independent non-exportable scanner identities; signed canonical operation proofs; trust-only projections with retained legacy/revoked evidence; monotonic signed scanner/ticket revocation; package v2; and receiver-authenticated bounded snapshot exchanges with signed offers/frames/missing requests/acknowledgments. Added durable staging and import-counter transactions, exact content/context agreement, compatibility safeguards, permanent engineering rules, protocol/recovery/hardware instructions and the ten-part delivery report.

The pure engine remains byte-for-byte unchanged: SHA-256 `db7489cba82d6c25b0d6a1f46986645d2cfa884ce821d7a2a6b1c3d5209bb86a`. Main raw unsigned real-event imports now fail explicitly; the synthetic workbench retains its original v1 behavior. Existing organizer/scanner UI styles remain; only required functional controls and status text were added.

### Bugs and validation failures addressed

- New test declarations initially failed unused-variable/no-useless-assignment checks. Removed them before the successful gate. An early browser invocation against old assets was stopped; it is not counted as fresh-build evidence.
- Existing real-event regressions initially failed because admission now requires explicit enrollment. Updated setup/callers to enroll cryptographically and replaced unsigned real-event merges with verified signed merges; no insecure test fallback was added. Kept wrong-event/signature/duplicate/roster/export/storage assertions.
- A scoped Playwright `has` locator repeated its ancestor region and could not find the enrollment fallback. Corrected relative matching. Resume tests now wait for offer acceptance before retaining the incoming session UUID, avoiding capture of the prior request UUID.
- Repeated payload edits made a wrapped textarea's label unstable for exact matching. Separated its label using useId/htmlFor; browser tests repeatedly edit and submit actual signed payloads.
- Review found an interruption window between verified operation commit and acknowledgment signing. Persist import counters in the same transaction as records/proofs, retain them on retry, then sign/persist the acknowledgment separately. A regression forces acknowledgment signing to fail after merge, then resumes without losing/doubling the receipt.
- Initial policy signing could fail after storing a new event/key. Policy signing now precedes one atomic event/key/policy transaction. A failure regression confirms no partial event is left.
- A secure merge result unnecessarily exposed an attendance projection that included historical raw records. Return actual transfer counters only; aggregate product metrics use verified trustedSnapshot. A regression merges valid signed evidence alongside old unsigned records and confirms trusted attendance excludes the latter.
- Repeated interrupted-transfer tests exposed a Chromium persistent-context stall while reading a selected package, before crypto enrollment/sync. Diagnostics were temporary and removed. File inputs now retain the selected file until asynchronous validation/image/CSV processing completes, then clear for repeat selection. Added a deferred-read React regression. The uninstrumented three-per-engine repeat run passed six executions and the full suite passed afterward. This is defensive lifetime handling backed by regressions, not a claim that a browser-internal defect was independently proven.

### Final executed evidence

Node 24.20.0 / npm 11.19.0, final source:

| Check                                                 | Actual result                                                                       |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run check`                                       | Passed complete gate                                                                |
| TypeScript                                            | Passed strict configuration                                                         |
| ESLint                                                | Passed, zero warnings permitted                                                     |
| Prettier                                              | Passed                                                                              |
| Vitest                                                | **93 tests passed in 11 files**                                                     |
| Production build                                      | Passed; JS about 1,029.89 kB / 293.69 kB gzip; existing chunk-size warning retained |
| PWA generation                                        | 12 precache entries, about 1,170.73 KiB                                             |
| Playwright                                            | **24 passed**: 12 scenarios × Chromium/WebKit                                       |
| `test:e2e -- --grep 'partial secure' --repeat-each 3` | **6 passed** after file-lifetime fix, using native uninstrumented browser behavior  |
| Engine hash                                           | Unchanged, as above                                                                 |
| `git diff --check`                                    | Passed                                                                              |

Unit/integration coverage retains all 64 previous tests and adds 29 security/file-workflow regressions. Browser coverage retains all 20 earlier scenarios/engine executions with explicit authorization and adds four executions for interrupted restart/recovery and revoked/stale/forged-policy behavior. Real QR pixels, native crypto and actual IndexedDB are used. No mocked scanner callback is reported as physical success. Temporary file-read diagnostic instrumentation was removed before the final repeat/full runs.

### Security/hardware limits and attribution

No new physical camera-to-camera, phone installation, TLS trust setup, adverse-lighting, maximum-roster/throughput, OS eviction or independent cryptographic audit was performed. The owner-confirmed Phase 1 physical result remains historical. Two equally stale offline devices cannot know new revocations; policies must be distributed. Authorized/compromised scanners can sign false physical-attendance claims. Same-origin code can invoke non-exportable keys. No secure organizer-key recovery/rotation or encrypted access-control layer was added, and private-key export was not weakened.

Native WebCrypto and Dexie transaction constraints were checked against the [WebCrypto specification](https://www.w3.org/TR/webcrypto/) and [Dexie transaction documentation](https://dexie.org/docs/Dexie/Dexie.transaction%28%29). Package provenance remains unchanged; no dependency was added. OpenAI Codex assisted with architecture/source/test/debug/documentation work; user scope and hardware evidence remain separately attributed. Stage 4 UI/UX, cloud sync, payments and deployment remain outside this delivery.

---

## October 27, 2026 · Africa/Lagos · Phase 2A

### Scope and evidence

Inspected AGENTS.md, source, architecture/decisions, threat model, README, tests and roadmap before edits. The baseline complete gate passed 35 unit/integration tests and 10 browser tests. The owner reported Phase 1 physical two-device QR exchange with identical records and the expected conflict; this is recorded as owner-observed evidence, not a new Codex hardware test.

Phase 2A adds real event/attendee workflows, native signed tickets, public-only provisioning and signature-checked offline admission around the existing engine. The engine SHA-256 is unchanged: `db7489cba82d6c25b0d6a1f46986645d2cfa884ce821d7a2a6b1c3d5209bb86a`. Original DB names/logs/scanner IDs survive the additive Dexie migration. The workbench moves to `/dev/workbench`; its regression scenarios remain intact.

The user briefly supplied an agency-style visual reference, then explicitly deferred UI/UX work to Stage 4 and asked to retain the existing interface. The unintegrated reference components, video/poster and added animation/icon/dialog dependencies were removed. No Phase 2B, cloud sync, payments, backend, deployment or GitHub push was performed.

### Failures found, fixed and covered

- Mixed helper/component exports violated Fast Refresh lint rules; Feedback is now a separate component and shared hooks/functions remain in a TypeScript module. A missing href import was caught by strict TypeScript and fixed.
- A live event revision could silently advance the revision associated with an old form draft. The form now retains its loaded revision and requires explicit reload after a conflict; a React integration regression verifies no stale overwrite.
- SVG ticket export originally lost the embedded QR viewBox and used fixed sizing/spacing that could resample modules or crowd long location text. Nested QR viewBoxes are retained; geometry and vertical layout are derived from actual lines/module count.
- Ticket-sheet CSS originally targeted every nested SVG. It now sizes only the outer `article > svg`, preserving inner QR dimensions.
- The first complete browser run passed, but a subsequent 24-case repeat found one remaining full-ticket detector miss. The exact SVG is retained as `tests/fixtures/ticket-svg-regression.svg`. SVG image import now uses bounded declared geometry to crop **actual rasterized QR pixels**, then ZXing pure decoding. It never extracts a ticket token from markup. General/pure image fallbacks remain. The fixture test decodes the historical ticket and confirms wrong-event rejection with zero writes.
- Browser test selectors were tightened to accessible textbox/cell names and filtered status results; open `<details>` was initially misread because its boolean attribute is an empty string, now checked by attribute presence. These were test harness issues, not fabricated scanner behavior.
- Scanner-package export feedback now reads the exported catalog count rather than a potentially stale rendered prop.
- Existing tab controls now support arrow/Home/End navigation, roving focus and correctly linked panels; the real browser workflow checks keyboard behavior.

### Final executed validation

| Check                         | Observed result                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Strict TypeScript             | Passed                                                                          |
| ESLint, zero warnings allowed | Passed                                                                          |
| Prettier check                | Passed                                                                          |
| Vitest                        | **64 passed in 9 files**, including all 35 Phase 1 regressions                  |
| Production build              | Passed; PWA manifest/service worker and 12 precache entries (~1,136 KiB)        |
| Playwright full gate          | **20 passed**, 10 scenarios across Chromium/WebKit                              |
| Extended real-event repeat    | **30 passed**, 5 Phase 2A scenarios × 2 engines × 3 runs after the SVG crop fix |
| Engine preservation           | SHA-256 exactly matches the pre-edit baseline                                   |

`npm run check` completed successfully on the final implementation, including the keyboard-control regression. The extended run preceded only the final keyboard/doc refinements; no crypto, image or storage logic changed afterward. Browser tests verify actual native signing/verification, actual exported SVG/HTML downloads, IndexedDB, isolated public-only scanner provisioning, offline production reload, invalid signature/wrong-event/duplicate rejection, preserved real-event conflicts and retained-key signing after a real browser-process restart. QR decoding is performed on actual pixels; no successful scanner result is mocked.

Environment: Node 24.20.0, npm 11.19.0, Playwright Chromium 156 and WebKit 27.2. Build warning retained: scanner-containing JS chunk approximately 994 kB minified / 284 kB gzip. No arbitrary chunk-warning suppression was added. Dependency installation/uninstallation reported zero known npm vulnerabilities; this is not a security audit.

### Functional visual review and limits

Viewed the current organizer layout and mobile scanner/ticket screenshots, plus the standalone SVG rendering. Local IBM fonts address the initial font recommendation. The existing green-grey/light/dark interface is intentionally retained; full design is Stage 4. No agency media is shipped. Visual/source-inspector notes are in DESIGN.md and .taste-skill artifacts; these are not claims of a completed final identity.

No new physical phone camera, mobile home-screen installation, actual local TLS trust provisioning or adverse lighting/throughput test was performed. Large-event capacity/performance, storage eviction, assistive-technology behavior and security auditing remain unverified. Signed tickets do not authenticate unsigned sync operations; that boundary is explicit in UI/docs and is a Phase 2B recommendation.

### Attribution

Retained new dependency: Papa Parse, plus its development types. Crypto is native WebCrypto. IBM Plex is self-hosted with its complete OFL notice. Codex assisted with architecture, source, tests, debugging and documentation; user direction/physical evidence and the Stage 4 design deferral are recorded. Current package/license inventory is lockfile-derived.

---

## October 27, 2026 · Africa/Lagos · Phase 1

Started from an empty `/Users/InhouseHQ/Desktop/EntryLoop/`. All project source, dependencies, browser runtimes, build output and test artifacts were created inside this folder. No deployment, GitHub push or unrelated repository edits were performed.

Implemented the requested feature boundaries, strict TypeScript, lint/format configuration, synthetic immutable check-ins, deterministic reconciliation, atomic Dexie persistence, QR v1 integrity/validation, camera/image scanning, workbench and production PWA precache. Added permanent AGENTS.md rules and attribution.

## Bugs found and regression coverage

- Initial test database fixture used a 36-character UUID where profile names allow 32 characters. Fixtures now use hyphenless UUID namespaces; namespace validation tests cover invalid input.
- Reactive startup attempted scanner initialization through a Dexie read/write transaction inside liveQuery. Real React integration tests exposed Dexie's explicit rejection. Initialization now precedes the read-only subscription; all workbench startup/workflow tests exercise this path.
- Timestamp strings could change representation during epoch-millisecond transport and create false operation-content collisions. Canonical millisecond UTC representation is required and covered by domain/codec tests.
- A manual textarea length cap could silently truncate oversized pasted input. Removed it; codec enforces the byte limit with a visible error. A regression pastes 901 characters and checks the exact retained value and rejection.
- One WebKit QR-image import failed with the original fixed-width/resampled raster. QR generation now uses eight pixels per module and a whole-module display width; the browser tests verify rendered QR pixels, including maximum batches. The reader shows a useful fallback when decoder errors lack a message. Physical optics still require real-device testing.
- Repeating the QR browser tests found intermittent WebKit ZXing finder/dimension detection failures despite one green full run. Retained the exact failing five-operation image in tests/fixtures/webkit-qr-regression.png. Local-image decoding now tries the normal detector with TRY_HARDER, then ZXing's real PURE_BARCODE pixel extraction for pristine images. Both paths still decode optical pixels and run the same payload validator; no decoded result is mocked. A dedicated regression imports the retained image in both browsers. Camera scanning remains a general detector and still requires physical measurement.
- Reset originally left a generated QR snapshot/receipt in React memory after deleting stored operations. Reset now remounts the transfer panel, clears its transient state and stops its camera. A browser regression verifies that the old QR disappears after confirmed reset.
- Initial Playwright selector used exact label text on a label wrapping a select and its options. Updated to the actual accessible combobox role/name shown by the browser. This was a test-selector issue, not a simulated scanner result.

## Executed validation

Executed against the final Phase 1 source with Node 24.20.0 / npm 11.19.0:

| Check                                           | Actual result                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                             | Passed, strict TypeScript                                                                                                                                                             |
| `npm run lint`                                  | Passed, zero warnings permitted                                                                                                                                                       |
| `npm run format:check`                          | Passed                                                                                                                                                                                |
| `npm test`                                      | 35 passed across 4 files                                                                                                                                                              |
| `npm run build`                                 | Passed; generated manifest, service worker and 10 precache entries (~925 KiB)                                                                                                         |
| `npm run test:e2e`                              | 10 passed: 5 scenarios × Chromium and WebKit                                                                                                                                          |
| `npm run test:e2e -- --grep QR --repeat-each 3` | 18 passed after fixing the intermittent decoder failure                                                                                                                               |
| Design skill source lint                        | 0 failures, 2 warnings: SHA-256 hex padding and literal ID/code monospace, both intentional                                                                                           |
| Design skill browser inspection                 | 1440/768/390px screenshots inspected; one style-only failure remains: the reference sheet requests IBM Plex Sans, while this Phase 1 workbench deliberately uses local platform fonts |

`npm run check` completed successfully. Browser scenarios exercise two isolated offline contexts exchanging rendered QR pixels, five-operation capacity/over-capacity rejection, confirmed-reset removal of QR snapshots, the retained WebKit decoder regression, invalid-version rejection, event/profile isolation, mobile overflow and persistent browser-process restart with network disabled. During the two-context transfer, observed HTTP requests were zero. Chromium was Playwright Chromium 156; WebKit was Playwright WebKit 27.2. These engines do not equal tests on physical Chrome/Safari phones.

Build warning retained: the scanner-containing JavaScript chunk is approximately 928 kB minified / 264 kB gzip; no arbitrary warning suppression or premature split was added. Initial dependency installation reported zero known npm vulnerabilities; that is not a security audit.

Early failures above are retained for provenance. No failed or unexecuted test is counted as passed. The design font exception follows the user's explicit Phase 1 focus and deferred full-design scope; it does not block a functional test, and is not reported as a passing design-inspector result.

## Workbench visual review

Reference: design-taste-frontend framed-sheet, seed 263006709; simplified to one event-scoped workbench. The screen's question is whether local operations converge and which ticket admissions conflict. Green-grey scope, actual attendance and the scanner/operation evidence give it its face. Screenshots at 1440, 768 and 390 pixels were viewed. Totals reconcile to the ledger; conflicts use both text and color; phone sections stack without page overflow. No remote typeface was loaded, no marketing/identity phase started. The optional style-only font inspection exception is recorded above.

## Unverified acceptance

No two physical devices were available through this coding environment. Real camera capture/permission, screen-to-camera transfer, install/Add to Home Screen on phones, local certificate trust setup, adverse lighting and OS storage eviction remain unverified. Automated QR-image decoding and offline browser-process tests must be described by those names, never as physical transfer proof.

## AI and third parties

OpenAI Codex assisted with architecture, implementation, documentation, test authoring and debugging. The human supplied the product brief, scope, judging context, stack and selected design skill. No actual attendee data, external fonts, stock photographs or paid services were used. THIRD_PARTY_NOTICES.md and the lockfile provide dependency provenance. Competition policy compliance still requires checking the official rules before submission.
