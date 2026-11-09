# EntryLoop design system · Stage 4

November 9, 2026. Application design, not a marketing site. Direction: **Accent ladder, seed 877116420**, retaining EntryLoop green and locally bundled IBM Plex Sans. No redraw or remote asset dependency. The Stage 3 plan's retained palette/type override the library's raspberry/DM Sans examples. The later user-supplied dashboard reference informs the compact metrics, stable sidebar and focused panels. EntryLoop adapts those patterns using real ticket issuance progress, known approvals and received admissions; its original synthetic project/activity data and dependency instructions are not copied. Open canvas with a quiet labeled navigation replaces the previously dominant inset frame; this refinement gives operational content more room without changing routes or storage.

## Product substance and questions

Objects are real browser-local events (name/date/place/description), attendee name/email/ticket IDs, issued tickets, signed device permissions, immutable admissions, conflicts and saved exchange sessions. Fresh contexts lead with organizer/entrance choices; origin/build/named-profile controls are advanced, with a visible missing-event caution. Fresh workspaces have zero events; no demo totals are inserted. Guest rendering remains bounded to 50 rows per increment. Organizer use favors a computer/tablet; staff use favors short, repeated phone interactions. Names/emails appear only on the organizer/ticket presentation, never as additions to optical admissions or scanner packages.

The face is the existing green/local IBM typography, the event's date stub and the admission ticket. The signature interaction is the paired-device handoff: the screen says who shows a code and who reads it, from actual session state. No decorative charts, avatars, stock photos or animation framework. No added third-party dependencies.

| Screen          | First question / next action                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------- |
| First launch    | Organize here or prepare an entrance phone? Explicitly choose a local context.                 |
| Events          | Which event am I working on? Open it or create one deliberately.                               |
| Overview        | What is still needed? Open guests, issuance, preparation or attendance.                        |
| Guest list      | Who needs a ticket? Add, preview CSV, search and issue.                                        |
| Tickets         | What will the guest present? Select the real guest, preview and export.                        |
| Scanner devices | Which phone am I approving? Prepare its event, read its request and verify independently.      |
| Check-in        | Was this ticket admitted here? Start capture, read the result, scan again.                     |
| Exchange        | Who shows which code next? Follow the current saved session and return its signed receipt.     |
| Attendance      | What have received logs established? Review local admissions/conflicts and expand evidence.    |
| Recovery        | Is this an empty context or a storage failure? Preserve data and inspect the original context. |

## Tokens and components

`src/features/product/product.css` is the product theme boundary; development workbench styles remain separate. Light: ground `#f5f7f5`, surface white, raised `#eff3f0`, ink `#182923`, secondary ink `#53635b`, action `#164f47`. Dark: ground `#101412`, surface `#171d19`, raised `#222b25`, ink `#eef4f0`, secondary ink `#b2c0b6`, action `#8dd6b8`. Semantic approval/error pairs use pale backgrounds with dark/light readable ink. Permission status is always textual; green never means global freshness.

IBM Plex Sans regular/semibold is loaded from local WOFF2 assets already attributed in THIRD_PARTY_NOTICES.md. Titles 25–30px, section headings 20px, body 15px, controls 14–16px, metadata 12–13px. Figures use tabular numerals. Monospace is reserved for actual IDs, fingerprints and advanced transport text. Native controls, inputs and tab buttons have visible focus rings. Normal controls are at least 44px; selects have an explicit 46px height after a WebKit measurement exposed its native min-height behavior. Form input text is 16px to avoid tiny phone fields.

Use 24px internal grids and equal content gutters: 224px desktop navigation plus the remaining canvas, with 40px equal inner gutters. Tablet folds navigation; small phones use 16px page gutters. Card/control/chip radii are 8/6/4px; no shadows on resting surfaces, gradients or glass. Motion is short control feedback only; reduced motion disables transitions and never hides content. ProductUI supplies the small consistent outline icon set, tabs and loading state. Icons are local SVG paths, not remote assets or new icon dependencies.

EventOverview owns next-action presentation. EnrollmentGuide owns device handoff instructions. ExchangeGuide owns signed-session handoff instructions. AdmissionFeedback gives large textual outcome and actionable next steps while retaining exact rejection details. AttendanceReview presents real local evidence and keeps the full immutable ledger under disclosure. Feedback preserves native alert/status semantics; no transient toast can hide a critical failure.

## Responsive and accessible behavior

Guest tables become stacked rows on phones; ticket IDs remain available through each row's native disclosure. Full ledger tables scroll inside their own container. Overview shows the full metric strip; other organizer tabs expose a compact expandable summary. Tickets stay white/black in either theme. Four-module quiet zones, integer physical module sizing and original download resolution remain the responsibility of the existing QR renderer/QrDisplay. No CSS filters, transforms or overlays are applied to QR images.

Native details/summary provides keyboard-operable disclosure with browser focus behavior. Shared tabs use roving tabindex, Arrow/Home/End navigation and labeled tabpanels. Status/errors use live roles and text, not color alone. Error, empty, loading, unknown context and recovery-required stay separate. Stored data with broken key associations continues to pause normal writes. Controls do not imply that role/view selection authorizes a phone.

Browser automation measures selected text pairs and visible control targets; this is not a complete WCAG certification. The 720×450 viewport is the layout-space equivalent of a 1440×900 window at 200% zoom, not proof of OS/browser chrome zoom or screen-reader acceptance. Physical camera permission, one-handed use, iOS installation and novice testing remain separate manual gates.

## Security in copy

Never shorten independent full-key fingerprint checks, copy the claimed fingerprint into its own approval, infer current global counts, or equate a stored receipt with permanent convergence. An organizer-local scanner permission also grants admission authority; disclose this before self-authorization. A scanner package is preparation, not permission. Non-exportable private keys stay on their original devices; records-only exports do not restore them. The original disappearance incident gate remains **FAILED/unexplained**.
