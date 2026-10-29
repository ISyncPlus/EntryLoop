# Persistence recovery and data-safety plan

**Incident reliability gate: FAILED pending explanation of the missing original records.** The hardening patch does not recover absent data or organizer authority. It is local and has not been deployed.

## Preserve evidence first

1. Keep the original Mac browser/profile, phones, installed-app contexts, event packages and issued ticket files. Do not clear site data, uninstall a PWA, reset IndexedDB, delete databases, replace identities or create another event as a recovery shortcut.
2. Record the exact scheme/host/port, URL/scanner parameter, browser profile, ordinary/private window and installed-app versus browser context. The application cannot see other profiles/origins/partitions.
3. Save read-only database counts, event IDs and signing-key **IDs only**. Never expand/export/log private CryptoKey values or attempt to make keys extractable. A public diagnostic is not a full backup.
4. Save recoverable records before any future restoration/migration. The new local **Download recoverable records (no keys)** feature includes event information, attendees, retained issued tokens, catalog, operations/proofs, credentials and policies. It excludes organizer/scanner key tables and private JWK fields. It contains PII and usable tickets: store it securely, do not publish it or attach it to public issues.
5. Current audit validation encountered physical disk exhaustion. Keep adequate free space before more browser tests. Do not use browser/site-data clearing to free it. Only regenerable project npm downloads were removed during this audit; installed dependencies, test evidence and production/user databases were preserved.

## What can and cannot be recovered

| Item                                          | Available source                                                                   | Limit                                                                                                                                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Event ID/metadata/public key/catalog/policy   | Trusted signed scanner JSON, public scanner database, recoverable-records export   | A public package cannot restore organizer role/private authority or a guest roster. Confirm the original fingerprint independently.                                 |
| Attendee names/emails and assigned ticket IDs | Original organizer storage, a deliberate records export or original roster         | Scanners deliberately do not contain PII. Reimporting an original CSV allocates new IDs unless a reviewed recovery process restores original validated assignments. |
| Already-issued signed ticket tokens           | Retained issuedTickets, digital ticket files/print sheets, records export          | Existing signatures can be verified, not regenerated without the original key. Tokens identify tickets, not attendees' physical identity.                           |
| Admission records and proofs                  | Other authorized scanners and records exports                                      | Reconcile only under current valid event/credential/policy rules. Never turn unsigned historical rows into trusted records or resolve conflicts by clock.           |
| Scanner credentials/public identity           | Organizer/scanner records or signed enrollment response                            | A credential grants nothing without the corresponding scanner private key. Re-enrollment creates a new identity deliberately; it is not restoration of the old one. |
| Organizer/scanner private signing identity    | Surviving original non-exportable CryptoKey usable by its original browser context | No key export, secure key backup, portable restoration or rotation workflow is implemented. Public keys/signatures/fingerprints cannot reconstruct private keys.    |
| Partially received sync                       | Durable local sessions/remaining sender snapshot                                   | Lost source-only records cannot be reconstructed from a root/count. Finish actual verification and return acknowledgments.                                          |

The new JSON export is **not** a trusted automatic restore package. It has no overarching organizer signature and does not confer signing authority. No importer was added: a future import must validate schema, event/key relationships, ticket/admission signatures, current credentials/policy, duplicates and all existing evidence transactionally. Importing public metadata must never silently promote scanner/backup data to organizer authority.

## Conditional recovery decisions

- **Event found in another existing workspace, same origin/browser:** open its exact explicit URL. Do not copy/rename databases or keys. Compare event ID/fingerprint and verify original signing capability locally. The hardened workspace finder is read-only and never migrates other namespaces.
- **Data found in another browser/PWA/profile/origin:** continue using that original context first; export recoverable information deliberately. Keys are not made portable. Do not assume browser and PWA storage are shared; compare diagnostics on each.
- **Metadata absent but a matching original key and child records survive:** preserve a records backup and diagnostic first. Obtain original signed public event metadata/catalog, prove locally that the surviving private key verifies against that exact public key using a separate storage-check message, and design a reviewed metadata-only restoration. Keep key identity and every operation immutable. This conditional procedure is a recommendation, **not implemented or performed automatically**.
- **Organizer key absent/unusable:** no honest reconstruction is possible from a scanner package, ticket signature or fingerprint. Preserve remaining evidence. If the intact original browser storage can be recovered, verify it before use; OS/profile restoration may be platform-bound and is not guaranteed. Otherwise stop new issuance/enrollment/revocation under that authority. Deliberately create a replacement event/key, reprovision scanners and reissue tickets with new event identity. Old tickets/operations do not become valid for the replacement by relabeling IDs.
- **Unknown schema, open failure, blocked migration or key mismatch:** stop writes. Keep the database unchanged and use a compatible build/read-only diagnostics. Never delete/recreate it to dismiss an error. Close other windows only after saving drafts; do not force activation of an incompatible update.

## Migration implications of this patch

