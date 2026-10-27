# Third-party and AI attribution

EntryLoop Phases 1 and 2A were developed with OpenAI Codex assistance (architecture, source generation, tests, debugging and documentation) under the user's direction. The human supplied the requirements, scope and design-skill choice. Preserve this disclosure in the hackathon submission and verify the actual event's AI/open-source rules; no rules compliance approval is claimed.

## Direct packages

Exact resolved versions/licenses below were read from package-lock.json. Third-party packages remain the work of their respective maintainers; retain their shipped license/copyright notices. The project does not claim authorship of React, Dexie, Zod, ZXing, qrcode, Tailwind, Vite, Workbox or any test/build tooling.

| Package                       | Locked version | Declared license | Use              |
| ----------------------------- | -------------- | ---------------- | ---------------- |
| `@zxing/browser`              | 0.2.1          | MIT              | Runtime          |
| `@zxing/library`              | 0.23.0         | Apache-2.0       | Runtime          |
| `dexie`                       | 4.4.7          | Apache-2.0       | Runtime          |
| `papaparse`                   | 5.7.0          | MIT              | Runtime          |
| `qrcode`                      | 1.5.4          | MIT              | Runtime          |
| `react`                       | 19.3.1         | MIT              | Runtime          |
| `react-dom`                   | 19.3.1         | MIT              | Runtime          |
| `zod`                         | 4.6.7          | MIT              | Runtime          |
| `@eslint/js`                  | 10.0.1         | MIT              | Development/test |
| `@playwright/test`            | 1.64.1         | Apache-2.0       | Development/test |
| `@tailwindcss/vite`           | 4.3.3          | MIT              | Development/test |
| `@testing-library/jest-dom`   | 7.0.1          | MIT              | Development/test |
| `@testing-library/react`      | 16.3.3         | MIT              | Development/test |
| `@testing-library/user-event` | 14.6.8         | MIT              | Development/test |
| `@types/node`                 | 26.6.5         | MIT              | Development/test |
| `@types/papaparse`            | 5.5.2          | MIT              | Development/test |
| `@types/qrcode`               | 1.5.6          | MIT              | Development/test |
| `@types/react`                | 19.3.0         | MIT              | Development/test |
| `@types/react-dom`            | 19.3.0         | MIT              | Development/test |
| `@vitejs/plugin-react`        | 6.1.2          | MIT              | Development/test |
| `eslint`                      | 10.13.0        | MIT              | Development/test |
| `eslint-config-prettier`      | 10.1.8         | MIT              | Development/test |
| `eslint-plugin-react-hooks`   | 7.1.1          | MIT              | Development/test |
| `eslint-plugin-react-refresh` | 0.5.7          | MIT              | Development/test |
| `fake-indexeddb`              | 6.2.6          | Apache-2.0       | Development/test |
| `globals`                     | 17.13.0        | MIT              | Development/test |
| `jsdom`                       | 30.1.3         | MIT              | Development/test |
| `prettier`                    | 3.9.10         | MIT              | Development/test |
| `tailwindcss`                 | 4.3.3          | MIT              | Development/test |
| `typescript`                  | 6.0.3          | Apache-2.0       | Development/test |
| `typescript-eslint`           | 8.72.1         | MIT              | Development/test |
| `vite`                        | 8.3.5          | MIT              | Development/test |
| `vite-plugin-pwa`             | 2.0.0          | MIT              | Development/test |
| `vitest`                      | 5.0.5          | MIT              | Development/test |

## Dependency provenance

`package-lock.json` pins direct and transitive packages with registry integrity hashes. `docs/THIRD_PARTY_PACKAGES.json` is a lockfile-derived inventory including transitive packages, versions and declared licenses. Actual package notices are in `node_modules/<package>/LICENSE*` (and other package copyright/NOTICE files); a declared-license inventory is not a substitute for those terms. Review distribution obligations before publishing. `@zxing/library` declares Apache-2.0 and `@zxing/browser` declares MIT; preserve their respective notices. QR-code standards are not original EntryLoop inventions.

## Official technical references consulted

- [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction%28%29): atomic read/write operations and avoiding unrelated asynchronous APIs during a transaction.
- [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/): manifest and generated service-worker precaching.
- [ZXing browser](https://github.com/zxing-js/browser): camera and image decoding adapters.
- [node-qrcode](https://github.com/soldair/node-qrcode): local QR generation, quiet zone and error correction options.
- [MDN secure-context features](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts/features_restricted_to_secure_contexts): camera, crypto and service-worker origin requirements.
- [Vite preview options](https://vite.dev/config/preview-options): local static preview and optional HTTPS.
- [mkcert](https://github.com/FiloSottile/mkcert): optional manual trusted development TLS provisioning; not installed by this project.

## Design and assets

The user selected the installed `design-taste-frontend` skill; its app-screen guidance was consulted. Full product art direction is deferred to Stage 4 by the latest user instruction. The synthetic workbench retains platform fonts; the practical product uses self-hosted IBM Plex Sans, local CSS and the existing generated PNG PWA icons. IBM Plex Sans is from the official IBM/plex repository, under SIL OFL 1.1; copyright and full license are in public/fonts/OFL.txt. No runtime remote fonts or external branding are shipped. No project source license was chosen on behalf of the owner; choose one before public release if appropriate.

## Phase 2A additions

Papa Parse parses bounded local CSV files; its type package is development-only. Ticket signatures use native WebCrypto with no external cryptographic dependency. IBM font source: [official IBM/plex](https://github.com/IBM/plex); the complete OFL notice is retained locally.

Codex assisted with Phase 2A architecture, source, tests, debugging and documentation. The user supplied scope, confirmed the physical Phase 1 result and deferred full UI/UX redesign to Stage 4. The canceled agency-reference components, user-supplied video/poster and Framer Motion/Lucide/Radix packages were removed and are not shipped. No public deployment or redistribution was performed.

Primary references: [WebCrypto ECDSA specification](https://www.w3.org/TR/webcrypto/#ecdsa), [MDN native verify](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify), and [Papa Parse documentation](https://www.papaparse.com/docs). Automated compatibility evidence is recorded separately in DEVELOPMENT_LOG.md.

## Phase 2B assistance and dependencies

OpenAI Codex assisted with offline enrollment/security architecture, implementation, tests, debugging and documentation. No new runtime/development package was added for Phase 2B. ECDSA/SHA-256 use native WebCrypto; existing dependency/license attribution remains applicable. User-reported Phase 1 hardware evidence is separate from automated Phase 2B evidence; no physical verification or competition compliance approval was invented.
