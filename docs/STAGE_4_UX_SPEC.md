# Stage 4 UX specification · planning only

Prepared November 6, 2026. **No Stage 4 redesign is implemented by Stage 3.** The unexplained organizer disappearance keeps its incident gate FAILED. Design must make local scope, readiness and incomplete synchronization understandable without making unsupported security promises.

## Design workflow and direction

Used the installed `design-taste-frontend` skill at `/Users/InhouseHQ/.agents/skills/design-taste-frontend/SKILL.md`, specifically its **app-screen** workflow in `references/app-screens.md`, not a marketing-page/agency template. Sequence for Stage 4: inventory jobs/data → each screen's question/action/evidence → style/shell → actual data → loading/empty/error/stale states → browser inspection and iteration at desktop/tablet/phone → novice usability validation. Do not begin with a landing page.

Planning draw: community/events kind; two options, True-black flat and Accent ladder. Provisional choice **Accent ladder**, seed **877116420**, saved separately in `.taste-skill/stage4-plan/direction.json`. Existing green palette and self-hosted IBM type retained through `--keep palette,type`; no redraw, media purchase, new font or visual change applied. Choose this for sustained organizer work in daylight, with a neutral dark adaptation for entrances. The proposed screen patterns are references, not a requirement to invent charts or fill unused space. No rendered design/inspector scores are claimed for this unimplemented plan.

Product face: the ticket/entrance handoff, not generic SaaS KPIs. Signature element: two entrances and their last verified exchange receipt, with real freshness/context and an explicit incomplete state. The screen must never imply global live attendance or perpetual convergence. Information, names, ticket evidence and required actions supply richness; avoid decorative video, gradients, glass, vanity metrics or an agency identity.

## Personas and constraints

| Persona                     | Job/device                                                    | Need / risk                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Organizer Maya (fictional)  | Computer; prepares an event, guest list and entrances         | Know preparation is complete, retain authority/data, find attendee/ticket, see received attendance and unresolved conflicts. No cryptography background assumed. |
| Entrance staff              | Phone, one hand, poor lighting, intermittent preparation time | Confirm correct event/device readiness, admit or reject clearly, recover camera/permission failures, exchange records without thinking about sessions or JSON.   |
| Lead staff / coordinator    | Computer or phone, moving between gates                       | Complete handoffs, identify missing batches and stale policies, understand that identical counts are insufficient.                                               |
| Troubleshooting facilitator | Advanced local diagnostic drawer                              | Exact origin/build/key IDs/policy/log roots and safe evidence export without exposing private keys or guest records.                                             |

No persona implies an implemented online account, observer-only credential, cloud backup or remote device wipe.

## Information architecture and screen inventory

Organizer navigation: **Events → [event] → Overview / Guests / Tickets / Entrances / Attendance / Event settings**. Staff navigation: **Scan / Exchange / This device** inside one prepared event. Device/setup states are shared, role-specific actions are explicit. The event and current entrance remain visible; changing event must stop capture and confirm the new scope. Technical browser namespaces stay internally explicit, but ordinary users choose a named device/workspace through guided setup rather than editing query strings.

