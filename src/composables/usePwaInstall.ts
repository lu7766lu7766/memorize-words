/**
 * PWA 安裝引導 Composable
 * 遵循 TASK-11 規格：支援 Android beforeinstallprompt 快取、iOS Safari 導引與 localStorage 略過狀態持久化
 */
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const INSTALL_DISMISSED_STORAGE_KEY = 'yizi_bulou_install_dismissed';

export function checkIsStandalone(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  // 1. 標準 CSS 媒體查詢
  if (typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
      }
    } catch {
      // 忽略錯誤
    }
  }
  // 2. iOS Safari navigator.standalone
  if ('standalone' in navigator && Boolean((navigator as unknown as { standalone?: boolean }).standalone)) {
    return true;
  }
  return false;
}

export function checkIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  return /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function checkIsAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android/i.test(ua);
}

export function usePwaInstall() {
  const isStandalone = ref<boolean>(checkIsStandalone());
  const isIOS = ref<boolean>(checkIsIOS());
  const isAndroid = ref<boolean>(checkIsAndroid());
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const isInstalled = ref<boolean>(false);
  const showIosGuide = ref<boolean>(false);

  // 讀取略過狀態
  const readDismissedFromStorage = (): boolean => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return window.localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY) === 'true';
      } catch {
        return false;
      }
    }
    return false;
  };

  const isDismissed = ref<boolean>(readDismissedFromStorage());

  const canPromptInstall = computed(() => Boolean(deferredPrompt.value));

  // 是否應該顯示安裝提示（未安裝、未略過且具備提示條件）
  const shouldShowPrompt = computed(() => {
    if (isStandalone.value || isInstalled.value || isDismissed.value) {
      return false;
    }
    return canPromptInstall.value || isIOS.value;
  });

  // 監聽 beforeinstallprompt
  const handleBeforeInstallPrompt = (e: Event) => {
    e.preventDefault();
    deferredPrompt.value = e as BeforeInstallPromptEvent;
  };

  // 監聽 appinstalled
  const handleAppInstalled = () => {
    isInstalled.value = true;
    deferredPrompt.value = null;
    isStandalone.value = true;
  };

  const setupListeners = () => {
    if (typeof window !== 'undefined') {
      isStandalone.value = checkIsStandalone();
      isIOS.value = checkIsIOS();
      isAndroid.value = checkIsAndroid();
      isDismissed.value = readDismissedFromStorage();

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    }
  };

  const cleanupListeners = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    }
  };

  // 在組件生命週期中掛載與卸載
  if (typeof window !== 'undefined') {
    setupListeners();
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      setupListeners();
    });
    onUnmounted(() => {
      cleanupListeners();
    });
  }

  /**
   * 觸發原生安裝對話框（Android / Chrome）
   */
  const triggerInstallPrompt = async (): Promise<{ outcome: 'accepted' | 'dismissed' } | null> => {
    if (!deferredPrompt.value) {
      return null;
    }
    try {
      await deferredPrompt.value.prompt();
      const choice = await deferredPrompt.value.userChoice;
      if (choice.outcome === 'accepted') {
        isInstalled.value = true;
      }
      deferredPrompt.value = null;
      return choice;
    } catch (error) {
      console.warn('triggerInstallPrompt error:', error);
      return null;
    }
  };

  /**
   * 略過安裝提示並持久化至 localStorage
   */
  const dismissPrompt = () => {
    isDismissed.value = true;
    showIosGuide.value = false;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(INSTALL_DISMISSED_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }
  };

  /**
   * 重設略過狀態（供設定頁重新啟用或測試）
   */
  const resetDismissed = () => {
    isDismissed.value = false;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(INSTALL_DISMISSED_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const openIosGuide = () => {
    showIosGuide.value = true;
  };

  const closeIosGuide = () => {
    showIosGuide.value = false;
  };

  return {
    isStandalone,
    isIOS,
    isAndroid,
    deferredPrompt,
    isInstalled,
    isDismissed,
    showIosGuide,
    canPromptInstall,
    shouldShowPrompt,
    triggerInstallPrompt,
    dismissPrompt,
    resetDismissed,
    openIosGuide,
    closeIosGuide,
    setupListeners,
    cleanupListeners,
    handleBeforeInstallPrompt,
  };
}

