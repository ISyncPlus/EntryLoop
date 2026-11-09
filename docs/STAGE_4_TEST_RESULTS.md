# Stage 4 validation results

November 9, 2026. **Local implementation/automated gates passed. Original persistence incident/release gate remains FAILED/unexplained.** No physical camera/phone installation/novice study, deployment or production-data recovery is claimed.

## Final artifact and commands

Tested production build: **cd9a04935f24**, revision **72e6b2de15bd8aebcb275db08b606e66d08d96be**, modified checkout **true**. This records the served artifact's composite provenance, not a claim of clean source control or a deployment. Later documentation formatting does not relabel runtime assets.

| Gate                                                                    | Executed result                                                                                                                  |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                                                     | Passed; strict TypeScript.                                                                                                       |
| `npm run lint`                                                          | Passed; zero ESLint warnings.                                                                                                    |
| `npm run format:check`                                                  | Passed; checked again after final documentation.                                                                                 |
| `npm test`                                                              | **131 passed in 20 files**; previous 126 tests retained, five additional presentation/security-state checks.                     |
| `npm run build`                                                         | Passed; 15 precached resources (~1223.35 KiB). Existing >500kB entry warning retained, not suppressed.                           |
| `npm run test:e2e -- --workers=1 --output=.cache/stage4/final-72-tests` | **72 passed in 4.1 minutes**, 36 Chromium +36 WebKit. `.last-run.json`: passed, no failed tests.                                 |
| Focused QR + Stage 4 UI after obstruction fix                           | **12 passed** in both engines; `.cache/stage4/final-optics-ui/`.                                                                 |
| Source whitespace / engine integrity                                    | `git diff --check` passed. Reconciliation SHA-256 unchanged: `db7489cba82d6c25b0d6a1f46986645d2cfa884ce821d7a2a6b1c3d5209bb86a`. |
| Historical incident                                                     | **FAILED/unexplained**. Automated success does not establish its cause or restore an absent key/event.                           |

Entry JavaScript: 599,922 bytes; CSS: 36,530; deferred decoder chunks: 26,867 and 453,908. No dependency was added. Local fonts/chunks remain precached. Source/schema/namespace/signature protocol compatibility was preserved; no new migration or private-key export.

## What the tests exercised

All 64 prior browser cases remain, including actual storage/process restart, historical native IndexedDB schemas 10/20, unknown/incompatible schema failures, event/key/credential/operation integrity, multiple tabs/isolated profiles, transaction/read failure, no destructive startup, two actual compatible builds/waiting service worker, first-use offline lazy decoding, forged/wrong-event/stale/revoked/duplicate input, independent concurrent admission/conflict, real QR pixel downloads/screenshots/scales, durable partial exchange/restart/missing requests, repeat-safe imports, reverse exchange/content-root acknowledgment, and the full seven-person organizer/two-entrance scenario.

Four added browser cases per engine:

- Organizer Overview/next action/retained view, real issuance/download, explicit computer authorization, offline SVG-pixel admission/duplicate rejection, unchanged organizer records/key metadata, receive/send handoff and removal of the previous QR when choosing a new sending interaction.
- Ten views × two themes × five viewports = **100 measured states per engine, 200 total**: Events, create form, event preparation, Overview, Guest list, Tickets, Scanner devices, Attendance & sync, Check-in and Sync & conflicts. Widths 320,390,768,1440 plus 720×450 layout-equivalent 200% zoom. **Zero reported page overflow, sub-44px tested targets, selected text contrast <4.5:1 or active field boundary contrast <3:1**. Screenshots/JSON are under `.cache/stage4/screens/` and `layout-{chromium,webkit}.json`. These are sampled control/text checks, not a full accessibility certification.
- Fresh browser organizer/entrance choices remain visible at 320px, work in both theme paths, retain deliberate main-workspace selection and create zero signing identities. Enumeration failure and known-workspace choices retain separate safe behavior.
- Actual-browser keyboard activation of recovery disclosure and shared arrow-key tabs, theme/context retention and reduced-motion content visibility.

Five added unit checks cover rejected-signature feedback, send intent versus a receipt, preparation versus independent authorization, native disclosure interaction, and real-state issuance/next actions without an invented zero-guest progress denominator. Existing pending QR/compatibility/input-lifetime/query lifecycle/security tests remain. Browser keyboard behavior is checked in real browsers because jsdom does not implement native Space activation for summary.

## Design skill and visual evidence

