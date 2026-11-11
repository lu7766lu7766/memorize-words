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
  // 相對路徑：以 manifest 所在目錄為準，部署在 GitHub Pages 子路徑也能正確運作
  start_url: './',
  scope: './',
  icons: [
    {
      src: 'pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: 'pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: 'pwa-512x512.png',
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
        urlPattern: ({ url }: { url: URL }) => /\/data\/[^/]+\.json$/.test(url.pathname),
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

// GitHub Pages 專案頁面路徑：https://<user>.github.io/<repo>/
// 在 GitHub Actions 中自動依 repo 名稱決定（學生 fork 或改名也能正確部署）
// 在 Vercel（process.env.VERCEL）則使用根路徑 '/'
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
export const BASE_PATH = process.env.VERCEL
  ? '/'
  : !repoName
    ? '/memorize-words/'
    : repoName.endsWith('.github.io')
      ? '/'
      : `/${repoName}/`

export default defineConfig({
  base: BASE_PATH,
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
