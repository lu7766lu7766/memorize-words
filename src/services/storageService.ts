/**
 * 高中生背單字 PWA「一字不漏」- 瀏覽器持久儲存與平台環境偵測服務 (TASK-05)
 */

import type { StorageQuotaInfo, PlatformInfo } from '../types/backup';

/**
 * 請求瀏覽器持久儲存 (Persistent Storage)
 * 避免 Safari / Chrome 因磁碟空間或閒置策略主動清除 IndexedDB
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage) {
      return false;
    }

    // 若已處於持久儲存狀態，直接回傳 true
    if (typeof navigator.storage.persisted === 'function') {
      const isAlreadyPersisted = await navigator.storage.persisted();
      if (isAlreadyPersisted) {
        return true;
      }
    }

    // 呼叫 persist() 請求持久儲存授權
    if (typeof navigator.storage.persist === 'function') {
      const granted = await navigator.storage.persist();
      return Boolean(granted);
    }

    return false;
  } catch (error) {
    console.warn('requestPersistentStorage failed safely:', error);
    return false;
  }
}

/**
 * 取得本機儲存空間配額與已使用量估算
 */
export async function getStorageQuota(): Promise<StorageQuotaInfo | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage || typeof navigator.storage.estimate !== 'function') {
      return null;
    }

    const estimate = await navigator.storage.estimate();
    const usedBytes = estimate.usage ?? 0;
    const quotaBytes = estimate.quota ?? 0;

    let percentUsed = 0;
    if (quotaBytes > 0) {
      percentUsed = Number(((usedBytes / quotaBytes) * 100).toFixed(2));
    }

    return {
      usedBytes,
      quotaBytes,
      percentUsed,
    };
  } catch (error) {
    console.warn('getStorageQuota failed safely:', error);
    return null;
  }
}

/**
 * 平台環境偵測：iOS、Android、是否已加入主畫面 (PWA Standalone)
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isStandalone: false,
    };
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';
  const maxTouchPoints = navigator.maxTouchPoints || 0;

  // iOS 偵測：包含 iPhone, iPod, iPad 以及 iPadOS 在桌面模式 (回報 MacIntel 且具觸控點)
  const isIOS = /iPad|iPhone|iPod/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);

  // Android 偵測
  const isAndroid = /Android/i.test(ua);

  // Standalone PWA 模式判定
  let isStandalone = false;

  // 1. 標準 CSS 媒體查詢 display-mode: standalone
  if (typeof window.matchMedia === 'function') {
    try {
      isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    } catch {
      // ignore
    }
  }

  // 2. iOS Safari 專有 navigator.standalone
  if (!isStandalone && 'standalone' in navigator && Boolean((navigator as unknown as { standalone?: boolean }).standalone)) {
    isStandalone = true;
  }

  return {
    isIOS,
    isAndroid,
    isStandalone,
  };
}
