# Staging acceptance · MacBook, Pixel 8, iPhone

Prepared November 9, 2026. **NOT RUN on hardware. No deployment authorized or performed.** The original incident gate remains FAILED. Use only fictional data in a separately approved stable HTTPS staging project; leave production storage intact.

## Establish the context

1. Follow STAGING_DEPLOYMENT.md after separate approval. Record permanent staging origin, deployment ID, `/build-info.json`, source/snapshot manifest, OS/browser versions and browser-versus-installed-app context in DEVICE_TEST_LOG.md. Do not change hostname during the rehearsal or treat a different browser/PWA partition as the same database. Localhost on a phone means that phone.
2. Use exact bookmarks: MacBook `STAGING_ORIGIN/?scanner=stage5-organizer`; Pixel 8 `STAGING_ORIGIN/scan?scanner=gate-north`; iPhone `STAGING_ORIGIN/scan?scanner=gate-south`. Profiles are separate storage namespaces, not permissions. Verify create/scan/event deep links survive refresh and unknown routes show Page not found.
3. Fictional organizer Maya creates **Harbor Makers Rehearsal**, November 19, 2026, **Fictional Hall, Lagos**. Add Amina manually using the first row of `tests/fixtures/stage3-attendees.csv`; preview/import that full CSV and expect six new rows plus one duplicate, then exactly seven guests: Amina, Ben, Chika, Dara, Elena, Femi, Gita. Issue all seven tickets and download the real individual tickets/print sheet. Keep guest-to-ticket mapping organizer-local.
4. Download the signed latest event package; transfer it before disconnecting. Each phone imports, independently compares the full organizer fingerprint on the MacBook, and confirms seven opaque ticket IDs. No attendee names/emails or private keys belong in the package. Before approval, a valid ticket must not be admitted.
5. Wait for app caching on each device and test a normal reload. Disable cellular, Wi-Fi and Bluetooth on all three devices, including Mac networking. Reload again normally while offline. Record secure-context camera permission grant/denial; do not replace failed hardware scans with injected callbacks.
6. North and South create their own named enrollment requests. MacBook scans each request, compares every fingerprint character on the intended phone, explicitly authorizes that event/device, then returns the signed approval QR to that same phone. Require Authorized for this event. Record both distinct scanner identities and policy epoch. A prepared file or chosen role is not authorization.

## Admit and reject

7. North admits Amina, Ben, Chika and Dara: **4 tickets /4 operations**. South admits Dara, Elena and Femi: **3 /3**. Gita stays unused. Local rescan of Amina at North must reject with counts unchanged. Dara’s concurrent admission at two disconnected entrances is intentional; do not choose a clock-based winner.
8. Facilitator-only negative controls: use the advanced raw JSON ticket payload, change its **first signature character**, then attempt admission; reject without saving. Change only its event UUID to a different valid UUID; reject wrong-event input. Use a separate fictional event’s signed ticket for an additional wrong-event check if desired. Never alter/export private keys or overwrite original tickets.

## Interrupt, recover and converge

9. South starts receiving. North scans South’s request; South scans North’s offer and first two-operation batch only. Expect **1/2 batches, one missing**. South still has its original **3 trusted operations**; staged partial admissions must not inflate totals.
10. Close/reopen South normally while offline, same bookmark/context. Select Resume saved exchange and show the missing-batch request. North reads it and displays the requested second batch; South completes verification/atomic import. Repeat the batch and confirm no extra admission. South now has **7 immutable operations /6 unique admitted tickets /1 conflicting ticket (Dara)**.
11. Return South’s signed acknowledgment to North. North must report different logs because South had three additional operations. Do not treat equal counts or an old receipt as completion.
12. Reverse South → North with a new receiving request. Transfer the offer and every credential/operation batch, then return North’s signed acknowledgment to South. Both must show the same operation identities, signed content roots and authorization/catalog context; record exact public roots/session IDs privately. Expected 7 /6 /1 on both.
13. Optional organizer reporting uses a **third** separately authorized cryptographic identity on the computer under Scanner devices → Authorize this device. This grants admission authority too, not a read-only observer role. Make no organizer admissions. Receive South’s complete snapshot in Attendance & sync and return the acknowledgment. Organizer then shows seven issued tickets and 7 /6 /1; prior local attendance stays zero until records actually arrive.

## Persistence, update and optics

14. Normally close/reopen browsers/apps offline on all devices. Compare event ID, local key identities, seven issued tickets on organizer, operations and receipt roots. Record browser/PWA contexts separately. Do not clear site data, reinstall as a repair or replace event/key identities.
15. Only after an approved compatible second staging build: keep the same stable origin and profile, save work, wait for the update notice, close all old tabs/app windows, reopen and verify new build metadata and unchanged records/keys. Test first decoder use offline after the update. Do not force a worker with data-clearing instructions.
16. Per representative enrollment/ticket/data/ack QR, record ten camera attempts on Pixel, iPhone and MacBook under normal and dim lighting at practical distances. Record payload bytes/version/modules/correction/rendered size, success count/latency and original download versus screenshot/resampling source. Compare original downloaded QR to OS screenshots. Browser pixel decoding is supporting evidence only.

Stop on missing records, changed identities, unexpected trust, invalid signatures, false completion or failed optics. Preserve key-free diagnostics and failure images. Fill DEVICE_TEST_LOG.md from observation; do not mark any row passed in advance. A new rehearsal passing cannot explain the original disappearance. Detailed protocol/revocation checks remain in PHYSICAL_ACCEPTANCE.md and TESTING_PHASE_2B.md.
