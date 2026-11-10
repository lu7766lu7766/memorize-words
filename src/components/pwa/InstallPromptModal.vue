<template>
  <transition name="fade">
    <div
      v-if="isOpen"
      class="modal-backdrop"
      data-testid="install-modal"
      @click.self="handleDismiss"
    >
      <div
        class="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <!-- 頂部關閉按鈕 -->
        <button
          type="button"
          class="modal-close-btn"
          data-testid="close-btn"
          aria-label="關閉"
          @click="handleDismiss"
        >
          <X :size="20" />
        </button>

        <div class="modal-header">
          <div class="modal-badge-wrapper">
            <span class="app-icon">📚</span>
          </div>
          <h2 id="modal-title" class="modal-title">
            {{ isTargetIOS ? '加到 iPhone / iPad 主畫面' : '安裝「一字不漏」App' }}
          </h2>
          <p class="modal-desc">
            {{ isTargetIOS
              ? '加到主畫面後享有全螢幕 App 體驗，離線可用且複習進度不易被瀏覽器清除。'
              : '安裝至手機桌面，享有獨立全螢幕體驗與極速載入，無網路也能隨時複習。'
            }}
          </p>
        </div>

        <!-- Android 安裝引導區塊 -->
        <div
          v-if="!isTargetIOS"
          class="android-section"
          data-testid="android-install-section"
        >
          <div class="benefits-list">
            <div class="benefit-item">
              <Check class="benefit-icon" :size="16" />
              <span>完全離線背單字，無網路依然順暢</span>
            </div>
            <div class="benefit-item">
              <Check class="benefit-icon" :size="16" />
              <span>桌面一鍵快速開啟，學習不間斷</span>
            </div>
          </div>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-primary"
              data-testid="install-btn"
              @click="handleAndroidInstall"
            >
              <Download class="btn-icon" :size="18" />
              <span>立即安裝 App</span>
            </button>
            <button
              type="button"
              class="btn btn-ghost"
              data-testid="dismiss-btn"
              @click="handleDismiss"
            >
              稍後再說
            </button>
          </div>
        </div>

        <!-- iOS 安裝教學區塊 -->
        <div
          v-else
          class="ios-section"
          data-testid="ios-install-section"
        >
          <ol class="ios-steps">
            <li class="step-item">
              <span class="step-number">1</span>
              <div class="step-content">
                <span class="step-title">點擊 Safari 底部分享圖示</span>
                <span class="step-hint">
                  在螢幕下方工具列找到
                  <Share class="inline-icon" :size="16" />
                  分享按鈕
                </span>
              </div>
            </li>
            <li class="step-item">
              <span class="step-number">2</span>
              <div class="step-content">
                <span class="step-title">向上滑動並選取「加入主畫面」</span>
                <span class="step-hint">
                  向下滾動選單並點選
                  <PlusSquare class="inline-icon" :size="16" />
                  加入主畫面
                </span>
              </div>
            </li>
            <li class="step-item">
              <span class="step-number">3</span>
              <div class="step-content">
                <span class="step-title">點擊右上角「新增」</span>
                <span class="step-hint">完成安裝，之後即可由主畫面一鍵開啟</span>
              </div>
            </li>
          </ol>

          <div class="modal-actions">
            <button
              type="button"
              class="btn btn-primary"
              data-testid="dismiss-btn"
              @click="handleDismiss"
            >
              我知道了
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { X, Download, Share, PlusSquare, Check } from 'lucide-vue-next';
import { usePwaInstall } from '../../composables/usePwaInstall';

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    forceIOS?: boolean;
    forceAndroid?: boolean;
  }>(),
  {
    modelValue: undefined,
    forceIOS: false,
    forceAndroid: false,
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'installed'): void;
  (e: 'dismiss'): void;
  (e: 'close'): void;
}>();

const {
  isIOS,
  shouldShowPrompt,
  showIosGuide,
  triggerInstallPrompt,
  dismissPrompt,
} = usePwaInstall();

// 是否開啟：支援外部 v-model 或 composable 自動判定
const isOpen = computed(() => {
  if (typeof props.modelValue === 'boolean') {
    return props.modelValue;
  }
  return shouldShowPrompt.value || showIosGuide.value;
});

// 是否渲染 iOS 教學
const isTargetIOS = computed(() => {
  if (props.forceIOS) return true;
  if (props.forceAndroid) return false;
  return isIOS.value || showIosGuide.value;
});

const handleAndroidInstall = async () => {
  const result = await triggerInstallPrompt();
  if (result && result.outcome === 'accepted') {
    emit('installed');
    emit('update:modelValue', false);
  }
};

const handleDismiss = () => {
  dismissPrompt();
  emit('dismiss');
  emit('close');
  emit('update:modelValue', false);
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;
    padding: 16px;
  }
}

.modal-sheet {
  background-color: #ffffff;
  width: 100%;
  max-width: 440px;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 24px 20px max(24px, env(safe-area-inset-bottom));
  box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.15);
  position: relative;
  box-sizing: border-box;
  animation: slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 640px) {
  .modal-sheet {
    border-radius: 20px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
    animation: zoom-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
}

.modal-close-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  background: transparent;
  border: none;
  color: #64748b;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.15s ease;
}

.modal-close-btn:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.modal-header {
  text-align: center;
  margin-bottom: 20px;
}

.modal-badge-wrapper {
  margin: 0 auto 12px;
  width: 52px;
  height: 52px;
  background-color: #eff6ff;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #bfdbfe;
}

.app-icon {
  font-size: 26px;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 6px;
}

.modal-desc {
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.45;
  margin: 0;
  padding: 0 8px;
}

.benefits-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background-color: #f8fafc;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.875rem;
  color: #334155;
}

.benefit-icon {
  color: #10b981;
  flex-shrink: 0;
}

.ios-steps {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background-color: #f8fafc;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
}

.step-number {
  background-color: #2563eb;
  color: #ffffff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.step-hint {
  font-size: 0.775rem;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.inline-icon {
  color: #2563eb;
  vertical-align: middle;
}

.modal-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  font-size: 0.95rem;
  font-weight: 600;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid transparent;
  gap: 8px;
}

.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-ghost {
  background-color: transparent;
  color: #64748b;
}

.btn-ghost:hover {
  background-color: #f1f5f9;
  color: #334155;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes zoom-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>

