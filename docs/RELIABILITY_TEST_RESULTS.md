# Reliability test results · October 28, 2026

**Incident/release reliability gate: FAILED.** The actual production disappearance remains unexplained. Software tests are a separate gate and cannot certify the original event/key were recovered or that loss is permanently fixed.

## Executed so far

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
