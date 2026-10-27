# Historical Phase 1 setup and physical acceptance procedure

The project owner has since confirmed physical QR exchange with matching records and the expected conflict. This file preserves the original engineering procedure. The synthetic workbench is now at `/dev/workbench`; the main route is the Phase 2A product. Current instructions are in README.md and TESTING_PHASE_2A.md.

# EntryLoop · Phase 1

EntryLoop is an offline-first event check-in and reconciliation experiment. Independent scanners store immutable admissions in IndexedDB, exchange real QR batches, and derive the same unique-ticket attendance and conflicts after receiving the same operations. No application backend is required.

**Status:** Phase 1 implementation. QR batching and camera scanning are experimental. Physical camera-to-camera exchange and mobile installation must still be validated on actual devices. This is a synthetic engineering workbench, not a production admission system. Disconnected scanners cannot prevent simultaneous duplicate admissions.

## Local setup

Use Node 22.12+ (validated locally with Node 24.20.0) and npm. All commands run in this directory:

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/dev/workbench?scanner=a` and `http://127.0.0.1:5173/dev/workbench?scanner=b`. Each profile has a separate Dexie database and random scanner UUID. Two tabs with the **same** profile intentionally share a database. These test profiles are not physical devices or an offline transfer proof. Profiles are restricted to 1–32 letters, digits, underscores and hyphens; omission selects `main`.

## Validate the production build

```sh
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium webkit
npm run test:e2e
```

After browser installation, `npm run check` runs all gates. Unit/integration tests use fake-indexeddb for storage and real domain/codec logic. Browser tests use actual IndexedDB and ZXing image decoding against a production preview, with network disabled after caching. They include a real browser-process restart using a persistent browser profile. They do not use a physical camera or prove performance on a phone. Screenshots and failure traces are in ignored `test-results/`.

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

Open `http://127.0.0.1:4173/dev/workbench`, wait for caching and reload normally. The status text should say the service worker controls the page. Use browser offline mode and reload normally again. Do not use a hard refresh, which can bypass the cache. The service worker is generated only for production, precaches local assets and has no transfer network endpoint. Browser storage may still be evicted. Installation behavior is browser-dependent; use the browser's Install or Add to Home Screen action when offered.

## Workbench

1. Choose one synthetic event; both devices must use the same event ID.
2. Note the scanner UUID and database namespace.
3. Select a synthetic ticket, then **Admit ticket**. Repeating a known ticket is rejected locally.
4. In the operation ledger, select 1–5 operations explicitly.
5. Choose **Generate QR transfer**. The image is a snapshot; regenerate after changing the selection. It may contain imported operations as well as local ones.
6. On the receiving device, choose **Scan with camera** and point its rear camera at the sending screen. The scanner stops after the first decoded QR and then validates/imports locally. Stop the camera explicitly to cancel.
7. **Read QR image** is a local-file fallback, not a camera test. **Manual payload fallback** exercises the same validator and storage path. Neither should be presented as a physical camera proof.
8. Inspect transferred/imported/skipped/rejected counts. Entire batches commit or fail. Malformed payloads cannot supply a trustworthy record count; the UI says so instead of inventing one. Known-schema rejections show all decoded entries rejected. The sender reports encoded records, not confirmed delivery: there is no acknowledgment protocol.
9. Exchange every selected batch in both directions until both logs contain the same operation IDs. Totals alone do not prove log equality. Reimports are safe.
10. Reset only through **Reset selected event… → Confirm reset selected event**. This deletes that event's operations in the active profile, retaining scanner identity and other events.

Attendance means distinct admitted ticket IDs in the local operation set, not independently verified people. Multiple admissions for a ticket count once in attendance and remain visible as a conflict with all operation IDs. Imported scanner IDs are claims from unsigned data.

## QR protocol and capacity

Compact UTF-8 JSON v1:

```json
{
  "v": 1,
  "e": "launchpad-lab",
  "r": [["operation-uuid", "TEST-001", "scanner-uuid", 1793095200000]],
  "h": "64-lowercase-hex-sha256"
}
```

