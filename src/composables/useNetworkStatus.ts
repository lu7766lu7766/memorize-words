/**
 * 網路連線狀態與離線語音檢測 Composable
 * 遵循 TASK-11 規格
 */
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue';
import { isSpeechSupported } from '../services/speech';

export const OFFLINE_MESSAGE = '離線模式中，詞庫與學習功能完全正常運作';
export const VOICE_WARNING_MESSAGE = '目前離線，裝置無內建英文語音，發音功能可能受限';

export function useNetworkStatus() {
  const isOnline = ref<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const isOffline = computed(() => !isOnline.value);

  // 語音可用性與本機語音套件檢測
  const hasLocalVoice = ref<boolean>(true);
  const isVoiceChecked = ref<boolean>(false);

  const checkSpeechAvailability = async () => {
    if (typeof window === 'undefined') {
      hasLocalVoice.value = false;
      isVoiceChecked.value = true;
      return;
    }

    if (!isSpeechSupported()) {
      hasLocalVoice.value = false;
      isVoiceChecked.value = true;
      return;
    }

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    if (!voices || voices.length === 0) {
      // 容錯等待 voiceschanged 非同步事件
      await new Promise<void>((resolve) => {
        const handler = () => {
          synth.removeEventListener('voiceschanged', handler);
          resolve();
        };
        synth.addEventListener('voiceschanged', handler);
        setTimeout(() => {
          synth.removeEventListener('voiceschanged', handler);
          resolve();
        }, 500);
      });
      voices = synth.getVoices();
    }

    if (!voices || voices.length === 0) {
      hasLocalVoice.value = false;
      isVoiceChecked.value = true;
      return;
    }

    // 篩選英文語音套件
    const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
    if (enVoices.length === 0) {
      hasLocalVoice.value = false;
      isVoiceChecked.value = true;
      return;
    }

    // 若瀏覽器支援 localService 屬性則檢查，若無則視為可用
    const hasLocal = enVoices.some((v) => v.localService === true || !('localService' in v));
    hasLocalVoice.value = hasLocal;
    isVoiceChecked.value = true;
  };

  const handleOnline = () => {
    isOnline.value = true;
  };

  const handleOffline = () => {
    isOnline.value = false;
    checkSpeechAvailability();
  };

  const setupListeners = () => {
    if (typeof window !== 'undefined') {
      isOnline.value = navigator.onLine ?? true;
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      checkSpeechAvailability();
    }
  };

  const cleanupListeners = () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    }
  };

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

  const shouldShowVoiceWarning = computed(() => {
    return isOffline.value && isVoiceChecked.value && !hasLocalVoice.value;
  });

  return {
    isOnline,
    isOffline,
    hasLocalVoice,
    isVoiceChecked,
    shouldShowVoiceWarning,
    offlineMessage: OFFLINE_MESSAGE,
    voiceWarningMessage: VOICE_WARNING_MESSAGE,
    checkSpeechAvailability,
    handleOnline,
    handleOffline,
    setupListeners,
    cleanupListeners,
  };
}

