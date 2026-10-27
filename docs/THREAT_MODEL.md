# Phase 1 threat model

## Scope and assets

Only synthetic events/tickets. Assets are operation integrity, event separation, local persistence, understandable attendance/conflict evidence and camera privacy. QR data, imported scanner IDs, input files, browser storage and clocks are untrusted. No backend, trusted device directory or authentication service exists.

| Threat                                       | Implemented handling                                                                        | Residual limitation                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Accidental QR/text corruption                | Strict schema and SHA-256; entire batch rejected before writes                              | Hash is unkeyed and forgeable                                                                                          |
| Forged scanner/records                       | UI explicitly says author unverified; synthetic membership restriction                      | Anyone who knows the format can forge any synthetic admission and recompute checksum; no authenticity or authorization |
| Replay/overlapping batches                   | Operation-ID deduplication in transaction                                                   | No delivery acknowledgment; incomplete transfer can leave peers divergent                                              |
| Same ticket admitted at disconnected gates   | Preserve all distinct operations, derive visible conflict and unique-ticket total           | Cannot prevent simultaneous admissions or identify the rightful physical attendee                                      |
| Same operation ID reused with different data | Reject entire batch; no overwrite                                                           | No forensic quarantine for invalid collision payload; existing records remain safe                                     |
| Wrong event data                             | Explicit event ID, repository filtering, strict mismatch rejection                          | Browser profiles/DB names are testing isolation, not access control                                                    |
| Malformed/oversized payload                  | UTF-8 900-byte bound before parse, max five entries, strict fields and UUID/time validation | Aggregate log is not bounded; repeated distinct forged operations can fill storage                                     |
| Large or non-image upload                    | Local image MIME/10 MiB bound and visible errors                                            | Browser image-decoder risks and huge decoded image dimensions are not comprehensively mitigated                        |
| Clock skew or manipulation                   | Clock never establishes identity or resolves conflicts                                      | Displayed time is an untrusted claim; no ticket time validity policy                                                   |
| Concurrent same-browser writes               | Read/check/add within Dexie read/write transaction                                          | Independent databases/devices cannot coordinate                                                                        |
| Storage eviction/device loss/reset           | Persistent IndexedDB, scoped reset confirmation, error propagation, reload/restart tests    | No backup, persistent-storage grant, encryption or guaranteed durability; user/browser may delete everything           |
| Camera misuse                                | User starts scanner, permission mediated by browser; tracks stopped on lifecycle cleanup    | Permission/OS behavior must be tested on real devices; no camera video is uploaded                                     |
| Hostile QR text/XSS                          | No HTML rendering of payload text; React escapes values; schema rejects extra fields        | Same-origin compromised script or hostile extension can alter the DB; not a hardened production origin                 |
| Dependency/supply-chain risk                 | Lockfile, local bundles, dependency attribution; no runtime CDNs                            | Install-time dependencies and service-worker updates still require trusted distribution; no security audit is claimed  |
| Origin/certificate misuse                    | HTTPS/localhost requirement, no committed keys; optional local TLS paths                    | No tested mobile TLS provisioning or production security headers; changing origin creates another storage partition    |

## Required production decisions

Authorized scanner enrollment, device public-key trust, per-event signing policy, secure key storage, revocation while offline, ticket authenticity, replay policy across event boundaries, conflict adjudication, data retention/privacy, authenticated backups and storage recovery remain unresolved. Encryption is absent. There is no claim of cryptographically verified authorship.

## Evidence and limits

Automated tests cover schema, hash, identity collision, replay, event mismatch, transaction behavior, convergence and browser offline caching. They are not a penetration test. Physical device acceptance is documented separately in README.md and must not be marked passed from image fixtures or mocked camera results.
