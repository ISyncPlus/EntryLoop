import { defineConfig } from 'vitest/config';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
function sourceFiles(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sourceFiles(path + '/' + entry.name)
      : [path + '/' + entry.name],
  );
}
const inputHash = createHash('sha256');
for (const path of [
  ...sourceFiles('src'),
  ...sourceFiles('public'),
  ...sourceFiles('scripts'),
  'index.html',
  'package.json',
  'package-lock.json',
  'vite.config.ts',
].sort())
  inputHash.update(path + '\0').update(readFileSync(path));
const buildId =
  process.env.ENTRYLOOP_BUILD_ID ?? inputHash.digest('hex').slice(0, 12);
let revision = 'unavailable',
  dirty: boolean | null = null;
if (existsSync('build-provenance.json')) {
  const input: unknown = JSON.parse(
    readFileSync('build-provenance.json', 'utf8'),
  );
  if (
    !input ||
    typeof input !== 'object' ||
    !('revision' in input) ||
    !('dirty' in input) ||
    typeof input.revision !== 'string' ||
    !/^(?:[a-f0-9]{40,64}|unavailable)$/.test(input.revision) ||
    ![true, false, null].includes(input.dirty as boolean | null)
  )
    throw new Error(
      'Invalid staging source provenance. Do not mislabel a build.',
    );
  revision = input.revision;
  dirty = input.dirty as boolean | null;
} else {
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
    dirty = Boolean(
      execFileSync('git', ['status', '--porcelain'], {
        encoding: 'utf8',
      }).trim(),
    );
  } catch {
    console.warn(
      'Git provenance unavailable; build metadata will report unknown.',
    );
  }
}
const certPath = process.env.ENTRYLOOP_TLS_CERT;
const keyPath = process.env.ENTRYLOOP_TLS_KEY;
if (Boolean(certPath) !== Boolean(keyPath))
  throw new Error(
    'Set both ENTRYLOOP_TLS_CERT and ENTRYLOOP_TLS_KEY for local HTTPS.',
  );
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: {
    __ENTRYLOOP_BUILD_ID__: JSON.stringify(buildId),
    __ENTRYLOOP_REVISION__: JSON.stringify(revision),
    __ENTRYLOOP_DIRTY__: JSON.stringify(dirty),
  },
  preview:
    certPath && keyPath
      ? { https: { cert: readFileSync(certPath), key: readFileSync(keyPath) } }
      : {},
  plugins: [
    {
      name: 'entryloop-build-info',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'build-info.json',
          source: JSON.stringify({ build: buildId, revision, dirty }, null, 2),
        });
      },
    },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        name: 'EntryLoop',
        short_name: 'EntryLoop',
        description:
          'Offline-first events, signed tickets and QR reconciliation',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#164f47',
        background_color: '#f4f6f5',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,webmanifest,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
