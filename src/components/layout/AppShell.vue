<template>
  <div class="app-shell" data-testid="app-shell">
    <!-- 頂部離線橫幅提示 -->
    <OfflineBanner />

    <!-- 頂部導覽列 / 頁首 -->
    <header v-if="$slots.header || title" class="shell-header">
      <div class="header-content">
        <slot name="header">
          <div class="header-default">
            <h1 class="header-title">{{ title || '一字不漏' }}</h1>
            <span v-if="subtitle" class="header-badge">{{ subtitle }}</span>
          </div>
        </slot>
      </div>
    </header>

    <!-- 主要內容滾動區塊 -->
    <main class="shell-main" :class="{ 'with-nav': showNav }">
      <div class="main-container">
        <slot></slot>
      </div>
    </main>

    <!-- 底部導覽列 -->
    <BottomNav
      v-if="showNav"
      :current-tab="currentTab"
      @navigate="handleNavigate"
      @update:current-tab="handleTabUpdate"
    />

    <!-- PWA 安裝導引彈窗 -->
    <InstallPromptModal
      v-if="enableInstallPrompt"
      v-model="showInstallModal"
      @installed="handleInstalled"
      @dismiss="handleInstallDismiss"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import OfflineBanner from '../pwa/OfflineBanner.vue';
import BottomNav from './BottomNav.vue';
import InstallPromptModal from '../pwa/InstallPromptModal.vue';

const props = withDefaults(
  defineProps<{
    title?: string;
    subtitle?: string;
    currentTab?: string;
    showNav?: boolean;
    enableInstallPrompt?: boolean;
  }>(),
  {
    title: '',
    subtitle: '',
    currentTab: 'dashboard',
    showNav: true,
    enableInstallPrompt: true,
  }
);

const emit = defineEmits<{
  (e: 'update:currentTab', tabId: string): void;
  (e: 'navigate', tabId: string): void;
}>();

const showInstallModal = ref<boolean | undefined>(undefined);

const handleNavigate = (tabId: string) => {
  emit('navigate', tabId);
};

const handleTabUpdate = (tabId: string) => {
  emit('update:currentTab', tabId);
};

const handleInstalled = () => {
  showInstallModal.value = false;
};

const handleInstallDismiss = () => {
  showInstallModal.value = false;
};
</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  color: #0f172a;
  box-sizing: border-box;
  padding-top: env(safe-area-inset-top, 0px);
  position: relative;
}

.shell-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 30;
}

.header-content {
  max-width: 640px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-default {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.header-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.01em;
}

.header-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid #bfdbfe;
}

.shell-main {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
}

.shell-main.with-nav {
  /* 預留底部導航欄高度與安全邊距，防止內容被遮蔽 */
  padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px));
}

.main-container {
  max-width: 640px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}
</style>

