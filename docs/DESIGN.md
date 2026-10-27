# Current interface and deferred design

The user’s latest instruction defers UI/UX redesign to Stage 4 and retains the interface already used during Phase 2A. This document records the practical choices already present; it is not a claim that final premium product design is complete.

## Existing functional system

- Organizer workspace and dedicated gate workflow, with the synthetic workbench separated at `/dev/workbench`.
- Quiet green-grey frame, white/neutral dark surfaces, actual event date stubs, local state counts and real ticket previews. No fabricated attendance or business metrics.
- IBM Plex Sans regular/semibold, self-hosted with OFL attribution. System monospace only for literal IDs/payloads. No runtime font/CDN requests.
- Native labeled controls, visible keyboard focus, roving-focus tabs with arrow/Home/End navigation, readable success/rejection text, responsive stacked layouts and 44px controls. The primary camera action is 64px tall; QR images stay black/white in both themes.
- Light/dark mode follows explicit URL preference or initial system preference. Product navigation preserves the explicit choice.
- Only actual event data populates cards, guest lists and tickets. The app starts empty; examples occur only in test fixtures/documentation.

## Skill use and review

Read the installed design-taste-frontend skill and its app-screen guide. Reference draw: framed-sheet, seed 884763864. Before/after review covers 1440/768/390 pixels; the initial missing-font recommendation was addressed with locally cached IBM Plex Sans. Product source review retains the justified monospace warning for a literal signed-JSON textarea. Functional visual checks verify no page overflow, visible controls, ticket QR sizing and light/dark scanner readability. Source/runtime measurements are supporting checks, not a final Stage 4 design score.

The screen questions are concrete: which event should I prepare; who needs a ticket; what public key/data should a scanner trust; should this presented ticket be admitted; and which operations conflict? The largest scanner number is derived local attendance, with limits stated beside it. A two-column layout uses one 24px gutter and folds on small screens.

## Canceled visual exploration

The user briefly supplied a Build Unit agency aesthetic (video, glass, brick-red accents, Framer Motion/Lucide/shadcn direction), then explicitly deferred it. Three unintegrated reference components, downloaded video/poster and newly installed motion/icon/dialog packages were removed. They are absent from source/dependency lockfile/public assets. The product remains EntryLoop; no agency pages, marketing features or media are shipped.

Remaining interface work belongs to Stage 4: visual identity, scanner ergonomics on actual phones, long-name/large-roster polish, ticket distribution UX, comprehensive assistive-technology testing.
