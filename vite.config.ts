import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
const certPath = process.env.ENTRYLOOP_TLS_CERT;
const keyPath = process.env.ENTRYLOOP_TLS_KEY;
if (Boolean(certPath) !== Boolean(keyPath))
  throw new Error(
    'Set both ENTRYLOOP_TLS_CERT and ENTRYLOOP_TLS_KEY for local HTTPS.',
  );
export default defineConfig({
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
        name: 'EntryLoop Workbench',
        short_name: 'EntryLoop',
        description: 'Synthetic offline check-in reconciliation workbench',
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
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
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
