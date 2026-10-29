import { defineConfig } from 'vitest/config';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
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
const buildId =
  process.env.ENTRYLOOP_BUILD_ID ??
  createHash('sha256')
    .update(
      [
        ...sourceFiles('src'),
        'index.html',
        'package-lock.json',
        'vite.config.ts',
      ]
        .sort()
        .map((path) => path + '\n' + readFileSync(path, 'utf8'))
        .join('\n'),
    )
    .digest('hex')
    .slice(0, 12);
const certPath = process.env.ENTRYLOOP_TLS_CERT;
const keyPath = process.env.ENTRYLOOP_TLS_KEY;
if (Boolean(certPath) !== Boolean(keyPath))
  throw new Error(
    'Set both ENTRYLOOP_TLS_CERT and ENTRYLOOP_TLS_KEY for local HTTPS.',
  );
export default defineConfig({
  define: { __ENTRYLOOP_BUILD_ID__: JSON.stringify(buildId) },
  preview:
    certPath && keyPath
      ? { https: { cert: readFileSync(certPath), key: readFileSync(keyPath) } }
      : {},
  plugins: [
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
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,woff2}'],
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
