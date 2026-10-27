# Phase 2A end-to-end testing

Historical Phase 2A record. For current authorization, signed synchronization and testing, use [PHASE_2B_REPORT.md](PHASE_2B_REPORT.md) and [TESTING_PHASE_2B.md](TESTING_PHASE_2B.md). The unsigned real-event workflow below is superseded.

## Automated gate

From this project with Node 22.12+:

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium webkit
npm run check
```

The gate builds fresh production assets before browser tests. `npm run test:e2e` alone uses the existing build; run `npm run build` first after source changes. To reproduce the extended real-event run:

```sh
npm run test:e2e -- tests/events.spec.ts --repeat-each 3
```

Tests use native WebCrypto/IndexedDB, real QR images and actual downloaded ticket SVGs, with isolated contexts and network disabled after production caching. Browser tests do not mock a camera and claim physical proof. Failed traces/screenshots and retained downloads are in ignored `test-results/`. Dedicated optical fixtures preserve the Phase 1 detector bug and a full-ticket SVG that exposed the new decoder edge case.

## Desktop test with independent local profiles

Start production preview:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

1. Open `http://127.0.0.1:4173/?scanner=organizer`. Wait for resource caching and reload normally. Keep this browser profile; clearing storage destroys organizer keys. Each profile name gets a separate DB; profiles are not an authorization feature.
2. Create an event, for example **Signal Assembly**, date **2026-11-12**, location **The Assembly, Lagos**, description **A local test event**. The URL contains the stable event UUID; record it.
3. In **Guest list → Import from CSV**, upload a UTF-8 file:

```csv
name,email
Amina Bello,amina@example.com
Noah Martins,noah@example.com
Duplicate Amina,AMINA@example.com
```

These are fictional test records only. Expect 2 valid new attendees, 1 duplicate and 0 errors. Click **Import validated attendees**; the actual attendee count becomes 2. Add another attendee manually, then use search to confirm filtering by name/email/ticket ID. An invalid email or missing name must block CSV import; no partial rows should be written. 4. Choose **Issue all unissued tickets** (or issue one row individually). Ticket count must match the actual issued attendees. Repeating issuance does not create replacement IDs/tokens. 5. Open **Tickets**, select an attendee and **Download digital ticket**. Save the SVG. **Download ticket sheet** exports a standalone printable HTML file containing the issued tickets and names; open it offline to check layout and QR readability. The SVG/HTML include personal display names; the QR text contains only event/ticket IDs and a signature. No private key is present. 6. In **Scanner devices**, choose **Download scanner package**. Save its JSON and obtain the entire 64-character organizer fingerprint from the displayed organizer key. The JSON must not contain attendee names/emails or any private-key field. 7. Open `http://127.0.0.1:4173/scan?scanner=gate-a` in another tab/profile. Let the production app cache and reload normally. Import the JSON. The included signature is checked before the trust form appears. Enter the organizer fingerprint obtained in step 6 independently of the imported file; choose **Trust key and prepare device**. It opens the real event's scanner. 8. In developer tools set that scanner's network offline. Reload normally, not with a cache-bypassing hard refresh. The scanner should still open and show its prepared ticket count. 9. Open **Use an image or payload instead** and upload the saved ticket SVG. Expect **Admitted**, valid signature for the pinned key, 1 stored operation and 1 unique ticket. This proves image decoding + signature verification + persistence, not physical camera capture. 10. Upload the same ticket again. Expect **Not admitted**, locally known duplicate, and unchanged totals. Verify reloading retains the operation. Invalid signatures and wrong-event tokens must also leave totals unchanged; the automated test creates these negative cases from real issued tokens. 11. Prepare `?scanner=gate-b` with the same JSON. Go offline and admit the same ticket independently. This is expected: disconnected devices cannot know the other admission. 12. In gate A's **Sync & conflicts**, select its operation, generate a QR, and save the QR image. Gate B imports that image with **Read QR image** (or scans A's display with a real camera in the physical test). B now has 2 operations, 1 unique ticket and 1 conflict. 13. On B, select both operations, generate its QR and import it into A. Expect transferred 2 / imported 1 / skipped 1 / rejected 0. Both logs must now contain the same operation IDs and conflict. Reimport: imported 0 / skipped 2; totals stay unchanged. 14. Return to organizer **Event details**. Name/date/location are disabled after issuance/provisioning. Description can change and save. Test another-tab concurrent editing: a draft based on an old revision must fail until explicitly reloaded. Export an updated package after metadata/new issuance changes. 15. Add/issue another attendee. An old prepared scanner must reject the new ticket as absent from its snapshot until an updated package is imported. Reimporting an older package after the update must fail as stale; existing operations remain intact. 16. Inspect `http://127.0.0.1:4173/dev/workbench?scanner=lab`. The synthetic Phase 1 controls and their QR exchange remain available separately.

