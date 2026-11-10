import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export interface PwaOptions {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
  onRegisterError?: (error: unknown) => void
  registerFn?: (options?: {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void
    onRegisterError?: (error: unknown) => void
  }) => (reloadPage?: boolean) => Promise<void>
}

// Reactive state
export const needRefresh = ref(false)
export const offlineReady = ref(false)

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | undefined

export function initPwa(options: PwaOptions = {}) {
  const register = options.registerFn || registerSW

  try {
    updateSWFn = register({
      immediate: options.immediate ?? true,
      onNeedRefresh() {
        needRefresh.value = true
        options.onNeedRefresh?.()
      },
      onOfflineReady() {
        offlineReady.value = true
        options.onOfflineReady?.()
      },
      onRegistered(r) {
        options.onRegistered?.(r)
      },
      onRegisterError(error) {
        console.error('Service Worker registration error:', error)
        options.onRegisterError?.(error)
      },
    })
  } catch (error) {
    console.warn('PWA registration skipped or failed:', error)
    options.onRegisterError?.(error)
  }

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    dismissUpdate,
    dismissOfflineReady,
  }
}

export async function updateServiceWorker(reloadPage = true): Promise<void> {
  if (updateSWFn) {
    await updateSWFn(reloadPage)
  }
}

export function dismissUpdate(): void {
  needRefresh.value = false
}

export function dismissOfflineReady(): void {
  offlineReady.value = false
}

export function resetPwaState(): void {
  needRefresh.value = false
  offlineReady.value = false
  updateSWFn = undefined
}