| Screen               | First question and primary action                                            | Evidence/states                                                                                                                                            |
| -------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First launch         | “Am I organizing or preparing this phone?” Choose role/setup                 | This browser has no known context versus inspection failure; original-device/recovery route. Role selection grants no authority.                           |
| Events               | “Which event am I working on?” Open/create                                   | Date/place and local role; successful empty, loading, storage failure.                                                                                     |
| Event overview       | “What is still needed before doors open?” Complete next preparation task     | Actual guests, issued tickets, catalog revision, authorized/prepared entrances; no invented setup percentage.                                              |
| Guests               | “Who needs a ticket?” Search/add/import                                      | Searchable rows, duplicate/invalid CSV preview, bounded list, issued status; preserve all fields on mobile.                                                |
| Tickets              | “Can this guest present a usable ticket?” Preview/export                     | Real signed QR, intended recipient, safe export warnings and older-scanner compatibility. No PII inside QR.                                                |
| Entrances            | “Which phones are ready and approved?” Prepare/approve                       | Prepared, awaiting approval, authorized, revoked/stale are distinct. Key possession is not staff identity.                                                 |
| Staff readiness      | “Can this phone work offline at this event?” Complete missing preparation    | Cache/offline reload, local identity, catalog/policy, authorization, camera permission; unknown is never green.                                            |
| Scan                 | “Was this person admitted here?” Scan next                                   | Large actionable result, event/entrance, local count, duplicate/wrong event/invalid/revoked/unknown ticket; text plus color, no automatic security bypass. |
| Exchange             | “Are both entrances holding the same verified records?” Begin guided handoff | Direction, exact progress, missing batches, acknowledgment return, snapshot freshness and context.                                                         |
| Attendance/conflicts | “What do received logs establish?” Receive/review evidence                   | Local totals versus unreceived data, immutable conflicting operations, no clock-based winner.                                                              |
| Device/settings/help | “Which context/version/identity is this?” Diagnose/export safely             | Plain-language summary; advanced full IDs/build/fingerprints/roots under disclosure; recovery cannot recreate absent keys.                                 |

A common task is one action from its screen. Desktop may use a quiet sidebar; tablet folds navigation; phone has labeled primary destinations and full-screen scan/exchange, not a shrunken admin dashboard. Each chart must answer a real question; this product currently needs lists, readiness and evidence more than decorative charts.

## Main journeys

**Organizer:** create event → manual/CSV guests with preview → issue → preview/export → prepare two entrances → approve intended devices → confirm offline rehearsal → receive signed logs → inspect conflicts and retention. Provide one “next required step,” derived from real state, and allow returning without resetting work.

**Staff:** open stable app → prepare intended event with organizer → request approval → receive bound authorization → offline readiness check → scan → exchange/recover → return confirmation → close/reopen with the same data. Do not show the organizer's whole guest-management interface by default.

**Recovery:** missing event → identify current browser/origin/device → show known existing contexts or inspection failure → safe diagnostic → original-device guidance. Never suggest creating a replacement event as the first recovery action or market a key-free records export as authority backup.

## Simplified setup and enrollment proposal

Target language: “Prepare this phone,” “Show to organizer,” “Approve North entrance,” “Return approval.” Hide JSON fields, epochs and hashes from the default journey. Keep advanced inspection/fallback available to facilitators.

A guided pairing flow must bind the **entire** event/organizer public key, intended scanner UUID/key, request nonce and signed response. A package is still not authorization. The organizer explicitly approves the physical phone and event, the returning credential must match that phone's actual private identity, and all original signature/policy checks remain.

Near-term UX-only work can orchestrate the existing file picker/camera screens and handoff order; it cannot magically transfer a large catalog or remove initial trust establishment. The desired final experience needs an engineering-reviewed alternative to manual JSON and 64-character comparisons: direct trusted screen-to-camera setup with a bounded signed provisioning manifest/catalog transfer and reviewed key-confirmation ceremony. Full fingerprint/key comparisons may be automated only when an independent trusted channel actually binds both screens/identities. A self-signed QR or automatically copied claimed fingerprint is insufficient. Do not truncate to a few digits and call it equivalent security. Any challenge/SAS/QR pairing revision requires a threat model, new version/compatibility plan and tests before implementation; this specification does not authorize weakening current checks.

Lost/revoked devices require deliberate replacement identity and updated policies. Organizer “receive-only” UX needs either honest disclosure of the current admission-capable credential (as Stage 3 does) or a separately designed observer authorization protocol, not a fake observer label.

## Intuitive optical synchronization proposal