The example uses placeholders and is not an importable payload. `r` tuples are `[operationId, ticketId, scannerId, recordedAtEpochMilliseconds]`. The event occurs once per envelope. Hash exactly the compact `JSON.stringify({v,e,r})` with keys in that order, then add `h`. Decode validates schema, size, checksum, event, operation contents and the built-in ticket set before any write. Canonical domain timestamps are UTC ISO strings with exactly milliseconds; no time establishes identity, admission priority or authenticity.

Hard limits: **1–5 record entries and 900 UTF-8 bytes**, QR error correction **H**, quiet zone **4 modules**, generated raster **8 pixels per module**, displayed at an integer number of pixels per module up to 360px where space permits. Both limits apply; no truncation and no animated multi-frame protocol. The QR library selects the required QR version. These are experimental application limits, not a guarantee for every camera, screen, distance or lighting condition. Batches over five must be selected and exchanged manually. There is no automatic knowledge of what the peer lacks.

**SHA-256 detects accidental corruption. Anyone can forge records and recompute the hash. It does not authenticate a scanner, authorize an admission or encrypt data.**

## Two genuinely offline physical devices: acceptance test

### Provision a trusted HTTPS origin first

Camera APIs, service workers and WebCrypto require a secure context. `localhost` is allowed on the computer running the server, but `http://<laptop-LAN-IP>:4173` is not equivalent on a phone. Both phones need a trusted HTTPS origin. Initial caching may use a network; exchange must not.

Use a pre-existing trusted HTTPS static test origin only if already authorized, or provision trusted **local** HTTPS. This project has not been deployed. For the local approach on this Mac, use an already installed `mkcert` (installation/system trust changes are manual, not performed by this project):

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
mkdir -p .certs
# Keep even the development CA inside this project folder.
export CAROOT="$PWD/.certs/ca"
mkcert -install
# Replace en0 if your active network adapter differs.
ENTRYLOOP_LAN_IP=$(ipconfig getifaddr en0)
mkcert -cert-file .certs/entryloop.pem -key-file .certs/entryloop-key.pem localhost 127.0.0.1 "$ENTRYLOOP_LAN_IP"
npm run build
ENTRYLOOP_TLS_CERT=.certs/entryloop.pem ENTRYLOOP_TLS_KEY=.certs/entryloop-key.pem npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
```

Trust only your own development CA on the test devices following [mkcert's mobile instructions](https://github.com/FiloSottile/mkcert#mobile-devices). Transfer only `.certs/ca/rootCA.pem`; **never share `rootCA-key.pem` or the HTTPS private key**. On iOS, install the certificate profile and enable full trust. Android steps differ by OS/browser; confirm the page loads without certificate errors and camera permission is available. Do not bypass certificate errors and call the secure-origin setup verified. Remove the temporary CA trust from test devices when finished. `.certs/`, PEM and key files are ignored by Git. The optional Vite TLS configuration reads these paths only when both environment variables are supplied. This is a local static preview server, not a core application backend.

### Run and record the test

1. While initially connected to the local network, open `https://<LAN-IP>:4173/?scanner=a` on device A and `https://<LAN-IP>:4173/?scanner=b` on device B. Use a regular browser profile, not private browsing. Install/Add to Home Screen if supported. Keep the same origin, port and browser/install context throughout; changing them may create another storage partition.
2. Wait for caching; reload normally and confirm service-worker control on each device. Confirm the two scanner UUIDs differ. Select **LaunchPad · Synthetic lab** on both. Reset this event in each profile to start clean. Confirm zero operations.
3. Enable airplane mode on both devices. Explicitly disable Wi-Fi and Bluetooth; ensure cellular data is off. Stop the laptop preview server if desired. Leave these radios off for all subsequent steps. Reload normally on both devices to prove the cached shell loads. If it fails, stop: the offline requirement has not been met.
4. On A, admit `TEST-001` and `TEST-002`. On B, admit `TEST-001` and `TEST-003`. Each local log should contain 2 operations and 2 unique tickets. The duplicate across devices is expected because they were disconnected.
5. On A, select both operations in the ledger and generate a QR. On B, start **Scan with camera**, grant permission if requested, and scan A's screen. B must report **transferred 2, imported 2, skipped 0, rejected 0**. B now has **4 operations, 3 unique tickets, 1 conflicting ticket** (`TEST-001`, with both operations preserved).
6. On B, select all 4 stored operations and generate a QR. On A, scan it. A must report **transferred 4, imported 2, skipped 2, rejected 0**. A now has the same **4 operations, 3 unique tickets, 1 conflict**.
7. Compare the full operation IDs and scanner IDs in both ledgers, not just counts. Scan the same QR again on A: **transferred 4, imported 0, skipped 4, rejected 0**; totals must remain unchanged.
8. Close and reopen the installed app or browser, remaining offline. Verify scanner UUIDs, operations and conflicts survive. A normal reload should also preserve them. Actual OS eviction policies remain outside the app's control.
9. Change B to **Community · Synthetic lab**. Confirm its log is empty and a LaunchPad batch is rejected as an event mismatch without writes. Change back and confirm its LaunchPad log remains intact.
10. Record OS/browser versions, devices, date, build lockfile/commit, generated payload sizes, QR batch sizes, radios off, observed counters, matching operation IDs, offline reload/restart results, scanning latency and any failure. Repeat a five-record batch at realistic screen brightness/distance. Do not mark physical transfer proven until this procedure succeeds.

