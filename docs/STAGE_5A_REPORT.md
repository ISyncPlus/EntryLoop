# Stage 5A release candidate and staging readiness

November 9, 2026. Completed locally inside EntryLoop after the separately requested website revision. **Ready as a reviewable local candidate for separately authorized staging testing. Public-release gate remains BLOCKED: the original organizer disappearance is unexplained and its reliability gate remains FAILED.** No live staging acceptance or physical camera success is claimed.

## Candidate identity

- Build: **b257c337b86f**.
- Source revision: **46c948f8e065301bbd616ec895ed67c2baf25c98**, **dirty=true**. The artifact contains the reviewed uncommitted changes, not just that clean Git revision.
- Snapshot: `.cache/stage3/staging-b257c337b86f-1794243009179/`, under this EntryLoop folder. **128** allowlisted source/config/asset/test files; original provenance retained in build-provenance.json. All source hashes verified.
- Rebuilt snapshot: **21/21 output files byte-identical** to tested dist, including build-info.json, manifest, service worker, fonts, images, CSS and JS. Hashes, startup observations and audit counts are retained in [STAGE_5A_EVIDENCE.json](STAGE_5A_EVIDENCE.json). The source manifest is `.cache/stage3/staging-latest.json` and the snapshot’s staging-manifest.json; retain this frozen directory until the staging decision. A future source change requires a new candidate/gate/snapshot.
- No deployment, project linking, external authentication, push, browser-data clearing or Devpost submission. No production storage was inspected/modified during this task. No private-key export or schema migration.

## Website revision completed before Stage 5A

`/` and `/welcome` now explain EntryLoop’s actual offline workflow in depth: a signed-ticket hero, optical handoff, interactive organizer/staff journey, guest import/issuance proof, preparation/install instructions, honest limits, eight FAQs and an EntryLoop adaptation of the supplied cinematic footer. Forest primary, mint secondary and orange accent retain the existing brand; local IBM Plex Sans and real fictional-data screenshots keep the site self-contained. Staggered reveals, ticket/wordmark parallax, optical pulse, diagonal marquee and magnetic controls have pause/reduced-motion behavior. Operational QR surfaces remain unanimated and unchanged.

The selected design-taste-frontend skill dealt **Dressed as something else**, seed **861326675**, no redraw. Idea: EntryLoop’s ticket and light-only exchange become an event-poster and two-door explanation. The live thing is a working role/step selector with real instructions/screenshots. The footer reference was adapted to strict TS, cleanup, functional routes and normal-flow mobile scrolling; unrelated branding, fake store/legal links and remote Google Fonts were omitted. Explicit user-requested footer effects are documented exceptions to the skill’s flat-style rules. Final page inspection: **0 FAIL /4 WARN** at 1440/768/390; source lint **0 FAIL /1 WARN**. All nine final screenshots reviewed; self-critique **7.3/10**, below 7.5, with product-only imagery and type-size consolidation remaining weaknesses. This is not an external design award or usability study. Full direction/copy/exception/critique record: `.taste-skill/website/NOTES.md`.

The project already supported React 19, TypeScript and Tailwind v4. `components.json` now maps shadcn aliases to `src/components/ui`, with styles at src/styles.css; `@/lib/utils` provides cn. Minimal Slot/cva Button and motion-footer live in that folder. No replacement scaffold was necessary. GSAP and helpers are attributed in THIRD_PARTY_NOTICES.md; screenshot captions identify the fictional rehearsal. No stock photography, footage, real attendee PII or runtime remote assets were added.

## Release audit and confirmed fixes

Reviewed the current router/workspace resolver, ProductApp startup/update lifecycle, schema/health/backup gates, event/attendee/ticket transactions, scanner authority, admission/exchange presentation, QR generation/scanning, recovery disclosures, Stage 4 reports/UX specification, persistence/threat audits and regression procedures. Previous protocol implementations were preserved.

