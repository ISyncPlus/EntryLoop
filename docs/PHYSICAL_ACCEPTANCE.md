# Reproducible physical acceptance · Stage 3

**Status: physical test NOT RUN. Incident gate: FAILED/unexplained.** Automated browser evidence is separate. Use only fictional data and a separately approved, stable staging origin. Never clear the original MacBook/phone data to prepare this test. Deadline: November 20, 2026.

## People, devices and fixture

Fictional organizer: Maya Ibrahim. Event: **Harbor Makers Rehearsal — fictional**, November 19, 2026, Fictional Hall, Lagos. One organizer computer; North and South entrance phones (ideally Android Chrome and iPhone Safari). The operator is a test persona, not an account feature.

| Guest         | Email                    | Planned admission                 |
| ------------- | ------------------------ | --------------------------------- |
| Amina Bello   | amina.stage3@example.com | North                             |
| Ben Okoro     | ben.stage3@example.com   | North                             |
| Chika Eze     | chika.stage3@example.com | North                             |
| Dara Cole     | dara.stage3@example.com  | North **and independently South** |
| Elena Martins | elena.stage3@example.com | South                             |
| Femi Adeyemi  | femi.stage3@example.com  | South                             |
| Gita Shah     | gita.stage3@example.com  | Unused control ticket             |

CSV: `tests/fixtures/stage3-attendees.csv`. Ticket/event/device/operation IDs are generated on the actual organizer/devices. Do not reuse an automated test's signing identity or expect static signed tokens to match a newly created event.

## Preflight and evidence

1. Preserve original incident contexts and exports. Record OS/browser/device, ordinary browser versus installed app, exact origin/port/profile, build fingerprint/revision/dirty flag, free storage, camera permissions and policy/catalog revision. Save only safe diagnostics; never expand/export a private CryptoKey. Record event ID and organizer fingerprint independently.
2. Obtain approval for the separate staging project/origin using STAGING_DEPLOYMENT.md. Verify direct `/events/new`, `/scan` and event URLs load/refesh. Confirm `/build-info.json` matches the visible diagnostic build. Generated per-deployment URLs are not interchangeable storage origins.
3. Use explicit new test workspace URLs: `?scanner=stage3-organizer`, `?scanner=gate-north`, `?scanner=gate-south` on their respective devices. They are namespaces, not authorization. Record any browser/PWA partition difference. Keep adequate disk space and do not clear site data for updates.

## Setup and disconnection

4. On organizer, create the event. Add Amina manually. Import the entire CSV: preview must show six new rows and one duplicate; after import exactly seven guests remain. Search for Gita, issue all seven signed tickets, view/download individual SVGs or the seven-ticket HTML sheet. Keep guest-to-ticket mapping on organizer only.
5. Download one signed scanner package after issuance. Import on each phone and compare the organizer fingerprint through the organizer's own screen. Confirm seven prepared opaque ticket IDs; attendee names/emails and private keys must be absent from the package.
6. Wait for cached app resources; normally reload every app. Switch off cellular, Wi-Fi and Bluetooth on **all three** devices (computer network too). Confirm ordinary offline reload. Any initial file transfer must already be complete; subsequent enrollment/authorization is optical. Camera/WebCrypto/PWA require trusted HTTPS (or localhost on that device).
7. North/South create independent enrollment requests with those entrance names. Organizer scans each phone directly, compares the complete scanner fingerprint on that intended phone and explicitly authorizes. Return the signed authorization QR to the same phone. Require “Authorized for this event.” A prepared package alone must not allow admission. QR/file alternatives must not bypass signature/key matching.

## Admissions and failure controls

8. North admits Amina, Ben, Chika and Dara: **4 unique tickets / 4 operations**. South independently admits Dara, Elena and Femi: **3 / 3**. Gita remains unused. Rescan Amina at North: local duplicate rejection, still four operations. Disconnected devices are allowed to admit Dara independently; this is the deliberate conflict.
9. Facilitator-only negative checks may use the current payload fallback: copy a valid token and change its **first signature character** (not padding bits in the last character), then reject it without writing an operation. Change event ID to a different valid UUID and reject wrong-event input. Preserve originals. These technical controls are acceptance tooling, not the proposed Stage 4 user flow. No private key modification/export.

## Interrupt and converge

10. South starts receiving. North scans its request and shows the offer. South scans offer then only North's first two-operation data batch. South must show **1/2 frames, 1 missing** and still retain only its original three trusted operations. Close/reopen South while offline, open the same event/profile, select the saved exchange and request missing batches.
11. North scans the missing request and shows the requested second batch. South imports it: source transferred/imported four, no partial evidence promoted before completion. Repeat that batch; receipt/import counters remain repeat-safe. South now has **7 operations / 6 unique tickets / 1 conflicted ticket** (Dara). Return its signed acknowledgment to North; North must report that logs differ, since South had three extra operations.
12. Reverse South → North using a fresh request. It may include author-credential frames before operation batches. Scan every offered index, then return North's acknowledgment to South. Both must now hold the same seven operation identities/content, six unique tickets and one conflict. Confirm source/result roots/context match through the signed completion feedback and safe session evidence; counts alone are insufficient. A stale old receipt must not be treated as the new request.

## Organizer review and persistence

13. Organizer opens **Attendance & sync**. Local totals remain zero until records arrive. Starting receive before its own authorization must fail without silently creating a key. For organizer-local reporting, explicitly authorize the organizer's separate scanner identity under Scanner devices, then return to Attendance & sync and receive South's complete snapshot/return acknowledgment.

There are **two admitting entrance devices**. This optional organizer receipt adds a **third authorized cryptographic identity on the computer**, using the existing protocol. It grants admission authority too; there is no observer-only role. No organizer admissions are made. Do not describe three credentials as two or pretend that copied public data restores organizer authority.

14. Organizer now reports seven issued tickets, six unique admissions, seven operations and one conflict. Attendee/issued-token records stay seven. Close all apps/browsers normally, reopen the exact same staging origin/profile offline and compare event ID, local key identities, tickets, operation IDs and receipt roots. No fixture reset. Restarting a browser process is not the same as deliberately clearing storage.
15. On an authorized compatible build update only, save drafts, let the waiting worker install, close all old windows and reopen the same origin/profile. Confirm new build and unchanged records/keys, then decode a ticket/QR offline on first use. Do not force-update by deleting data.

## Pass/fail record

Record each step, actual counts/roots/IDs, cache/build, elapsed scan times (ten attempts per representative code), conditions, screenshots/download hashes, interruption point and errors. Compare M/Q/H optics on both phones and the MacBook front camera under normal/dim light and practical distances. Original downloads, OS screenshots and messaging recompression are different samples. The original failed screenshot was not supplied; do not claim it reproduced.

Stop on missing records, changed identities, failed signatures, misleading completion or stale/unknown policy. Save diagnostics and failure evidence before any replacement event. Camera failure is a failure; never inject a mocked result. A successful new scenario does not explain the original incident: its gate remains FAILED until supported evidence resolves/accountably explains it.

Automated counterpart: `tests/stage3.spec.ts`, actual native browser storage/crypto/QR pixels, three persistent contexts. First-use offline decoder/build/diagnostic checks: `tests/stage3-readiness.spec.ts`. These do not certify physical Android/iOS permission, optics or installed-app behavior.
