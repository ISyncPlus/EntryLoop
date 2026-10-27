# Third-party and AI attribution

EntryLoop Phase 1 was developed with OpenAI Codex assistance (architecture, source generation, tests, debugging and documentation) under the user's direction. The human supplied the requirements, scope and design-skill choice. Preserve this disclosure in the hackathon submission and verify the actual event's AI/open-source rules; no rules compliance approval is claimed.

## Direct packages

Exact resolved versions/licenses below were read from package-lock.json. Third-party packages remain the work of their respective maintainers; retain their shipped license/copyright notices. The project does not claim authorship of React, Dexie, Zod, ZXing, qrcode, Tailwind, Vite, Workbox or any test/build tooling.

| Package                       | Locked version | Declared license | Use              |
| ----------------------------- | -------------- | ---------------- | ---------------- |
| `@zxing/browser`              | 0.2.1          | MIT              | Runtime          |
| `@zxing/library`              | 0.23.0         | Apache-2.0       | Runtime          |
| `dexie`                       | 4.4.7          | Apache-2.0       | Runtime          |
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

`package-lock.json` pins direct and transitive packages with registry integrity hashes. `docs/THIRD_PARTY_PACKAGES.json` is a lockfile-derived inventory including transitive packages, versions and declared licenses. Actual package notices are in `node_modules/<package>/LICENSE*` (and other package copyright/NOTICE files); a declared-license inventory is not a substitute for those terms. Review distribution obligations before publishing. ZXing packages declare Apache-2.0; preserve relevant notices. QR-code standards are not original EntryLoop inventions.

## Official technical references consulted

- [Dexie transactions](https://dexie.org/docs/Dexie/Dexie.transaction%28%29): atomic read/write operations and avoiding unrelated asynchronous APIs during a transaction.
- [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/): manifest and generated service-worker precaching.
- [ZXing browser](https://github.com/zxing-js/browser): camera and image decoding adapters.
- [node-qrcode](https://github.com/soldair/node-qrcode): local QR generation, quiet zone and error correction options.
- [MDN secure-context features](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts/features_restricted_to_secure_contexts): camera, crypto and service-worker origin requirements.
- [Vite preview options](https://vite.dev/config/preview-options): local static preview and optional HTTPS.
- [mkcert](https://github.com/FiloSottile/mkcert): optional manual trusted development TLS provisioning; not installed by this project.

## Design and assets

The user selected the installed `design-taste-frontend` skill; its app-screen guidance was consulted. Full product art direction is deferred. The workbench uses platform fonts, local CSS and simple locally generated PNG PWA icons. No third-party visual assets, remote fonts or external branding are shipped. No project source license was chosen on behalf of the owner; choose one before public release if appropriate.
