# Reliability test results

**Incident/release reliability gate: FAILED.** The actual production disappearance remains unexplained. Software tests are a separate gate and cannot certify the original event/key were recovered or that loss is permanently fixed.

## Current validation · November 6, 2026

The standard sweep and Priority 8 source pass strict TypeScript, ESLint, formatting, **122 unit/integration tests across 15 files**, production build and **all 58 browser tests (29 per Chromium/WebKit, 2.7 minutes)**. Final complete output: ignored `.cache/hardening-qr-unicode-final/` (`.last-run.json` reports passed, no failed tests). The existing 52 browser regressions first passed unchanged before QR coding after 19 GiB became available. No tests were removed/skipped and no production data was cleared. The incident acceptance gate remains FAILED; the owner reports no new evidence and authorized moving forward with the standard sweep/QR work.

Nine new unit/integration cases cover the optical grammar/RFC/golden version compatibility, unchanged signatures, hostile/corrupt bounds, mixed-format durable sync/conflicts and the reproduced stale-format QR race. Six new browser executions cover the complete pixel matrix, actual app downloads/screenshots/DPRs, explicit compact enrollment authorization and new/old SVGs. All earlier storage/key/migration/offline/SW regressions passed on the final source.

The archived measurement run in `.cache/hardening-qr-final-verified/` performs 360 actual signed QR decode attempts; all native downloads and aligned screenshots pass, while deliberately smoothed fractional 240px images have failures recorded in QR_AUDIT.md / QR_MEASUREMENTS.json. Compact/M stress was 19/20, legacy/H 12/20 in this sample. These are diagnostic measurements, not physical camera success rates or hidden failed tests. Synthetic five-operation QR geometry was also measured in both engines (native and aligned 6/6 each, smoothed 3/6). The QR test harness is test-only and uses production helpers; no successful decoder callback is mocked.

The sweep additionally rejected lone UTF-16 surrogates explicitly, avoiding TextEncoder normalization of signed aliases; a regression covers this edge and unchanged legacy JSON. During implementation, the existing SVG XML regression caught a duplicate shape-rendering attribute; the redundant addition was removed. A focused test reproduced the old-image/compatibility-toggle race before the state-binding fix and passes afterward. Formatting warnings were corrected. Original ENOSPC failures remain historical evidence below, not the latest gate result.

Final build: 12 precached resources (~1198 KiB); existing scanner-bundle warning retained (~1056 kB minified / 303 kB gzip). No dependency added or warning suppressed. No mobile hardware, physical laptop camera, live production update or original-event recovery was performed. Exact final protocols, measurements, compatibility instructions and physical test plan: QR_AUDIT.md.

## October 28 historical execution

| Check                            | Result                                                                                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict TypeScript                | Passed on the hardening source                                                                                                                                                                                                                            |
| ESLint (zero warnings)           | Passed                                                                                                                                                                                                                                                    |
| Formatting                       | Passed after formatting the new browser fixtures                                                                                                                                                                                                          |
| Unit/integration                 | **113 passed across 13 files**, including all 93 earlier regressions                                                                                                                                                                                      |
| Production build                 | Passed, PWA generated with 12 precache entries; existing large-bundle warning retained                                                                                                                                                                    |
| New reliability browser suite    | **28 passed**: 14 scenarios × Chromium/WebKit, actual IndexedDB/WebCrypto/production assets                                                                                                                                                               |
| Complete browser suite           | **Incomplete/failed environment run**: 52 scheduled; run aborted with ENOSPC while writing test artifacts. Several cases could not finish. Not counted as a passing full suite.                                                                           |
| Disk investigation               | 217 MiB free after ENOSPC; 791 MiB after removing only EntryLoop's regenerable npm download cache. No installed dependency, production browser database, user profile or failed test evidence deleted. Further heavy tests paused pending adequate space. |
| Core reconciliation preservation | SHA-256 unchanged: `db7489cba82d6c25b0d6a1f46986645d2cfa884ce821d7a2a6b1c3d5209bb86a`                                                                                                                                                                     |

Node 24.20.0/npm 11.19.0. Runtime artifacts and disposable browser profiles stay under ignored project `.cache/` and `test-results/`. A current ENOSPC error is evidence of environment pressure during validation, **not** proof of the earlier incident's cause.

## Required scenario matrix

