# Phase 2B end-to-end and physical-device acceptance

Phase 1 physical reconciliation is owner-confirmed. **No Phase 2B physical camera/device acceptance has been performed by Codex.** Browser/image tests are distinct evidence.

## Local setup and automated gate

Node 22.12+ (validated here with Node 24.20.0), npm, no backend:

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop
npm ci
PLAYWRIGHT_BROWSERS_PATH=.cache/ms-playwright npx playwright install chromium webkit
npm run check
```

`check` performs strict TypeScript, zero-warning ESLint, Prettier, unit/integration tests, production build and Chromium/WebKit browser tests. Browser tests use that production build. After source edits, do not run browser tests against an old `dist`.

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

Desktop URLs: `http://127.0.0.1:4173/?scanner=organizer`, `/scan?scanner=gate-a`, `/scan?scanner=gate-b`. These profile names isolate databases for tests; they are not authorization or separate physical devices. Same-profile tabs share data. Let app resources cache, then normally reload before disconnecting. Close old app tabs/windows for waiting updates; **never clear site data to update**.

## Prepare event and enroll two scanners

1. Organizer: create a fictional test event and add at least seven test attendees. CSV headers are `name,email`; use unique example.com addresses. Issue all tickets; download digital tickets and a scanner package in **Scanner devices**. Save the independently obtained full organizer fingerprint.
2. Both scanners: import the package at **Event check-in**, confirm that full fingerprint and open the event. A valid ticket must currently fail with **Scanner is not authorized**. Preparation is not permission.
3. On A: expand **Scanner authorization and policy**, set an entrance alias such as North gate, and **Create enrollment request**. Note its full fingerprint and cryptographic scanner UUID. Show its QR to the organizer.
4. Organizer **Scanner devices → Scanner authorization**: scan the enrollment request. Compare the full scanner fingerprint directly with A's screen, enter it and choose **Authorize requested scanner**. Show the resulting authorization QR to A.
5. A: scan that response using the authorization panel. Expect **Authorized for this event**. The response must fail on another scanner whose key/UUID differs.
6. Repeat for B with a different alias/identity. Organizer keys never travel; scanner private keys remain on A/B. An organizer who will also check tickets must deliberately choose **Authorize this device** for its own separate scanner identity.
7. Confirm both scanners have the same current policy epoch and issued-ticket catalog. Later issuance/revocation requires updated packages/policies. A grant itself does not require reissuing every package; portable organizer-signed author credentials accompany sync snapshots.

For desktop-only optical testing, **Save security QR image** and import it through **Read security QR or JSON file**. Exact payload fallback uses the same verifier but is not optical/hardware proof.

## Genuinely disconnected phone procedure

A phone accessing an HTTP LAN IP does not inherit the computer's localhost secure-origin exception. Use an already trusted HTTPS static origin, or an explicitly configured local TLS test. No deployment was performed. The existing TLS setup is supported by Vite preview:

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

These are manual instructions requiring an already installed mkcert and deliberate test-device CA trust, not actions performed in this phase. Choose the actual network adapter if different. Follow [mkcert mobile trust instructions](https://github.com/FiloSottile/mkcert#mobile-devices); transfer only the public `.certs/ca/rootCA.pem`, never its private CA key or TLS private key. Complete trust without certificate warnings and remove temporary CA trust after testing. Keep all certificates/keys out of Git.

1. On two real phones, load the same trusted production origin/port, cache and normally reload, then complete event provisioning and enrollment above. Keep the same browser/install partition. Record device, OS, browser and build versions.
2. Enable airplane mode and explicitly disable cellular, Wi-Fi and Bluetooth on both. Keep them disabled for the rest of optical testing. Stop the preview server if useful. Normally reload: both apps must still load with their keys/event data.
3. Present one actual signed ticket QR to A's camera. Expect one trusted admission. Re-scan: local duplicate, unchanged metrics. Present it to B while disconnected: independent admission is expected. Reject a wrong-event ticket and a modified-signature QR without adding admissions.
4. Admit five more distinct tickets on A. This forces multiple automatic data batches. No manual operation selection should be required.
5. Open **Sync & conflicts** on both. On B choose **Start receiving**; A scans B's receiver-request QR. A shows a signed offer, then numbered data codes using **Next sync code**. B must scan the offer before its data codes. Keep each code still until a successful read; the camera stops after each code for review.
6. B scans only one middle data code, then closes/reopens its browser/app while still offline. No partial admissions should enter trusted totals. In **Resume saved exchange**, select the incoming exchange. Progress must retain the received index. Choose **Request missing batches** and show that QR to A.
7. A scans B's missing request. Its resend queue must contain only the listed missing indices (up to 32 per request). Send those codes. If more than 32 remain, repeat the request after those arrive. B may receive frames out of order or repeatedly without replacing evidence.
8. After all frames arrive, B verifies complete operation identities/content, all author credentials and signatures, then atomically merges. Inspect transferred/imported/skipped/rejected counters. B shows a **Completion acknowledgment** QR; A scans it. Without this return code, A must continue to show incomplete delivery.
9. B originally had an extra concurrent admission, so a one-way receipt should say logs differ. Reverse roles: A starts a new receive request; B sends its full merged snapshot and A returns the acknowledgment. Expect identical trusted operation IDs/root, attendance and the duplicate-admission conflict. The verified acknowledgment should report matching operation identities and integrity. Repeat or resume transfer: no duplicate operations. Do not infer convergence from counts alone.
10. Close/reopen both apps offline. Verify identities, admissions, conflict and saved exchanges persist. Admit a new ticket: old matching status must no longer imply current agreement. Perform a new exchange if current convergence is needed.

## Negative, migration and recovery checks

- Modify one operation tuple, frame signature or offered root without a valid signature: reject. Even a correctly signed sender frame cannot make a forged author operation trusted. No partial snapshot admissions should persist after final validation failure.
- Try another event's request/ticket/credential, a credential for another local scanner, an unsupported protocol version and a payload above 900 UTF-8 bytes: clear failure, no truncation or trusted-log mutation.
- Organizer: revoke A in **Scanner devices → Revocation and recovery**. Before A receives the policy, observe/document that it still acts on stale authority. Deliver the signed policy QR/JSON or updated package. A now rejects admissions. Its previously stored operations remain evidence but leave trusted totals. Deliver the same update to B before comparing totals. An older or forged policy must fail.
- Revoke an issued ticket ID and distribute the update. Updated scanners reject it. Old offline packages do not gain instant knowledge.
- Retain a Phase 2A profile: unsigned historical records must survive and be labeled/excluded, not auto-signed. Issue/export v2 provisioning and explicitly enroll before new trusted admissions. Legacy-known tickets still block accidental local re-admission and require investigation. Test `/dev/workbench?scanner=lab` separately: synthetic unsigned v1 behavior remains operational.
- Treat lost organizer storage as lost authority. No private-key export/recovery feature exists. Review [RECOVERY_PHASE_2B.md](RECOVERY_PHASE_2B.md) before using real events.

Record only observed results: full operation IDs/roots, policy epochs, per-frame progress, counters, explicit acknowledgment, radio state, restart behavior, camera distance/lighting/latency and failures. Uploaded images, pasted payloads and headless browsers must never be reported as physical camera transfer proof.