| Confirmed issue                                                                                                                                           | Fix / evidence                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ScannerAuthority treated its own pending/failed credential/policy query like missing approval and rendered enrollment guidance/actions.                   | Explicit loading and shared StorageFailure recovery states; no permission indicator/action while storage is unknown. ScannerAuthority.test.tsx tests both states.                                                                                                       |
| SecureSyncPanel rendered sending/receiving guidance while saved-session state was loading/failed; transient `special` output could outlive a failed read. | Block panel actions/output behind successful session loading; shared recovery UI on error. SecureSyncPanel.test.tsx covers failure; existing pending-QR regression retained.                                                                                            |
| A failed replacement enrollment action could restore the prior outgoing QR once busy cleared.                                                             | Clear outgoing at the start of each replacement action; regression generates a prior output then rejects the replacement and requires no old code.                                                                                                                      |
| EnrollmentGuide interpreted every organizer output as a returned approval, including its own request or a signed revocation policy.                       | Pass request/approval/policy purpose, with distinct instructions and a regression covering all three. No assertion that requesting or showing a policy authorizes a scanner.                                                                                            |
| New website integration could have lost workspace identity or opened fresh data on storage failure.                                                       | Read-only /welcome, original resolver for app entry, successful empty enumeration required for fresh /start, explicit profile/theme links. Native browser tests preserve event/key data, single/multiple contexts and inject enumeration failure without a fallback DB. |
| New page’s FAQ wrapping, footer edge crop and reordered diagram arrow harmed phone readability.                                                           | Short question titles, real image dimensions, fitted wordmark and corrected responsive selector; final browser measurements/screenshots. Removed redundant final CTA.                                                                                                   |
| Safe snapshot did not yet include new shadcn metadata.                                                                                                    | Add components.json to the existing allowlist and its isolated fixture; existing secret/symlink/refusal tests pass.                                                                                                                                                     |

Major files: `src/features/website/{WebsiteEntry,LandingPage,JourneyExplorer,website.css}` own explanatory presentation; `src/components/ui/{button,motion-footer}` and src/lib/utils.ts own the supplied component integration; src/main.tsx selects website versus existing safe workspace startup; ProductApp supplies the context-preserving About link. ScannerAuthority, SecureSyncPanel and EnrollmentGuide contain the bounded audit fixes. New website.spec.ts, ScannerAuthority.test.tsx and additions to existing presentation tests provide regressions. Config/lockfile/notices and five requested release documents are updated. `git diff --check` passed.

The pure engine’s SHA-256 remains `db7489cba82d6c25b0d6a1f46986645d2cfa884ce821d7a2a6b1c3d5209bb86a`. No changes to database names/native v30, historical schemas, key exportability, ticket/admission signatures, ELQ1 dictionary, signed batch protocol or conflict resolution. Existing records require no reset or new migration.

## Storage reliability status

The original missing event was **not reproduced as committed data deletion** and no new event/key deletion/startup reset path was found. Historical namespace confusion is a demonstrated mechanism, not a conclusive explanation: main was later absent and organizer.events empty in the owner’s reported context. No new event-location/key-ID inventory evidence was supplied. We cannot claim restoration or permanent resolution.

Actual browser regressions retain events, attendees, issued tickets, original non-exportable organizer/scanner keys, credentials, signed admissions and sessions through normal navigation/reload, process restart, two real compatible builds/SW activation, historical native 10/20 upgrades, same/different profiles, concurrent tabs and injected read/write/version failures. Incompatible schemas still stop for recovery. No failure becomes first-event guidance. These passes establish the tested disposable scenarios; they do not explain the production incident or guarantee retention against browser/OS eviction/deletion.

Keep the original MacBook origin/profile untouched. Key-free diagnostics/public/roster exports cannot recreate a lost non-exportable signing identity. An absent organizer key may require a new event/authority and ticket reissuance after investigation; no insecure backup/automatic trust-promoting recovery was added.

## Executed validation

