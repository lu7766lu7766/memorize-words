import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  usePwaInstall,
  checkIsStandalone,
  checkIsIOS,
  checkIsAndroid,
  INSTALL_DISMISSED_STORAGE_KEY,
  type BeforeInstallPromptEvent,
} from '../../src/composables/usePwaInstall';

describe('usePwaInstall Composable (TASK-11)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe('裝置與平台環境辨識 (Platform Detection)', () => {
    it('應能正確偵測標準 display-mode: standalone 模式', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
      })));

      expect(checkIsStandalone()).toBe(true);
    });

    it('應能正確偵測 iOS Safari 的 navigator.standalone 屬性', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
        standalone: true,
      });

      expect(checkIsStandalone()).toBe(true);
    });

    it('一般非獨立視窗瀏覽器應回傳 isStandalone = false', () => {
      vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        standalone: false,
      });

      expect(checkIsStandalone()).toBe(false);
    });

    it('應能正確辨識 iPhone 與 iPad (iOS 環境)', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        platform: 'iPhone',
        maxTouchPoints: 5,
      });

      expect(checkIsIOS()).toBe(true);
      expect(checkIsAndroid()).toBe(false);
    });

    it('應能正確辨識 iPadOS 桌面模式 (MacIntel 且具備多點觸控)', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      });

      expect(checkIsIOS()).toBe(true);
    });

    it('應能正確辨識 Android 裝置', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      });

      expect(checkIsAndroid()).toBe(true);
      expect(checkIsIOS()).toBe(false);
    });
  });

  describe('beforeinstallprompt 事件捕捉與 prompt 觸發', () => {
    it('捕捉 beforeinstallprompt 事件並快取 deferredPrompt', () => {
      const install = usePwaInstall();
      expect(install.canPromptInstall.value).toBe(false);

      const mockPromptEvent = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
      mockPromptEvent.preventDefault = vi.fn();
      Object.assign(mockPromptEvent, {
        prompt: vi.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      });

      window.dispatchEvent(mockPromptEvent);

      expect(mockPromptEvent.preventDefault).toHaveBeenCalled();
      expect(install.canPromptInstall.value).toBe(true);
      expect(install.deferredPrompt.value).toBeTruthy();
      expect(install.deferredPrompt.value?.type).toBe('beforeinstallprompt');
    });

    it('triggerInstallPrompt 應呼叫 prompt() 並處理 userChoice 結果', async () => {
      const install = usePwaInstall();

      const promptSpy = vi.fn().mockResolvedValue(undefined);
      const userChoicePromise = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });

      const mockPromptEvent = new Event('beforeinstallprompt') as BeforeInstallPromptEvent;
      mockPromptEvent.preventDefault = vi.fn();
      mockPromptEvent.prompt = promptSpy;
      (mockPromptEvent as unknown as { userChoice: typeof userChoicePromise }).userChoice = userChoicePromise;

      window.dispatchEvent(mockPromptEvent);
      expect(install.canPromptInstall.value).toBe(true);

      const result = await install.triggerInstallPrompt();

      expect(promptSpy).toHaveBeenCalledOnce();
      expect(result).toEqual({ outcome: 'accepted', platform: 'web' });
      expect(install.isInstalled.value).toBe(true);
      expect(install.deferredPrompt.value).toBeNull();
      expect(install.canPromptInstall.value).toBe(false);
    });

    it('若無 deferredPrompt，triggerInstallPrompt 應安全回傳 null', async () => {
      const install = usePwaInstall();
      install.deferredPrompt.value = null;

      const result = await install.triggerInstallPrompt();
      expect(result).toBeNull();
    });

    it('appinstalled 事件應將 isInstalled 設為 true 並清空 deferredPrompt', () => {
      const install = usePwaInstall();
      install.deferredPrompt.value = {} as BeforeInstallPromptEvent;

      window.dispatchEvent(new Event('appinstalled'));

      expect(install.isInstalled.value).toBe(true);
      expect(install.isStandalone.value).toBe(true);
      expect(install.deferredPrompt.value).toBeNull();
    });
  });

  describe('略過狀態管理 (Dismissal & Persistence)', () => {
    it('dismissPrompt 應將 isDismissed 設為 true 並儲存至 localStorage', () => {
      const install = usePwaInstall();
      expect(install.isDismissed.value).toBe(false);

      install.dismissPrompt();

      expect(install.isDismissed.value).toBe(true);
      expect(window.localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY)).toBe('true');
    });

    it('初始化時若 localStorage 已有略過標記，應讀取為 isDismissed = true', () => {
      window.localStorage.setItem(INSTALL_DISMISSED_STORAGE_KEY, 'true');

      const install = usePwaInstall();
      expect(install.isDismissed.value).toBe(true);
    });

    it('resetDismissed 應清除 localStorage 並將 isDismissed 重設為 false', () => {
      window.localStorage.setItem(INSTALL_DISMISSED_STORAGE_KEY, 'true');
      const install = usePwaInstall();
      expect(install.isDismissed.value).toBe(true);

      install.resetDismissed();

      expect(install.isDismissed.value).toBe(false);
      expect(window.localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY)).toBeNull();
    });

    it('shouldShowPrompt 在已略過或已安裝時應為 false', () => {
      const install = usePwaInstall();
      install.isStandalone.value = false;
      install.isIOS.value = true;
      install.isDismissed.value = false;
      expect(install.shouldShowPrompt.value).toBe(true);

      install.dismissPrompt();
      expect(install.shouldShowPrompt.value).toBe(false);
    });
  });
});