Use an operator-facing guided sequence: **Choose receive/send → show/read the request → read offer → read numbered batches → recover missing → return confirmation**. Explain who should hold which screen/camera at every step. Show one current target at adequate size, stop/review after capture, distinguish “received batch” from “admissions accepted,” and never display the previous code while preparing the next action.

“Complete” requires the intended receiver's verified acknowledgment and matching operation content/context at the receipt time. If receiver has additional records, the next action is “Send the other direction.” “Up to date here as of this exchange” is more honest than a global synchronized icon. Show new admissions/policy/catalog changes as a reason to exchange again. Interrupted staging survives restart; offer a named, scoped “Continue transfer,” not a raw session UUID selector. Keep manual advancement until physical optics justify animation.

Do not hide divergence/conflicts behind a success count. Conflict review shows the ticket and distinct signed admissions, entrance identities and untrusted recorded times; no automatic overwrite or earlier-time winner. Scanners retain opaque IDs; attendee lookup/PII is organizer-local.

## Responsive, accessibility and visual requirements

- 390px phone, tablet ~768px, desktop ~1440px, plus 320px/200% zoom checks. No page overflow; tables may scroll internally when preserving columns is necessary. At least 44px touch targets and a primary action reachable one-handed.
- Screen-reader/keyboard focus, stable input names, visible focus, labeled dialogs, proper tab semantics, live status announcements and errors tied to fields. Move focus appropriately after scan/approval; do not announce a whole ledger on each frame. No color-only decision or motion dependency.
- Preserve a clear four-module white quiet zone and integer physical module sizing. QR scaling is functional geometry, not decorative flexibility. Download originals; warn on too-small targets. Camera permission denial, unavailable camera, dim image, unreadable code and unsupported versions need distinct next actions. Do not claim recovery from a blurred screenshot always works.
- One coherent green/neutral role palette; light and neutral-dark surfaces; contrast >=4.5 for ordinary text and >=3 for meaningful nontext controls/large text as applicable. Prefer current local IBM typography, readable ~16px body and compact noun headings. Full hue on meaningful data/actions, no excessive saturated chrome. Status meaning remains consistent across themes.
- Current data states: genuine zero; absent/unknown; loading; read failure; recovery-required; not prepared; not authorized; revoked/stale; transfer incomplete; rejected; historical receipt. The style guide's stale-data convention never overrides EntryLoop's rule that failed storage reads cannot masquerade as fresh empty/trusted state.
- No remote fonts, assets, analytics or animation dependencies in core flows. PWA updates preserve local context; explain browser-local storage at setup/receipt/recovery without forcing every staff member to understand IndexedDB.

## First-time-user test plan and exit criteria

Recruit at least three novice organizers and four staff participants across Android/iOS; include keyboard/screen-reader use and dim-room conditions. Facilitator supplies the seven-person fictional event, withholds protocol coaching and records assists/errors/timing. Ask participants to explain what “offline,” “prepared,” “authorized” and “complete exchange” mean in their own words. Never test with real attendee PII before privacy/readiness review.

Tasks: create/import/issue; prepare/authorize an intended phone while rejecting a swapped device; admit valid/duplicate/invalid; complete two-way exchange; resume interruption; identify stale policy; find a missing-event recovery path without clearing data. Test physical front/rear cameras and QR distances ten times per representative target. Record permission/OS screenshot/install partition issues separately from image decoding.

Proposed usability targets (not achieved metrics): zero unsafe trust approvals/data resets, no participant required to paste JSON/edit profiles/interpret fingerprints in the default final flow, at least 80% unassisted completion of each core task in the first round, all participants recognize incomplete/reverse-needed sync. Security-critical mistakes block release even if task times improve. Time targets must be set from observed baseline before claiming improvement.

Stage 4 implementation gate: inspect current screenshots and data states, build only an explicitly approved scoped design, run app source lint/browser inspector at all widths, preserve the full regression/security suites, do a look/fix loop, record actual measurements and novice findings, then physical acceptance. No final design scores or hardware pass is claimed by this planning document.
