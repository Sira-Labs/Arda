/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  // `.env` stays at the repository root (see .env.example), next to the other apps.
  envDir: fileURLToPath(new URL('../..', import.meta.url)),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'fonts/*.woff2'],
      manifest: {
        name: 'ʿArḍa – Tajwīd lernen',
        short_name: 'ʿArḍa',
        description:
          'Tajwīd lernen: die Regel, der Klang und dein Sheikh auf derselben Āya.',
        lang: 'de',
        dir: 'ltr',
        theme_color: '#10201b',
        background_color: '#f6f1e7',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: {
        // The app shell, fonts and (later) content packs work offline (ADR-0010).
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // Font subsets for scripts the app does not use; browsers fetch them only on demand.
        // Content packs are downloaded when first needed and checked, not precached (ADR-0010).
        globIgnores: [
          '**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*.woff2',
          'packs/**',
        ],
        navigateFallback: 'index.html',
        // Server routes are never answered with the app shell.
        navigateFallbackDenylist: [/^\/api\//, /^\/healthz/, /^\/media\//],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    // Local development: the api runs on :8000 (npm start -w @arda/api); same-origin like
    // production, so the session cookie works without CORS.
    proxy: { '/api': process.env.ARDA_API_URL ?? 'http://localhost:8000' },
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    // Never inline fonts as data: URIs: the CSP allows fonts from 'self' only.
    assetsInlineLimit: (file) => (/\.(woff2?|ttf|otf)$/i.test(file) ? false : undefined),
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    css: false,
  },
});
