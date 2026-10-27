# Phase 2B cryptographic and optical protocols

This is an implementation specification, not an independent security audit. Native WebCrypto ECDSA P-256 / SHA-256 produces 64-byte raw `r || s` signatures, encoded as 86 unpadded base64url characters. Private keys are generated non-exportable. Public JWKs contain exactly `kty:EC`, `crv:P-256`, `x`, `y`.

## Canonical messages

`canonical()` recursively sorts object keys with locale-independent comparisons, retains array order and serializes JSON primitives without whitespace. Input schemas admit only explicit bounded fields, finite safe integers and canonical UTC millisecond timestamps. No float or optional/undefined field appears in signed protocol objects. Root-generated revocation arrays and catalogs are sorted. Incoming signed content is preserved rather than normalized into a different signed message.

Domains include an ASCII prefix and a single newline, then canonical content:

| Object                | Signed message                                                         |
| --------------------- | ---------------------------------------------------------------------- |
| Scanner enrollment v1 | `ENTRYLOOP:ENROLL:1\n` + request without `s`                           |
| Scanner credential v1 | `ENTRYLOOP:CREDENTIAL:1\n` + credential without `s`                    |
| Revocation policy v1  | `ENTRYLOOP:POLICY:1\n` + policy without `signature`                    |
| Admission v1          | `ENTRYLOOP:ADMISSION:1\n` + `{record,proof}` without proof `signature` |
| Optical protocol v2   | `ENTRYLOOP:SYNC:2\n` + message without `z`                             |
| Event package v2      | `ENTRYLOOP:EVENT:2\n` + package without `signature`                    |

Ticket v1 and legacy event-package v1 canonicalization remain unchanged; see README and `tickets/signatures.ts`. `unsigned()` removes only top-level `s`/`signature`; sync uses its own `z` omission because `s` there is the session UUID. Nested policy/credential signatures remain signed as part of their enclosing transport content.

Enrollment: `{kind:"entryloop-enroll",v:1,e,d,l,k,q,s}`. `e` event UUID; `d` scanner UUID; `l` entrance/device alias (1–24 characters); `k` scanner public JWK; `q` fresh request UUID; `s` scanner proof of possession. Organizer authority is **not** established by this request. Compare the full SHA-256 public-key fingerprint on the intended scanner before approving. Use entrance aliases, not attendee names or staff personal data.

Credential: `{v:1,e,d,l,k,at,s}`. `at` is the organizer's policy epoch at authorization; `s` is the organizer signature. A credential belongs to one event and one immutable scanner identity/key. A revoked identity cannot be reauthorized; replacement enrollment generates a new identity in a fresh profile/device. Returning a credential to a scanner requires its ID and public key to match local private-key identity. No private key travels in any object.

Policy: `{v:1,eventId,epoch,revokedScanners,revokedTickets,signature}`. Positive safe-integer epochs increase monotonically. Revocations are permanent, additive and duplicate-free. Lower epochs or different content at the same epoch fail without writes. A valid signature under the pinned organizer key is required. Maxima: 1,000 revoked scanner IDs and 5,000 revoked ticket IDs. Reaching these limits errors; nothing is dropped.

Admission: existing immutable `record = {operationId,eventId,ticketId,scannerId,recordedAt}` plus separate `proof = {v:1,eventId,operationId,authorizationEpoch,credentialHash,signature}`. The scanner signs the canonical combination. `credentialHash` is SHA-256 over canonical credential content excluding its organizer signature. Validate root credential, event/scanner/operation correspondence, prepared issued membership, active scanner/ticket, grant epoch ≤ operation epoch ≤ current policy, then scanner signature. Client time is descriptive and never proves authorization or precedence.

Same operation UUID with changed record or proof content rejects the whole import, retaining existing evidence. Equivalent signed content with different valid ECDSA signature bytes is an idempotent repeat; the first signature remains stored. Unsigned historical records are not eligible for implicit promotion even if an incoming signed record has identical core fields.

## Optical v2 message shapes

Every message has `{p:"ELS",v:2,k,...,z}`. `z` is a scanner signature over the entire message except `z`. Every serialized frame is measured as UTF-8 before output and before parsing. **Hard limit: 900 bytes.** Generated QRs use H error correction, four-module quiet zones and integer module sizing. There is no timed animation, compression, Bluetooth, WebRTC or network transport.