## Two real phones, genuinely offline

Phase 1 hardware reconciliation is owner-confirmed. This procedure validates the **new** signed-ticket/provisioning flow and has not been performed by Codex in this session.

### Trusted local HTTPS

The host computer's localhost exception does not apply to a phone connecting to an HTTP LAN IP. Camera, WebCrypto and service-worker APIs need a secure origin. Use an already-authorized trusted HTTPS static origin, or manually provision local TLS. No public deployment is part of this delivery.

For local testing with an already-installed `mkcert` on the Mac:

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
mkdir -p .certs
export CAROOT="$PWD/.certs/ca"
mkcert -install
ENTRYLOOP_LAN_IP=$(ipconfig getifaddr en0)
mkcert -cert-file .certs/entryloop.pem -key-file .certs/entryloop-key.pem localhost 127.0.0.1 "$ENTRYLOOP_LAN_IP"
npm run build
ENTRYLOOP_TLS_CERT=.certs/entryloop.pem ENTRYLOOP_TLS_KEY=.certs/entryloop-key.pem npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
```

Choose the correct network adapter if it is not `en0`. Trust only your own development CA on test devices following [mkcert's mobile instructions](https://github.com/FiloSottile/mkcert#mobile-devices). Transfer only `.certs/ca/rootCA.pem`; never share `rootCA-key.pem` or the TLS private key. Complete the device's certificate-trust process and verify no certificate warning. Do not treat bypassing a warning as a verified secure-origin setup. Remove temporary development CA trust after testing. Certificates/keys are ignored by Git.

### Physical acceptance

1. On the organizer computer, create the event, import fictional attendees and issue tickets. Download the SVGs and public scanner JSON. Record event UUID/fingerprint and which ticket you will present.
2. While provisioning connectivity is available, open `https://<LAN-IP>:4173/scan?scanner=gate-a` on phone A and the corresponding `gate-b` URL on phone B. Use regular browser profiles; install/Add to Home Screen if supported. Keep the same origin, port and browser/install partition.
3. Wait for caching, normally reload, import the package into both devices and independently confirm the organizer fingerprint. Check different scanner UUIDs. No private key or guest roster should have been transferred.
4. Enable airplane mode on both phones. Explicitly disable cellular data, Wi-Fi and Bluetooth. Keep them disabled. Stop the preview server if helpful. Normally reload both devices; stop if either cannot open from cache.
5. Display an issued signed ticket on the organizer's screen or printout. Use **Scan with camera** on phone A and scan its actual pixels. Confirm a real stored admission and correct event. Re-scan on A: duplicate rejected, totals unchanged.
6. Scan the same valid ticket on B, still disconnected. A and B should each have an independent operation. Present another event's ticket and an altered-signature QR; each must be rejected without adding admissions.
7. Use **Sync & conflicts** to exchange actual QR operation batches between the phone screens/cameras in both directions. Expect 2 distinct admissions for the copied ticket, attendance 1 and conflict count 1; full operation IDs must match across devices. Reimporting must be idempotent.
8. Close/reopen both browsers/apps while offline and confirm key pin, event catalog, identities and logs remain. Check dark/light readability, permission errors, camera cancellation and the next-scan action. Physical throughput/continuous scanning is not claimed.
9. Record device/OS/browser versions, build/lockfile identity, radio state, ticket/package sizes, observed counters, matching operation IDs, camera latency, lighting/distance, normal reload and restart results. Mark only the cases actually observed as passed.

Do not substitute uploaded files, pasted strings or mocked scanner results for steps 5–7 when reporting physical acceptance.
