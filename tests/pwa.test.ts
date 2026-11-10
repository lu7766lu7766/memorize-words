import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { pwaManifest, pwaOptions } from '../vite.config'
import {
  initPwa,
  needRefresh,
  offlineReady,
  updateServiceWorker,
  dismissUpdate,
  dismissOfflineReady,
  resetPwaState,
} from '../src/pwa'
import App from '../src/App.vue'

describe('PWA Configuration & Manifest Spec', () => {
  it('vite.config.ts should define correct manifest properties', () => {
    expect(pwaManifest.name).toBe('一字不漏 - 高中生背單字 PWA')
    expect(pwaManifest.short_name).toBe('一字不漏')
    expect(pwaManifest.description).toBe('高中學測與多益單字間隔複習 PWA，完全離線使用')
    expect(pwaManifest.theme_color).toBe('#2563eb')
    expect(pwaManifest.background_color).toBe('#ffffff')
    expect(pwaManifest.display).toBe('standalone')
    expect(pwaManifest.start_url).toBe('./')
    expect(pwaManifest.icons.length).toBeGreaterThanOrEqual(2)
  })

  it('vite.config.ts should configure precaching globPatterns including json and assets', () => {
    expect(pwaOptions.registerType).toBe('autoUpdate')
    const globPatterns = pwaOptions.workbox?.globPatterns ?? []
    expect(globPatterns.some((pattern: string) => pattern.includes('json'))).toBe(true)
    expect(globPatterns.some((pattern: string) => pattern.includes('html'))).toBe(true)
    expect(globPatterns.some((pattern: string) => pattern.includes('js'))).toBe(true)
  })

  it('vite.config.ts should configure runtime caching for /data/*.json with StaleWhileRevalidate', () => {
    const runtimeCaching = pwaOptions.workbox?.runtimeCaching ?? []
    expect(runtimeCaching.length).toBeGreaterThan(0)
    const dataRule = runtimeCaching.find((rule: any) => {
      if (typeof rule.urlPattern === 'function') {
        const dummyUrl = new URL('https://example.com/data/vocabulary.json')
        return rule.urlPattern({ url: dummyUrl })
      }
      return false
    })
    expect(dataRule).toBeDefined()
    expect(dataRule?.handler).toBe('StaleWhileRevalidate')
    expect(dataRule?.options?.cacheName).toBe('vocabulary-data-cache')
  })

  it('public/manifest.webmanifest should exist and match manifest specs', () => {
    const manifestPath = resolve(process.cwd(), 'public/manifest.webmanifest')
    expect(existsSync(manifestPath)).toBe(true)

    const raw = readFileSync(manifestPath, 'utf-8')
    const manifest = JSON.parse(raw)
    expect(manifest.name).toBe('一字不漏 - 高中生背單字 PWA')
    expect(manifest.short_name).toBe('一字不漏')
    expect(manifest.theme_color).toBe('#2563eb')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('./')
  })
})

describe('src/pwa.ts Service Worker Registration & State Logic', () => {
  beforeEach(() => {
    resetPwaState()
  })

  it('should initialize with default states as false', () => {
    expect(needRefresh.value).toBe(false)
    expect(offlineReady.value).toBe(false)
  })

  it('should trigger onNeedRefresh and update needRefresh ref', () => {
    let capturedOnNeedRefresh: (() => void) | undefined
    const mockRegister = vi.fn().mockImplementation((opts) => {
      capturedOnNeedRefresh = opts?.onNeedRefresh
      return vi.fn().mockResolvedValue(undefined)
    })

    const onNeedRefreshCb = vi.fn()
    initPwa({
      registerFn: mockRegister,
      onNeedRefresh: onNeedRefreshCb,
    })

    expect(mockRegister).toHaveBeenCalled()
    expect(capturedOnNeedRefresh).toBeDefined()

    // Trigger update detected
    capturedOnNeedRefresh!()
    expect(needRefresh.value).toBe(true)
    expect(onNeedRefreshCb).toHaveBeenCalled()
  })

  it('should trigger onOfflineReady and update offlineReady ref', () => {
    let capturedOnOfflineReady: (() => void) | undefined
    const mockRegister = vi.fn().mockImplementation((opts) => {
      capturedOnOfflineReady = opts?.onOfflineReady
      return vi.fn().mockResolvedValue(undefined)
    })

    const onOfflineReadyCb = vi.fn()
    initPwa({
      registerFn: mockRegister,
      onOfflineReady: onOfflineReadyCb,
    })

    expect(capturedOnOfflineReady).toBeDefined()

    // Trigger offline ready
    capturedOnOfflineReady!()
    expect(offlineReady.value).toBe(true)
    expect(onOfflineReadyCb).toHaveBeenCalled()
  })

  it('should invoke updateServiceWorker function correctly', async () => {
    const mockUpdateSW = vi.fn().mockResolvedValue(undefined)
    const mockRegister = vi.fn().mockReturnValue(mockUpdateSW)

    initPwa({
      registerFn: mockRegister,
    })

    await updateServiceWorker(true)
    expect(mockUpdateSW).toHaveBeenCalledWith(true)
  })

  it('should dismiss update notification', () => {
    needRefresh.value = true
    dismissUpdate()
    expect(needRefresh.value).toBe(false)
  })

  it('should dismiss offline ready notification', () => {
    offlineReady.value = true
    dismissOfflineReady()
    expect(offlineReady.value).toBe(false)
  })
})

describe('src/App.vue Component PWA Integration', () => {
  beforeEach(() => {
    resetPwaState()
  })

  it('should render basic app layout skeleton', () => {
    const wrapper = mount(App)
    expect(wrapper.find('.app-title').text()).toBe('一字不漏')
    expect(wrapper.find('.app-badge').text()).toBe('學測 / 多益單字')
    expect(wrapper.find('[data-testid="pwa-update-toast"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="pwa-offline-toast"]').exists()).toBe(false)
  })

  it('should display update toast when needRefresh is true and trigger update on click', async () => {
    const mockUpdateSW = vi.fn().mockResolvedValue(undefined)
    initPwa({
      registerFn: () => mockUpdateSW,
    })

    const wrapper = mount(App)
    needRefresh.value = true
    await wrapper.vm.$nextTick()

    const updateToast = wrapper.find('[data-testid="pwa-update-toast"]')
    expect(updateToast.exists()).toBe(true)
    expect(updateToast.text()).toContain('發現新版本')

    const updateBtn = wrapper.find('[data-testid="pwa-update-btn"]')
    await updateBtn.trigger('click')
    expect(mockUpdateSW).toHaveBeenCalledWith(true)

    const dismissBtn = wrapper.find('[data-testid="pwa-dismiss-btn"]')
    await dismissBtn.trigger('click')
    expect(needRefresh.value).toBe(false)
  })

  it('should display offline ready toast when offlineReady is true', async () => {
    const wrapper = mount(App)
    offlineReady.value = true
    await wrapper.vm.$nextTick()

    const offlineToast = wrapper.find('[data-testid="pwa-offline-toast"]')
    expect(offlineToast.exists()).toBe(true)
    expect(offlineToast.text()).toContain('已可離線使用')

    const dismissBtn = wrapper.find('[data-testid="pwa-offline-dismiss-btn"]')
    await dismissBtn.trigger('click')
    expect(offlineReady.value).toBe(false)
  })
})
