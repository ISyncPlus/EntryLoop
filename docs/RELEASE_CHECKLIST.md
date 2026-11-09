# Release checklist · Stage 5A

This checklist distinguishes local candidate readiness from permission to deploy and public-release acceptance. Current build provenance and executed checks are in STAGE_5A_REPORT.md.

## Local candidate

- [x] Final strict TypeScript, zero-warning ESLint and formatting check recorded.
- [x] All unit/integration tests, full Chromium/WebKit suite and production build recorded; no removed regressions, skipped failures or mocked hardware claims.
- [x] Actual browser storage restart/migration/concurrency/fault/update tests retain event, ticket, organizer/scanner keys, approvals and operations.
- [x] Real QR downloads/screenshots/resizing and offline first decoder use pass.
- [x] Website works offline, reduced-motion/mobile controls work, and links retain workspace/context. Storage errors never create a fallback workspace.
- [x] Local safe staging snapshot has build/revision/dirty status, SHA-256 manifest and byte-identical rebuilt output. Config includes components.json and aliases.
- [x] Secret/symlink/credential exclusions verified. No real attendee/browser storage or key material copied.

## Separate staging · approval still required

- [ ] Owner explicitly approves separate Vercel project/team/project ID and stable HTTPS hostname.
- [ ] Authenticate/link only in the reviewed snapshot; verify approved project ID before any upload. Never relink or deploy the production checkout.
- [ ] Live build identity matches snapshot; SPA refresh/404, MIME, manifest, SW, camera secure context and deployment protection checked on each device.
- [ ] Preserve stable origin and explicit bookmarks across updates; no database reset needed or performed.
- [ ] Execute STAGING_ACCEPTANCE.md and fill DEVICE_TEST_LOG.md with MacBook/Pixel 8/iPhone evidence.

## Public release blockers · not waived by local tests

- [ ] **FAILED:** original persistence incident resolved/accountably explained with evidence. No claim of restoration from absent data or automatic-test success.
- [ ] Physical offline acceptance, actual camera scan reliability, browser/PWA partitions and compatible updates observed.
- [ ] Novice organizer/staff handoff and accessible real-device/screen-reader workflows reviewed.
- [ ] Independent trust/crypto/deployment review and operational lost-key/revocation/records-retention/privacy guidance accepted.
- [ ] Dev/build dependency advisories triaged; licensing/third-party/AI/hackathon submission rules reviewed by owner.
- [ ] Owner explicitly authorizes production deployment/push/submission if desired later. Stage 5A grants none of these permissions.
