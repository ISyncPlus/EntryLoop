# Phase 2B delivery report

Work is confined to `/Users/InhouseHQ/Desktop/EntryLoop/`. The existing interface is retained. No deployment, push, backend, cloud sync, payment feature or Stage 4 redesign was performed. No dependency was added. The pure reconciliation engine remains byte-for-byte unchanged: SHA-256 `db7489cba82d6c25b0d6a1f46986645d2cfa884ce821d7a2a6b1c3d5209bb86a`.

## 1. Implemented functionality

- Independent scanner-local cryptographic identities and non-exportable private keys, separate from legacy profile UUIDs.
- Explicit, event-scoped organizer enrollment through scanner proof-of-possession requests, independent full-fingerprint comparison and portable organizer-signed credentials. An event package alone does not authorize admissions.
- Signed canonical admission evidence, verified before trusted import, with transactional local duplicate checks and existing conflict semantics.
- Signed monotonic scanner/ticket revocation policies, public package v2, safe update/rollback/collision checks and retained legacy/revoked evidence outside trusted totals.
- Automatic bounded full-snapshot QR batches; receiver-bound requests/offers; per-frame signatures; durable unordered staging; progress/missing-index requests; restart recovery; signed completion acknowledgments and content/context-root agreement.
- Existing event, attendee, ticket/export, PWA/offline and development-workbench functionality preserved, with updated security/integration/browser tests and documentation.

## 2. Cryptographic authorization design

Use native ECDSA P-256 / SHA-256. Each scanner gets a new UUID and private CryptoKey generated non-exportable on that profile/device. Organizer event keys retain their existing non-exportable behavior. Private keys never enter tickets, packages, credentials, QR transfers or exported policy files.

A scanner signs an event-specific enrollment request with its public key, alias and random nonce. This proves key possession, not staff identity. The organizer compares the complete fingerprint directly with the intended scanner and explicitly signs a credential binding event, scanner UUID, public key, alias and grant-policy epoch. A scanner accepts the response only if it matches its local key/UUID and the pinned organizer signature. The organizer may deliberately authorize its own separate scanner identity.

The root-signed policy records permanent revoked scanner/ticket IDs and a monotonic epoch. Credential epochs cannot exceed the locally known policy; active older grants remain valid. Same-epoch conflicts, rollback and revocation removal fail atomically. Two equally stale devices cannot know a policy update neither received.

## 3. Admission-signature protocol

Retain the existing immutable `CheckInRecord`. Add an `operationProofs` sidecar containing version, event/operation IDs, authorization epoch, credential-content SHA-256 and signature. Sign `ENTRYLOOP:ADMISSION:1` plus newline plus canonical `{record,proofWithoutSignature}`. This binds every existing record field, including scanner/ticket/operation/event identity, to the authorized scanner key.

Ticket verification, root credential verification, policy/catalog checks and operation verification occur outside IndexedDB write transactions. Commits recheck policy/catalog and local duplicates/identity collisions atomically. Distinct concurrent admissions remain preserved conflicts. Timestamps are metadata only. Repeated signatures over equivalent content deduplicate; changed proof or record content under an existing operation UUID rejects without overwrite.

`security/authority.ts` handles keys/enrollment/policy; `security/operations.ts` handles signed admissions, trust projection, collision-safe merge and content roots; `security/models.ts` defines strict schemas/canonicalization. Native signing helpers remain in `tickets/signatures.ts`. Cryptography does not enter the pure reconciliation engine.

## 4. QR synchronization protocol

`security/exchange.ts` implements version 2 `{p:"ELS",v:2,k,...,z}` messages. Receiver signs a persistent request. Sender verifies its authority/context, snapshots the complete trusted log, and automatically creates a signed offer plus required author-credential and operation frames. Each data QR carries one credential or at most two signed admissions. No manual operation selection or animated multi-frame timing is used in the real-event flow.

Limits: **900 UTF-8 bytes per QR**, H error correction/four-module quiet zone, **10,000 operations per snapshot**, **1,000 credentials**, **6,000 frames**, **32 missing indices per signed missing request**. These are bounded implementation ceilings, not phone-throughput measurements. Over-capacity payloads fail explicitly without truncation.

