<template>
  <transition name="slide-down">
    <aside
      v-if="isOffline"
      class="offline-banner"
      role="status"
      aria-live="polite"
      data-testid="offline-banner"
    >
      <div class="banner-inner">
        <div class="banner-row main-status" data-testid="offline-message">
          <WifiOff class="icon status-icon" :size="16" aria-hidden="true" />
          <span class="status-text">{{ offlineMessage }}</span>
        </div>

        <div
          v-if="shouldShowVoiceWarning"
          class="banner-row voice-warning"
          data-testid="offline-voice-warning"
        >
          <VolumeX class="icon warning-icon" :size="14" aria-hidden="true" />
          <span class="warning-text">{{ voiceWarningMessage }}</span>
        </div>
      </div>
    </aside>
  </transition>
</template>

<script setup lang="ts">
import { WifiOff, VolumeX } from 'lucide-vue-next';
import { useNetworkStatus } from '../../composables/useNetworkStatus';

const {
  isOffline,
  shouldShowVoiceWarning,
  offlineMessage,
  voiceWarningMessage,
} = useNetworkStatus();
</script>

<style scoped>
.offline-banner {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  color: #f8fafc;
  padding: 8px 16px;
  font-size: 13px;
  border-bottom: 1px solid #334155;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 50;
  width: 100%;
  box-sizing: border-box;
}

.banner-inner {
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.banner-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-icon {
  color: #38bdf8;
  flex-shrink: 0;
}

.status-text {
  font-weight: 500;
  line-height: 1.4;
}

.voice-warning {
  color: #fbbf24;
  font-size: 12px;
  padding-left: 2px;
}

.warning-icon {
  flex-shrink: 0;
  color: #fbbf24;
}

.warning-text {
  line-height: 1.3;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease-out;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>

