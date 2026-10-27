# Phase 1 completion report

Implementation and automated validation are complete inside `/Users/InhouseHQ/Desktop/EntryLoop/`. The first physical-device success criterion remains **unverified**, not claimed complete. Phase 2 has not started.

## 1. Implemented

Vite/React/strict TypeScript, Tailwind v4 integration, lint/format/test tooling, immutable synthetic check-in models, deterministic reconciliation, Dexie persistence, explicit scanner profiles, versioned QR batches with schema/size/SHA-256 validation, real QR generation, ZXing camera and local-image adapters, a responsive engineering workbench, event-scoped reset, production PWA precaching and all requested engineering documents. Third-party and AI provenance are in THIRD_PARTY_NOTICES.md and the lockfile-derived package inventory.

## 2. Architecture

Pure domain → transactional repository → bounded QR transport → small React presentation components. Browser/platform APIs remain at the edges. No application backend or runtime external services. See ARCHITECTURE.md for the data flow and schema.

## 3. Major files

| File                                            | Responsibility                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `src/features/check-in/domain/models.ts`        | Typed models and record schemas                                    |
| `src/features/check-in/domain/reconcile.ts`     | Immutable union, duplicates, conflicts, totals                     |
| `src/features/check-in/domain/fixtures.ts`      | Two synthetic events, twelve tickets each                          |
| `src/features/check-in/persistence/database.ts` | Scanner identity and atomic event-scoped IndexedDB operations      |
| `src/features/sync/codec.ts`                    | Compact v1 encoding, validation, SHA-256 and capacity              |
| `src/features/sync/TransferPanel.tsx`           | Real QR image generation/decoding, explicit selection and receipts |
| `src/features/sync/CameraScanner.tsx`           | User-initiated ZXing stream and cleanup                            |
| `src/features/workbench/Workbench.tsx`          | Event/scanner controls, live real-state totals and scoped reset    |
| `src/features/workbench/OperationsLedger.tsx`   | Local/imported operation evidence and conflicts                    |
| `vite.config.ts`                                | PWA/Tailwind build and optional trusted local TLS                  |
| `tests/offline.spec.ts`                         | Production offline QR, restart, capacity and decoder regressions   |
| `AGENTS.md`, `docs/`                            | Permanent rules, scope, decisions, risks and evidence              |

## 4. QR format/capacity

UTF-8 JSON `{v:1,e:eventId,r:[[operationUUID,ticketId,scannerUUID,epochMilliseconds],...],h:sha256Hex}`. Hash compact normalized `{v,e,r}` JSON. Strict schema, explicit event, 1–5 entries and at most 900 UTF-8 bytes. H error correction and four-module quiet zone. Original raster uses eight pixels/module; display uses whole-module widths where possible. No truncation, no animated frames, no remote acknowledgment or automatic batch inventory. Five-record phone reliability remains experimental.

## 5. Reconciliation

Validate immutable operations and take set union by globally generated random UUID. Identical repeats are skipped. Divergent contents under one UUID reject the whole import. Distinct operations for the same ticket are preserved as a conflict. Attendance counts distinct tickets. Sort by ID with locale-independent comparison; clocks never choose identity or a winner. For valid operation sets, union is idempotent, commutative and associative. Peers need every relevant batch, in both directions, before claiming convergence.

## 6. Actual test results

`npm run check`: passed strict TypeScript, lint, formatting, 35 unit/integration tests, production build and 10 Playwright tests across Chromium/WebKit. An additional 18 repeated QR browser executions passed after the WebKit finder regression fix. Tests use actual QR pixels, ZXing and browser IndexedDB with network disabled after production cache warm-up. They verify zero observed HTTP requests during exchange and persistence across browser-process restart.

All functional automated tests ran. No physical camera-to-camera, mobile installation or local mobile certificate trust test ran. The design inspector's style-only IBM Plex font expectation remains intentionally open because the workbench uses platform fonts in this functionality-first phase. The source design lint has 0 failures and two justified warnings (hex padding, literal IDs in monospace). Full evidence and discovered/fixed bugs: DEVELOPMENT_LOG.md.

## 7. Security limitations

SHA-256 detects corruption, not author identity. Anyone can forge an unsigned batch and recompute its checksum. Scanner UUIDs are unverified claims. No authorization, signatures, key enrollment/revocation, encryption or trusted times. Only synthetic fixtures are accepted. Disconnected devices cannot prevent simultaneous admissions. See THREAT_MODEL.md.

## 8. Technical risks

Physical optical performance and camera permissions remain unverified. Browser storage can be evicted/cleared; no backup exists. Incomplete manual batch exchange leaves peers divergent. Aggregate logs lack production quotas. The scanner-containing bundle is large (~928 kB minified / 264 kB gzip); let precaching finish. A PWA manifest/service worker does not prove home-screen behavior on a physical phone.

## 9. Exact local setup

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/?scanner=a` and `http://127.0.0.1:5173/?scanner=b` for isolated browser databases. These are explicit same-browser test identities. To test production caching:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

For the full automated gate, install browser runtimes once with `PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium webkit`, then `npm run check`. Node 22.12+ required; validated with 24.20.0.

## 10. Two real offline devices

1. Follow the README trusted-local-HTTPS provisioning instructions. Both devices must accept the certificate without warnings. Initial provisioning may use the LAN. No deployment was performed.
2. Open A's `/?scanner=a` and B's `/?scanner=b` at the same trusted HTTPS origin. Install if offered, wait for caching, reload and confirm service-worker control. Check different UUIDs and choose the same LaunchPad synthetic event. Reset both selected-event logs.
3. Enable airplane mode; explicitly disable Wi-Fi, Bluetooth and cellular on both. Keep radios off. Reload normally on both to verify the shell is cached; stop if either fails.
4. Admit TEST-001 and TEST-002 on A; TEST-001 and TEST-003 on B. Each must initially show two operations and two unique tickets.
5. Select both A operations and generate a QR. B must use its **real camera** to scan A's screen. Expect transferred 2 / imported 2 / skipped 0 / rejected 0; four operations, three unique tickets and one conflict.
6. Select all four B operations, generate a QR and scan it using A's camera. Expect transferred 4 / imported 2 / skipped 2 / rejected 0. Both must now show identical operation IDs, three unique tickets and one conflict.
7. Scan B's same QR on A again: imported 0 / skipped 4, totals unchanged. Compare full ledger IDs, not only totals.
8. Close/reopen both apps while offline. Confirm scanner identities and logs survive. Test wrong-event rejection without writes. Record hardware/browser versions, payload sizes, counts, operation IDs, offline reload/restart evidence and failures; repeat a five-record frame.

The full README procedure includes optional local TLS commands, certificate trust cautions and expected counters. A QR-image file/manual paste may help debugging but must not replace step 5/6 in the physical acceptance claim.

## 11. Phase 2

No Phase 2 code was built. Proposed next work, requiring authorization: close the physical acceptance gate, establish authorized-device cryptography and recovery policy, measure QR limits, define operator conflict handling, then design the actual product with the user-selected design-taste-frontend skill. Event management, real tickets, dashboards, auth, cloud sync and deployment remain outside this session.