| Check                                                            | Final observed result                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run typecheck`                                              | Passed, strict TS.                                                                                                                                                                   |
| `npm run lint`                                                   | Passed, zero warnings.                                                                                                                                                               |
| `npm run format:check`                                           | Passed after formatting; repeated after final release docs.                                                                                                                          |
| `npm test`                                                       | **135/135**, **21 files**; four new presentation regression cases over the 131 baseline.                                                                                             |
| `npx playwright test --workers=2 --reporter=list`                | **80/80**, **40 Chromium +40 WebKit**, no skipped tests/retries; final run **2.4 minutes**. Eight website browser executions added; all prior 72 retained.                           |
| Existing Stage 4 layout gate                                     | All **200** operational screen/theme/viewport states pass again, including 320px and 200%-equivalent viewport; not physical browser-chrome zoom or comprehensive WCAG certification. |
| Production build / staging preparation                           | Passed; 21 precached resources, ~1987.43 KiB. Existing >500kB chunk warning remains visible.                                                                                         |
| Snapshot rebuild/hash comparison                                 | 128 source hashes valid; 21/21 output hashes match.                                                                                                                                  |
| Git whitespace check                                             | Passed.                                                                                                                                                                              |
| Physical MacBook/Pixel/iPhone cameras/install/storage partitions | **NOT RUN**.                                                                                                                                                                         |
| Separate live HTTPS staging/CDN/project protection               | **NOT RUN; approval required**.                                                                                                                                                      |

Security/persistence integration covers forged/modified/wrong-event/duplicate/unauthorized/revoked/stale input, valid concurrent admissions, repeated import, partial transfer/restart/missing recovery, signed acknowledgments/reverse exchange and exact content-root convergence in the seven-person scenario. QR tests decode actual pixels, not mocked scan callbacks. Native IndexedDB and WebCrypto are used in browser tests; presentation unit stubs are explicitly scoped and do not count as crypto/hardware proof.

Early attempts were not reported as passes: listener/ref typing and lazy-export lint were corrected; long FAQs/diagram selector failed visual checks before correction; a new FAQ test initially targeted exact summary text without its plus marker; one WebKit storage-fault injection assigned an individual factory instance and was corrected to the prototype for reliable cross-instance fault injection. First complete 80-case gate passed, then the final guide-kind correction triggered another complete 80-case gate. No failing test was deleted or weakened. Host free space was checked (~5–7 GiB available during the final run); no browser data was cleared to make room or as a repair.

## QR and offline evidence

Transport/generation semantics are unchanged in Stage 5A. The rerun includes 60 legacy/compact × M/Q/H samples per engine across all signed message kinds: original images **60/60** and aligned screenshots **60/60** decode in each engine. The deliberate fractional 240px stress resize decodes **47/60 Chromium**, **45/60 WebKit**; these failures remain recorded, not claimed reliable. Keep proper quiet zones/module pixels and original downloads; arbitrary screenshot resampling/recompression is not guaranteed.

Representative enrollment, M: legacy **409 bytes**, QR v15, **77 modules** + quiet zones, **680px** image; compact **308 bytes**, v10, **57 modules**, **520px** image. Signature/key bits remain intact. Fixture labels/signatures mean these are not claimed byte-identical to the owner’s earlier ~407-byte request. Existing QR_AUDIT.md/QR_MEASUREMENTS.json cover compression/correction choices and protocol limits; current rerun observations are in STAGE_5A_EVIDENCE.json and `.cache/qr-audit-results/`.

Production cached-shell tests pass normal offline reload/restart and first-use lazy QR decoding. Website lazy chunk and all screenshots load after caching while offline. The transfer remains optical with no Wi-Fi/Bluetooth/WebRTC/backend dependency. Camera requires trusted HTTPS (localhost only on that device); a deployed environment still needs actual MIME/protection/camera/install acceptance.

## Performance and dependency review

| Resource                  | Stage 4 recorded baseline  | Candidate                              |
| ------------------------- | -------------------------- | -------------------------------------- |
| Operational entry JS      | 599,922 bytes              | **601,324** (+1,402; ~0.23%)           |
| Core CSS                  | 36,530 bytes               | **36,723** (+193)                      |
| Website deferred JS / CSS | Absent                     | **166,557 /15,743 bytes**              |
| Website screenshots       | Absent                     | **598,530 bytes** total                |
| Deferred decoder JS       | 26,867 +453,908            | Same                                   |
| Full precache             | 15 resources, ~1223.35 KiB | 21 resources, ~1987.43 KiB (+~764 KiB) |

GSAP/site code is absent from organizer startup resource requests; it loads with the website. Total offline installation increased and is not claimed faster/smaller. Three fresh local contexts per route/engine, no throttling: organizer wall times Chromium 323/146/138ms, WebKit 346/211/198ms; website Chromium 423/876/411ms, WebKit 449/413/886ms. These include automation and concurrent QA, not controlled phone benchmarks. Actual offline first image-decode workflow was 72ms Chromium /102ms WebKit in the final readiness test; generation workflow 55/133ms. No mobile frame-rate, battery, event-scale throughput or network-speed claim.

`npm audit --omit=dev --json`: **zero runtime advisories** at this check. Full audit: **15 dev/build advisories (13 moderate, 2 low; zero high/critical)** propagated through minimatch/glob/deepmerge, ESLint/typescript-eslint and Workbox/PWA build tooling. npm’s suggested fixes included major tool downgrades; no `audit fix --force`, unsupported override or broad tooling rewrite was applied. These remain a reviewed risk/follow-up, not proof that dependencies are safe. Actual lockfile/license inventory retained; GSAP has its own standard license, not MIT. Owner must review distribution/hackathon/AI rules before submission.

## Safe separate staging procedure

No Vercel CLI or `.vercel` linkage was found here. External login/project creation/link/deployment is deliberately not performed and requires separate approval. Use the existing [STAGING_DEPLOYMENT.md](STAGING_DEPLOYMENT.md) procedure, with this exact frozen snapshot:

```sh
cd /Users/InhouseHQ/Desktop/EntryLoop/.cache/stage3/staging-b257c337b86f-1794243009179
# Only after owner approves the separate project/team/stable hostname:
vercel login
vercel link --project entryloop-staging
export ENTRYLOOP_APPROVED_STAGING_PROJECT_ID='the-reviewed-separate-staging-project-id'
node --input-type=module -e 'import fs from "node:fs"; const p=JSON.parse(fs.readFileSync(".vercel/project.json","utf8")); if(!process.env.ENTRYLOOP_APPROVED_STAGING_PROJECT_ID || p.projectId!==process.env.ENTRYLOOP_APPROVED_STAGING_PROJECT_ID) throw Error("Stop: wrong project");'
# Only after the project-ID check and explicit upload approval:
vercel deploy --prod
```

Here `--prod` refers exclusively to the stable deployment of the **separate staging project**, never `entry-loop.vercel.app`. Install the CLI/authenticate only in an approved environment; never paste tokens. The project name’s availability/team/domain are unverified. Never run these commands in a production-linked checkout. Build command `npm run build`, output dist, Node >=22.12, no signing environment secret/backend. Verify approved owner/project ID, stable HTTPS origin, build-info.json, SPA refresh, asset/manifest/SW MIME and deployment protection before device use. Do not disable account-wide protection or embed bypass tokens. Publishing code does not move IndexedDB; no database reset is needed for this compatible candidate. Preserve the stable origin/profile across updates.

## Real devices, remaining UX and blockers

Use [STAGING_ACCEPTANCE.md](STAGING_ACCEPTANCE.md) and fill [DEVICE_TEST_LOG.md](DEVICE_TEST_LOG.md). Maya plus seven fictional guests; MacBook organizer, separately approved Pixel North/iPhone South. North admits four including Dara, South three including Dara; stage one North batch, restart/resume missing batch, repeat, return signed receipt, reverse and compare exact IDs/content roots/context. Final **7 operations /6 unique tickets /1 conflicted ticket**. Gita stays unused. Optional organizer receipt requires an explicit third admission-capable computer credential. Then restart/update all devices without clearing data. Ten-attempt representative QR optics samples remain unrun.

Residual UX: manual event files, independent 64-character fingerprint ceremony, several camera/display handoffs, explicit scan-next behavior, saved-session IDs, technical diagnostics and browser/PWA context recovery still require novice testing/facilitation. Actual authorization and signature checks were not shortened to disguise this friction. The website explains the flow; it does not prove ordinary staff can complete it unassisted.

[KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) and [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) keep all release blockers explicit: original unexplained persistence incident; physical device/offline/update acceptance; independent security and operational revocation/lost-key/retention/privacy review; novice/accessibility acceptance; tool advisories and licensing/hackathon-rule review; separate deployment approval. Stop after Stage 5A. No cloud sync, payments, unrelated product work or public release was performed.