| `k`                       | Additional fields | Sender/signing key                                                 |
| ------------------------- | ----------------- | ------------------------------------------------------------------ |
| `request`                 | `q,c,d`           | Receiver, using its own authorized scanner key                     |
| `offer`                   | `q,s,c,h,n,f,d`   | Snapshot sender                                                    |
| `data`, `t:"credentials"` | `s,i,t,d`         | Snapshot sender, containing one organizer-signed author credential |
| `data`, `t:"operations"`  | `s,i,t,o`         | Snapshot sender, containing one or two signed operation tuples     |
| `missing`                 | `s,c,m,total`     | The originally requested receiver                                  |
| `ack`                     | `s,q,c,h,g,n`     | The originally requested receiver                                  |

`q`: durable receiver-request nonce UUID. `s`: sender-session UUID. `d`: credential. `c`: trust-context SHA-256. `h`: source snapshot root. `g`: receiver's resulting full trusted root. `n`: source operation count, max 10,000. `f`: exact data-frame count, max 6,000. `i`: zero-based frame index. `m`: up to 32 unique missing indices; `total` gives the actual number still missing. Repeat missing requests after listed frames arrive if more remain.

Operation tuple: `[operationId,ticketId,scannerId,epochMilliseconds,authorizationEpoch,credentialHash,signature]`. Event ID comes from the verified event/session and is reconstructed into the signed record. A wrong-event signature therefore fails. Timestamp reconstruction uses the same canonical UTC representation as the original engine.

The offer includes the sender credential. Other operation authors' credentials get automatic dedicated frames, followed by two operations per data frame. At most 1,000 credentials are accepted with a snapshot. Export does not silently select a subset of a larger log. Capacity failures request a smaller future protocol/version rather than truncating evidence.

## Content roots and trust context

Sort operations by operation UUID using `<`/`>`. For each, compute canonical `{record,proofWithoutSignature}` as a string. Snapshot root is SHA-256 of the canonical array of those strings. It includes every operation identity/content field and credential hash; it excludes randomized ECDSA signature bytes. Each actual signature is independently verified. Equal record counts alone say nothing about root equality.

Trust context is SHA-256 over canonical `{organizer:<pinned fingerprint>,policy:<current signed policy content excluding signature>,tickets:<sorted issued IDs>}`. Metadata descriptions are not security authority. A changed policy or ticket catalog prevents exchange until both devices receive compatible current provisioning. Two equally stale devices cannot discover a newer policy that neither has received.

## State machine and recovery

1. Receiver explicitly starts a durable request and displays its QR.
2. Sender verifies the receiver's credential/request/current context, snapshots its current trusted log and automatically prepares signed offer/data frames. Repeated requests resume that same snapshot. Start a new request for newer admissions.
3. Receiver verifies the offer's author and requires its stored request nonce/own identity. It then accepts signed indexed frames in any order. Data before an offer fails clearly. A repeated frame is safe; a changed body at an existing index fails and retains previous bytes.
4. Frames are durable **staging**, not trusted operations. Progress shows received/required frames and exact missing indices. Restart, select **Resume saved exchange**, and request/rescan the missing frames.
5. Once all indices exist, recheck frame signatures, unique operation count, complete content root, all author credentials and every admission signature. Merge records/proofs/credentials atomically. A failure accepts no operations from that snapshot. Existing successful snapshots remain untouched.
6. Admission commit and receiving counters share a transaction. If interrupted after commit but before acknowledgment signing, resume/re-scan the offer or any frame. Verification/merge repeats safely, preserving the original import counters, then produces the acknowledgment.
7. The receiver signs the offered root and its resulting full root. Return that QR to the sender. The sender verifies the intended receiver key, session/request, context, source root and source count. Unrelated authorized scanners cannot acknowledge this receiver's request.
8. A one-way receipt proves the intended receiver signed receipt of the complete offered content, subject to trust in its application/device. Matching offered/result/current roots and context establish agreement at that acknowledgment. Extra receiver operations require a reverse exchange. Later admissions, policy/catalog changes or altered local state invalidate current-match feedback. A receipt is never proof of permanent global convergence.

Messages are authenticated, not encrypted. An authorized malicious scanner can lie about physical attendance or its receipt behavior. Large snapshots require many camera reads; limits are implementation ceilings, not measured phone throughput. Physical optics and interruption usability require the acceptance procedure in TESTING_PHASE_2B.md.
