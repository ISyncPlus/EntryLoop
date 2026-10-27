# Roadmap

## Phase 1 · This session only

Implemented: project foundation, typed immutable operations, pure reconciliation, Dexie transactions, synthetic fixtures, bounded versioned QR codec, camera and local-image adapters, responsive workbench, generated PWA, engineering documents and automated test suite. See DEVELOPMENT_LOG.md for actual executed results.

**Acceptance gate remains open:** run the README physical-device procedure with Wi-Fi, Bluetooth and cellular disabled. Record same operation IDs, totals/conflicts, persistence and real camera transfer. Automated browser success alone cannot close this gate.

## Phase 2 · Proposed, not authorized

1. Complete and document real camera/mobile install tests. Measure five-record density, distance, lighting, scanner latency and cold offline restart behavior across phone/browser combinations.
2. Resolve authorized-device provisioning, cryptographic signatures, key storage, revocation and event trust before any real admission deployment.
3. Define operator handling of conflict evidence, rejected attempts, corruption, data loss, missing batches and recovery; define aggregate storage/quota limits.
4. Decide if small manual QR batches suffice. Only measured evidence can justify automatic batch inventory, acknowledgments or multi-frame transport.
5. Apply the user-selected design-taste-frontend skill to the real operator product once full design is authorized. Include accessibility and fast outdoor scanning tests.
6. Verify competition submission terms, AI attribution and third-party license obligations; prepare an honest working demonstration against the four equally weighted judging criteria.

Event management, production ticket issuance, dashboards, authentication, cloud sync, deployment and repository pushes are explicitly outside the present authorization. No Phase 2 implementation has been started.