## Architecture and files

| Boundary         | Files                                                                   | Responsibility                                                                                               |
| ---------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Domain           | `src/features/check-in/domain/models.ts`, `reconcile.ts`, `fixtures.ts` | Readonly models, validation, deterministic union, local duplicate rejection, conflicts and synthetic tickets |
| Persistence      | `src/features/check-in/persistence/database.ts`                         | Namespaced Dexie DB, scanner UUID, atomic admission/import, scoped reset                                     |
| QR transport     | `src/features/sync/codec.ts`, `rejection.ts`                            | Versioned tuples, bounded parsing, SHA-256 integrity and explicit rejection counts                           |
| Optical adapters | `src/features/sync/CameraScanner.tsx`, `TransferPanel.tsx`              | ZXing camera/image reading, QR rendering and import feedback                                                 |
| Presentation     | `src/features/workbench/Workbench.tsx`, `OperationsLedger.tsx`          | Live IndexedDB view, real derived metrics, controls and immutable evidence                                   |
| PWA/build        | `vite.config.ts`, `public/`                                             | Tailwind v4, React build, manifest, precache, local icons, optional local TLS                                |
| Verification     | `src/**/*.test.ts(x)`, `tests/offline.spec.ts`                          | Algebra, boundaries, transactions, workflows, QR decoding and production offline reload/restart              |

See [architecture](docs/ARCHITECTURE.md), [decisions](docs/DECISIONS.md), [threat model](docs/THREAT_MODEL.md), [development evidence](docs/DEVELOPMENT_LOG.md), [roadmap](docs/ROADMAP.md) and [third-party/AI attribution](THIRD_PARTY_NOTICES.md).

## Limits and next phase

No authorization, signatures, encryption, trusted timestamps, revocation, production tickets, backend, cloud sync, recovery backup or automatic batch completion protocol. Browser storage can be cleared/evicted. Aggregate logs can grow without a production quota; only each individual transfer is bounded. QR density and physical camera behavior remain experimental. Vite reports a large scanner-containing JavaScript bundle; cache warm-up must finish before disconnecting.

Phase 2 is proposed only: complete the physical acceptance test, resolve authenticity/device trust, measure QR reliability and capacity, design safe recovery and conflict review, then design the actual product with the user-selected `design-taste-frontend` skill. Full product work requires explicit authorization.