No database rename or schema-version bump. Historical Dexie 1/2/3 declarations remain identical (native IndexedDB 10/20/30). Previously supported additive upgrades still add the same tables, preserving rows/keys/identities. Read-only preflight now rejects an unknown version, missing/extra store or changed index before Dexie's automatic schema repair can run. This intentionally requires review of previously patched/unknown schemas instead of silently changing them.

Bootstrap changes only profile selection/URL clarity: explicit valid scanner parameter wins; a bare launch reopens the sole existing namespace explicitly, or asks when there are multiple/none. It does not copy main into organizer, choose by role, rewrite old keys or infer absence in another partition. Product startup no longer creates a legacy device identity; explicit synthetic workbench behavior remains separate.

## Exact MacBook and two-phone verification

Keep real incident storage untouched until its inventory/backup is captured. Use a separate **clearly named synthetic workspace** on each device for new destructive/failure tests. Do not use site-data clearing as a test step on the original context.

### MacBook preflight

1. Free adequate ordinary disk space without clearing Chrome data; record available space. Keep the original browser/profile open. Save original package/ticket files and current origin/profile/context/build, DB names/native versions, table counts, event IDs and key IDs. Record unknowns honestly.
2. On the current deployed app, normal fresh deep links still return 404 without a controlling SW; the prepared rewrite is not yet deployed. Do not confuse 404/cache/profile errors with deletion. Record them, then stop production acceptance until an authorized compatible deployment.
3. For local validation, use Node 22.12+:

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium webkit
npm run check
npm run preview -- --port 4173 --strictPort
```

If disk/memory constrained, run `npm run test:e2e -- --workers=1 --output=.cache/reliability-manual-test-results` after building. This affects isolated test artifacts, not production storage. Do not report an ENOSPC-aborted run as passed.

4. Open `http://127.0.0.1:4173/?scanner=reliability-organizer`, record the exact URL/database/build, create a synthetic event, add three example.com attendees, issue three tickets and download the scanner package plus key-free records backup. Verify event ID and organizer fingerprint; keep private keys inside the browser.
5. Navigate through organizer, check-in, event details, tickets and the development-workbench home link. The scanner parameter and event/key IDs must remain unchanged. Reload each route. Close/reopen Chrome normally and revisit the exact URL. Confirm all three attendee/ticket records and signing capability; repeated issuance must retain original tokens.
6. Open another tab with the same URL/profile. Read the same rows; save competing edits from loaded revisions and confirm one stale save fails without overwriting the winner. Open a deliberately different profile and a different browser/private context: they must be labeled separately, not claim global absence. Return to the original URL and verify the event still exists.
7. Open the manifest root URL: one existing namespace becomes explicit; multiple namespaces require a choice. Select the original workspace. Do not interpret an installed app in a different partition as sharing all browser data automatically.

### Pixel 8 plus second phone

1. Use the same trusted HTTPS origin/port for each device. Local host `127.0.0.1` is not the Mac when typed on a phone. For a manual local TLS test use the existing [trusted-HTTPS instructions](TESTING_PHASE_2B.md); no new deployment, CA installation or camera permission was performed by this audit.
2. Provision the synthetic package on each phone under an explicit workspace name; record origin, browser/PWA context, DB/build/native version and event fingerprint. Enroll distinct cryptographic identities by the existing explicit organizer flow. A profile name/package alone must not authorize admissions.
3. Return to the MacBook using the recorded organizer URL after authorizing each phone. After every handoff, verify the same event, three attendees, three issued tokens, key association and scanner credentials. If anything is absent or a context changes, stop and save diagnostics before creating replacements.
4. Normally reload all three devices, close/reopen their browsers/installed apps and compare identities/data. Then disable cellular, Wi-Fi and Bluetooth on the phones, normally reload from cache, scan actual ticket pixels and reject a local duplicate, wrong event and invalid signature.
5. Admit the same ticket independently on both phones and exchange complete signed snapshots with acknowledgments both ways. Verify actual IDs/content roots/conflicts, not matching counts alone. Interrupt/resume one transfer, restart the receiving device and request missing frames. Confirm no partial unverified admission enters totals.
6. After an **authorized** compatible app update, save drafts, observe the waiting-update notice, close all old EntryLoop windows, then reopen the same explicit URLs. Confirm the new build and unchanged event/key/scanner IDs, attendees, ticket payloads, proofs and credentials. Reload offline and perform another valid signed admission. Unknown schema/key failures must display recovery guidance, never an empty first-event screen.
7. On a disposable test workspace only, exercise fault/migration tests through the automated suite. Do not delete an original event/key on the Mac or phones to simulate loss. Verify both light/dark authorization panels are readable and record real camera/screenshot failures separately.

Record device/OS/browser/profile/install context, origin, explicit namespace, build, available disk, permission results, SW control/waiting state, exact event/key IDs, counts, signatures remaining usable, radio state and steps performed. An application cannot prove eviction, another profile's existence or physical camera success from an empty table or a passing headless test.

**Release gate stays FAILED until the original incident is explained with evidence and the original data/authority are accounted for, followed by review of remaining physical/deployment acceptance.**
