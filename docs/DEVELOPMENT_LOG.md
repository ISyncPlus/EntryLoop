# Development log

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