Used installed design-taste-frontend app-screen rules and the Stage 3 Accent ladder plan (seed 877116420); later user reference informs hierarchy and real preparation/received-admission panels. No template project data, decorative charts or external assets were added.

- Before: `.taste-skill/stage4-before/`. Actual desktop/tablet/mobile pictures show diagnostics dominating first use despite zero initial meter failures.
- First look/fix: `.taste-skill/stage4-round1-{light,dark}/`. Measured zero failures/warnings; opened six folds. Populated screenshots exposed repeated mobile metrics, self-approval ambiguity and a native WebKit select below the intended height. Fixed those before acceptance.
- Final healthy-empty inspector: `.taste-skill/stage4-final-{light,dark}/`, **zero failures/warnings** at 1440/768/390. All twelve listed fold/full-page images were opened.
- Final populated real-UI inspection: `.taste-skill/stage4-final-populated/report.json`, **42 views, zero failures, two warnings** using the installed skill's own DOM probes/rules. Fictional Harbor guests were created/imported/issued through the actual app, with native local storage/crypto. No storage/key state was exported. Selected full-page images from every major screen were opened in both theme/size combinations; this is not a claim that a human separately inspected all 200 automated variants.
- Two warnings concern a horizontally scrolled Event details tab at 15px from a 390px screen edge. Its scrolling container stays within the page, keyboard targets are retained, and no content/quiet zone is clipped; no allowlist was used. Source lint on production files (excluding isolated test fixtures) has **zero failures**, with monospace and aggregate em-dash warnings justified in UX_BEFORE_AFTER.md.

The final fresh-browser setup additionally passed `.taste-skill/stage4-first-use-{light,dark}/` with zero failures/warnings at 1440/768/390; all listed fold/full-page images were opened.

No human-panel design/usability score or screen-reader certification is invented. USABILITY_TEST_PLAN.md is unperformed. Actual browser/OS 200% chrome zoom remains manual; the viewport-equivalence test is labeled honestly.

## Failures found and corrected

- WebKit native select rendered below 44px despite min-height. Explicit 46px height fixed the measured touch box; cross-engine target checks now pass.
- Repeated mobile metrics displaced guest/ticket work. Overview keeps full metrics; other tabs disclose compact totals. No metric was hardcoded or removed from underlying state.
- Optional organizer-computer authorization was too easy to confuse with approving a phone. Separate disclosure and admission-authority warning, with explicit test navigation.
- Dashboard-inspired sticky top bar covered part of a scrolled enrollment target; actual screenshot decoding failed at the retained QR regression. Removed the sticky top bar; kept decoder/signature/quiet-zone/integer-module assertions. Same retained test passes across widths/DPRs in both engines. Physical camera optics are a separate unverified gate.
- New unit test used Playwright's `exact` option in Testing Library; strict TypeScript caught it. Corrected the test API, rebuilt successfully, then reran the final gates. No type check was bypassed.
- Fresh-launch title changes required updating the initial heading wait in four retained schema/migration scenarios. All their original record/key/version assertions remain. Final cross-engine migration/error cases passed.
- First attempts used old test navigation for newly disclosed compatibility/recovery controls. Tests now open the real controls before acting; their original assertions remain.
- One earlier overlapping-run attempt lost its local preview server and was interrupted. Those connection/teardown failures are environment/run failures, not passes. Final validation used one serial complete suite. Earlier failure traces remain in `.cache/stage4/`; no failing test was deleted.

Earlier 70-test runs passed under `.cache/stage4/final-tests/` and the QR-safe `.cache/stage4/release-check/`; they do not substitute for the final 72-case `.cache/stage4/final-72-tests/` pass, which also includes the fresh-browser refinement. Incomplete/interrupted directories such as `first-regression`, `regression-second`, `final-complete-tests` and `final-validated-tests` and `final-first-use` are retained and must not be reported as successful full runs.

## Still unverified

Real MacBook front/rear phone cameras, Android/iOS OS permission and installed-PWA contexts, dim-room scan success/throughput, actual browser chrome zoom, screen-reader announcements/focus order with assistive technology, novice comprehension, large-event optical practicality, live staging and the original organizer disappearance. Non-exportable lost signing authority remains unrecoverable from records-only exports. Follow PHYSICAL_ACCEPTANCE.md and USABILITY_TEST_PLAN.md without clearing original incident storage. Stop after Stage 4; no deployment/push or Stage 5 was performed.
