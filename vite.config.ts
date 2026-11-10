/// <reference types="vitest" />
import path from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa'

export const pwaManifest = {
  name: '一字不漏 - 高中生背單字 PWA',
  short_name: '一字不漏',
  description: '高中學測與多益單字間隔複習 PWA，完全離線使用',
  theme_color: '#2563eb',
  background_color: '#ffffff',
  display: 'standalone' as const,
  start_url: '/',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable',
    },
  ],
}

export const pwaOptions: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  manifest: pwaManifest,
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json,webmanifest}'],
    runtimeCaching: [
      {
        urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/data/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'vocabulary-data-cache',
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 60 * 24 * 365,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
}

export default defineConfig({
  plugins: [
    vue(),
    VitePWA(pwaOptions),
  ],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
  },
} as unknown as Parameters<typeof defineConfig>[0])
