import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  requestPersistentStorage,
  getStorageQuota,
  detectPlatform,
} from '../src/services/storageService';

describe('Storage Service (TASK-05)', () => {
  const originalNavigator = globalThis.navigator;
  const originalWindow = globalThis.window;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('requestPersistentStorage', () => {
    it('應在已經取得持久儲存 (persisted=true) 時直接回傳 true', async () => {
      const persistedMock = vi.fn().mockResolvedValue(true);
      const persistMock = vi.fn();

      vi.stubGlobal('navigator', {
        storage: {
          persisted: persistedMock,
          persist: persistMock,
        },
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(true);
      expect(persistedMock).toHaveBeenCalledOnce();
      expect(persistMock).not.toHaveBeenCalled();
    });

    it('應在尚未持久但 persist() 授權成功時回傳 true', async () => {
      const persistedMock = vi.fn().mockResolvedValue(false);
      const persistMock = vi.fn().mockResolvedValue(true);

      vi.stubGlobal('navigator', {
        storage: {
          persisted: persistedMock,
          persist: persistMock,
        },
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(true);
      expect(persistedMock).toHaveBeenCalledOnce();
      expect(persistMock).toHaveBeenCalledOnce();
    });

    it('應在 persist() 被拒絕時回傳 false', async () => {
      const persistedMock = vi.fn().mockResolvedValue(false);
      const persistMock = vi.fn().mockResolvedValue(false);

      vi.stubGlobal('navigator', {
        storage: {
          persisted: persistedMock,
          persist: persistMock,
        },
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(false);
    });

    it('在瀏覽器不支援 navigator.storage 時應安全降級回傳 false，不拋出未捕獲例外', async () => {
      vi.stubGlobal('navigator', {});

      const result = await requestPersistentStorage();
      expect(result).toBe(false);
    });

    it('在 navigator.storage.persist 拋出例外時應捕獲並安全回傳 false', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          persisted: vi.fn().mockRejectedValue(new Error('Storage permission error')),
          persist: vi.fn(),
        },
      });

      const result = await requestPersistentStorage();
      expect(result).toBe(false);
    });
  });

  describe('getStorageQuota', () => {
    it('應正確計算儲存空間配額與使用百分比', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 50 * 1024 * 1024, // 50MB
            quota: 200 * 1024 * 1024, // 200MB
          }),
        },
      });

      const quota = await getStorageQuota();
      expect(quota).not.toBeNull();
      expect(quota?.usedBytes).toBe(52428800);
      expect(quota?.quotaBytes).toBe(209715200);
      expect(quota?.percentUsed).toBe(25);
    });

    it('在配額為 0 時應回傳 percentUsed 為 0', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockResolvedValue({
            usage: 0,
            quota: 0,
          }),
        },
      });

      const quota = await getStorageQuota();
      expect(quota).not.toBeNull();
      expect(quota?.percentUsed).toBe(0);
    });

    it('在不支援 estimate 時應回傳 null', async () => {
      vi.stubGlobal('navigator', {
        storage: {},
      });

      const quota = await getStorageQuota();
      expect(quota).toBeNull();
    });

    it('在 estimate 拋出例外時應回傳 null', async () => {
      vi.stubGlobal('navigator', {
        storage: {
          estimate: vi.fn().mockRejectedValue(new Error('Quota estimate failure')),
        },
      });

      const quota = await getStorageQuota();
      expect(quota).toBeNull();
    });
  });

  describe('detectPlatform', () => {
    it('應正確辨識 iOS iPhone 裝置', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
        maxTouchPoints: 5,
      });

      const result = detectPlatform();
      expect(result.isIOS).toBe(true);
      expect(result.isAndroid).toBe(false);
      expect(result.isStandalone).toBe(false);
    });

    it('應正確辨識 iPadOS 桌面模式 (MacIntel + maxTouchPoints > 1)', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      });

      const result = detectPlatform();
      expect(result.isIOS).toBe(true);
      expect(result.isAndroid).toBe(false);
    });

    it('應正確辨識 Android 裝置', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      });

      const result = detectPlatform();
      expect(result.isIOS).toBe(false);
      expect(result.isAndroid).toBe(true);
    });

    it('應正確透過 matchMedia 偵測 display-mode: standalone', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 13)',
        maxTouchPoints: 5,
      });

      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(display-mode: standalone)',
          media: query,
        })),
      });

      const result = detectPlatform();
      expect(result.isStandalone).toBe(true);
    });

    it('應正確透過 iOS Safari 專屬 navigator.standalone 偵測獨立視窗模式', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
        standalone: true,
      });

      vi.stubGlobal('window', {
        matchMedia: vi.fn().mockReturnValue({ matches: false }),
      });

      const result = detectPlatform();
      expect(result.isIOS).toBe(true);
      expect(result.isStandalone).toBe(true);
    });
  });
});