Frames are indexed, sender-signed and persisted as staging. Data may arrive in any order after the offer. Repeats are safe; divergent content at a known frame index fails. Missing indices are exact, and state survives browser restart. The complete manifest, unique operation identities/content root, author credentials and all admission signatures must verify before atomic merge. Import counters and admission commit share a transaction; a subsequent acknowledgment-signing interruption preserves the receipt for recovery.

The intended receiver signs an acknowledgment bound to the request/session/context and offered root, including its resulting full trusted root. A one-way receipt does not prove equal logs if the receiver had extra records; reverse exchange is required. Agreement compares canonical operation identities/content and authorization/catalog context, never counts alone. Subsequent admissions/policy updates invalidate a current-match claim; the receipt remains historical. No network, Bluetooth or WebRTC is used for this exchange.

Full formats and state machine: [PROTOCOL_PHASE_2B.md](PROTOCOL_PHASE_2B.md).

## 5. Security guarantees and remaining limitations

Within the stated trusted-origin/device assumptions, real-event trusted imports require a valid event-scoped root credential, active locally known authorization, prepared ticket membership and a valid scanner signature over immutable canonical content. Modified/forged/unauthorized/wrong-event evidence is rejected. Operation/frame/credential collisions cannot silently replace prior evidence.

Signatures do not prove physical attendance, honest staff behavior, presenter identity or trusted time. An authorized or compromised scanner can sign false claims. Non-exportable keys do not defeat same-origin malicious code, extensions or OS compromise. Fingerprint comparison can still be done incorrectly. Sync is authenticated, not encrypted; opaque IDs/times/device aliases can be correlated. Roster data is not encrypted at rest, and no account/PIN access control or independent cryptographic audit is claimed.

Offline revocation is delayed until policies arrive. Revocation conservatively excludes **all** related historical admissions because client times cannot establish a safe pre-theft cutoff. Evidence remains stored. Large snapshots/manual scanning, cumulative session storage, browser eviction, real phone optics/install partitions and permission ergonomics remain operational risks. The existing scanner bundle warning remains visible.

## 6. Migration and compatibility decisions

Dexie schema v3 adds `scannerKeys`, `credentials`, `policies`, `operationProofs`, `syncSessions`. Existing database names, keys, roster, tickets, legacy UUIDs and operations survive. No migration signs, deletes or relabels old records. New cryptographic identities are distinct from old profile UUIDs.

Ticket token v1 is unchanged. Event-package v1 remains parseable/importable as legacy preparation but cannot authorize trusted admission or downgrade a policy-enabled event. Export/import v2 provisioning and explicitly enroll. Old unsigned real-event records remain visible as historical evidence and excluded from trusted totals/secure exchange. Matching incoming signed content cannot implicitly promote an unsigned old UUID. Known historical local admissions still block accidental re-admission and require investigation.

Unsigned operation protocol v1 remains isolated to the synthetic `/dev/workbench`; new unsigned real-event imports fail visibly. Old application builds must be retired operationally—an offline app cannot force an unreachable old device to update.

## 7. Recovery and revocation policies

Lost scanner: revoke its full identity, distribute the signed policy/package to all remaining devices, preserve evidence and enroll a replacement with a new identity. No immediate offline wipe or revocation is claimed. Outdated devices must receive the latest package/policy before their next shift; different contexts block sync.

Ticket cancellation uses permanent signed ticket-ID revocation, with the same offline propagation limit. Stored affected admissions remain evidence but leave trusted totals. There is no automatic cancellation/reissue UX or trusted timestamp cutoff.

Lost organizer storage/private key: no backup/recovery/rotation feature exists. Preserve surviving scanner evidence; recover the original device/storage if possible, otherwise deliberately create a new event/key and reprovision/reissue under operational supervision. Scanner packages cannot restore organizer authority. Private-key export was not weakened to create an insecure backup.