| Requirement                          | Coverage / evidence                                                                                                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Create event, reload              | `reliability.spec.ts`: normal navigation/reload, same event IDs                                                                                                                        |
| 2. Attendees survive reload          | Same test and persistent restart, three actual rows                                                                                                                                    |
| 3. Issued tickets survive restart    | Persistent browser-process test compares retained payloads and counts                                                                                                                  |
| 4. Organizer keys persist            | Native CryptoKey metadata and local sign/verify checks before/after; no private export                                                                                                 |
| 5. Organizer/scanner routes          | Normal route loop and preserved workspace parameter                                                                                                                                    |
| 6. Different scanner parameters      | Main/organizer isolation; pure profile/duplicate-parameter tests                                                                                                                       |
| 7. Multiple tabs, same profile       | Same-context views, concurrent revision conflict and unchanged record/key counts                                                                                                       |
| 8. Isolated browser profiles         | Separate browser contexts show separate labeled storage; no assertion of shared PWA partition                                                                                          |
| 9. Fresh/migrated databases          | Real native 10/20 fixtures, guarded migration to 30; fake-indexeddb integration also retained                                                                                          |
| 10. Browser-process restart          | Real persistent Chromium/WebKit user-data directories                                                                                                                                  |
| 11. Offline reload/online transition | Cached production resources; same event/ticket/key/scanner IDs, new valid admission                                                                                                    |
| 12. New builds/SW update             | `reliability-update.spec.ts`: two actual Vite builds A/B; real waiting worker; close/reopen; same IndexedDB/key/proof/credential state; offline reload/new signature                   |
| 13. Transaction failures             | Browser injected QuotaExceeded at policy write; event/key/policy all roll back; unit rollback preserves existing event                                                                 |
| 14. Read failures                    | Actual browser IndexedDB transaction fault and live-query unit faults                                                                                                                  |
| 15. No false empty after error       | Error-state assertions plus a previous-empty/same-query-later-failure regression after storing an event                                                                                |
| 16. Operations survive upgrades      | Native v1/v2 fixture records retained; signed proofs preserved across compatible production builds                                                                                     |
| 17. Key/record migration integrity   | Matching original key/event challenge, unchanged ticket payloads, device UUIDs and operations                                                                                          |
| 18. No destructive startup           | No product startup device/key generation; counts/IDs unchanged; unknown schema not repaired/downgraded; inspection does not create a database                                          |
| 19. Concurrent changes               | Two live tabs/revision conflict plus existing concurrent admission/import/issuance regressions                                                                                         |
| 20. Phase 1/2A/2B preserved          | All 93 old unit tests pass. Original browser scenarios ran in full-suite attempt, but aggregate completion was blocked by ENOSPC; final full-suite result must be recorded separately. |

Additional cases: orphan metadata/key detection with PII-containing key-free export; incomplete indexed metadata; unsupported native 40 and missing-index native 30 preserve records/version; scanner-only roles explained; failed authorization/credential import creates no replacement key; actual computed authorization contrast ≥4.5 in both themes.

Tests simulate faults only in disposable local test contexts. They do not clear real production storage. Native-key fixtures sign/verify locally and never return private key material. The two-build server serves actual compiled assets and the vendor-documented rewrite; this is not a Vercel deployment test.

## Failures retained, not hidden

- Initial new fixtures needed formatting; formatting was corrected, not bypassed.
- Full run hit physical `ENOSPC: no space left on device`, including browser-context write and artifact-directory creation failures. The runner stopped before all 52 cases completed. Failed evidence under `test-results/` was kept; no failing test was removed, skipped or converted into success.
- Earlier targeted new-suite run passed all 28 new browser cases before the complete run exhausted space. That does not make the complete run pass and does not resolve the real incident.

## Reproduce safely

Use adequate free disk/RAM and only disposable test profiles:

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm run check
```

For a constrained host, after `npm run build`:

```sh
npm run test:e2e -- --workers=1 --output=.cache/reliability-final-tests
```

The alternate output retains earlier ENOSPC evidence. Do not use browser/site-data clearing to make tests pass. These browser runs test local `127.0.0.1` and a controlled local update origin, never production database state.

## Still unverified

Original event/key location or actual deletion/eviction cause; incident-time disk/quota/clear-event telemetry; historical cached client build; exact original browser/PWA partition; original orphan store counts; actual Vercel deployment of the local rewrite; real MacBook/Pixel 8/second-phone acceptance; OS-level installation/storage partition behavior and eviction durability. Physical acceptance remains paused. Manual procedure: PERSISTENCE_RECOVERY.md.

## November 6, 2026 · resumed validation

The host now has 19 GiB available. Before QR implementation, rebuilt the unchanged hardening source and ran all 52 existing browser tests serially in Chromium/WebKit: **52 passed (2.3 minutes)**. Output: ignored `.cache/reliability-resume-tests/`; earlier ENOSPC evidence retained. No production/browser user data was cleared. This supersedes the full-suite environmental blocker, not the unexplained incident: the incident gate remains FAILED and no absent organizer authority is claimed recovered.

Final follow-up: the Unicode guard passed all 122 unit/integration and all 58 browser cases; `.cache/hardening-qr-unicode-final/.last-run.json` confirms passed/no failed tests. The archived reference measurements intentionally retain their original sample, including failures; a later fresh-key validation run can produce different stress counts without changing the ELQ1 representation. A read-only public HTTP recheck now reports deep-link 200 responses and a public bundle containing earlier QR/storage code that differs from the final local build. No deployment/push or production-storage operation was performed by Codex. See PERSISTENCE_AUDIT.md for exact asset evidence.

## Stage 3 validation · November 6, 2026

Stage 3 explicitly authorized despite the unresolved incident. Final source passed strict TypeScript/lint/format, **126 unit/integration tests (19 files)**, production build and **64 Chromium/WebKit browser tests (3.3 minutes)**. Includes all earlier regressions and the seven-person three-context signed optical scenario, interrupted recovery, organizer receipt and process restarts. Four added unit regressions cover workspace-enumeration failure wording, safe diagnostic error export, deferred camera cancellation and pending-exchange stale QR. Existing privacy/keyboard/offline exchange tests were strengthened/adapted, not removed. Exact measured performance, build metadata, retained early failures and byte-identical staging rebuild are in STAGE_3_REPORT.md / STAGE_3_EVIDENCE.json. Physical tests and live staging were not run; original incident gate remains FAILED.