Browser clearing/eviction may lose keys/logs/session state. Keep a regular browser and stable trusted origin/partition, avoid clearing data, verify offline restart before the event, and replicate complete evidence with returned acknowledgments. This improves availability but does not guarantee durability or back up organizer authority. See [RECOVERY_PHASE_2B.md](RECOVERY_PHASE_2B.md).

## 8. Test results

`npm run check` passed against the final implementation with Node 24.20.0 / npm 11.19.0:

| Gate                                  | Result                                                            |
| ------------------------------------- | ----------------------------------------------------------------- |
| Strict TypeScript                     | Passed                                                            |
| ESLint, zero warnings permitted       | Passed                                                            |
| Prettier                              | Passed                                                            |
| Unit/integration                      | **93 passed across 11 files**                                     |
| Production build/PWA                  | Passed; 12 precache entries, about 1,170.73 KiB                   |
| Chromium/WebKit browser suite         | **24 passed**, 12 scenarios in both engines                       |
| Interrupted-transfer repeat run       | **6 passed**, 3 executions per engine after the file-lifetime fix |
| Engine preservation / diff whitespace | SHA-256 unchanged; `git diff --check` passed                      |

All previous regression scenarios remain, with real-event tests now explicitly enrolling scanners and using signed sync instead of an insecure unsigned bypass. New tests cover unauthorized/forged/modified/wrong-event evidence; multiple authorized authors; valid concurrent conflicts; operation/proof/frame identity collisions; repeat imports; legacy package/storage compatibility; revocation/stale policies; exact missing-index pagination beyond 32; manifest/content-root agreement; intended-receiver acknowledgments; scanner keys and staged frames across a real browser-process restart; and a failure after atomic log commit but before acknowledgment signing.

Browser tests use native crypto, real IndexedDB, actual QR pixels/ZXing, downloaded ticket files and production resources with networking disabled. They reject valid tickets before enrollment. The interrupted test restarts the receiving browser, recovers missing frames, verifies the acknowledgment and signs another admission using its persisted scanner key. No success callback is mocked as camera proof.

Early failures and fixes are retained in DEVELOPMENT_LOG.md. A Chromium persistent-context provisioning stall prompted retaining file inputs until asynchronous processing completes; the uninstrumented repeat run and final suite then passed. The exact browser-internal cause was not independently isolated. The existing large-bundle warning remains: about 1,029.89 kB minified / 293.69 kB gzip. No warning was suppressed.

No physical mobile camera/install test, maximum-scale throughput test, OS eviction test or independent security audit ran. These are explicit remaining acceptance work, not passing tests.

## 9. Physical-device testing instructions

[TESTING_PHASE_2B.md](TESTING_PHASE_2B.md) contains exact setup commands, manual trusted-local-TLS instructions and the full two-phone procedure. The required sequence is: production caching → package/fingerprint provisioning → distinct scanner enrollment → disable cellular/Wi-Fi/Bluetooth → real signed-ticket camera admission/duplicate/invalid cases → receiver-request/offer/multi-batch camera exchange → deliberate interruption/restart/missing recovery → returned signed acknowledgment → reverse exchange/content-root/conflict agreement → signed revocation update/stale-policy negatives.

Record actual device/OS/browser/build, radio states, operation identities, policy epochs, counters, roots, acknowledgment, lighting/distance/latency and reload/restart results. The owner-confirmed Phase 1 result is historical evidence only. **No Phase 2B physical camera, phone installation, adverse-lighting or throughput acceptance was performed here.** Uploaded QR images and browser tests must not be represented as physical transfer proof.

## 10. Remaining work for Stage 4

UI/UX redesign remains explicitly deferred. With later authorization, improve nontechnical fingerprint comparison/enrollment guidance, scan/next-code ergonomics, multi-batch handoff and resume/acknowledgment clarity, conflict investigation and revocation-impact feedback, accessible focus/status/readability and light/dark presentation. Preserve actual metrics, signatures, warnings and offline semantics.

Separate unresolved engineering work—secure organizer recovery/rotation, protected access/encryption, retention/session cleanup, larger-event optical throughput and independent security review—needs explicit future scope. It must not be hidden by visual polish. No Stage 4, cloud synchronization, payment or unrelated feature work was started.
