<template>
  <nav class="bottom-nav" role="navigation" aria-label="主要底部導覽" data-testid="bottom-nav">
    <div class="nav-container">
      <button
        v-for="tab in navTabs"
        :key="tab.id"
        type="button"
        class="nav-item"
        :class="{ active: activeTab === tab.id }"
        :data-testid="tab.testId"
        :aria-selected="activeTab === tab.id"
        role="tab"
        @click="selectTab(tab.id)"
      >
        <div class="icon-wrapper">
          <component :is="tab.icon" :size="22" class="nav-icon" aria-hidden="true" />
          <span v-if="tab.badge" class="nav-badge">{{ tab.badge }}</span>
        </div>
        <span class="nav-label">{{ tab.label }}</span>
      </button>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Home, BookOpen, BookX, Settings } from 'lucide-vue-next';

export interface NavTabItem {
  id: string;
  label: string;
  icon: typeof Home;
  testId: string;
  badge?: string | number;
}

const props = withDefaults(
  defineProps<{
    currentTab?: string;
    modelValue?: string;
  }>(),
  {
    currentTab: undefined,
    modelValue: undefined,
  }
);

const emit = defineEmits<{
  (e: 'update:currentTab', tabId: string): void;
  (e: 'update:modelValue', tabId: string): void;
  (e: 'change', tabId: string): void;
  (e: 'navigate', tabId: string): void;
}>();

const activeTab = computed(() => {
  return props.currentTab || props.modelValue || 'dashboard';
});

const navTabs: NavTabItem[] = [
  {
    id: 'dashboard',
    label: '首頁',
    icon: Home,
    testId: 'nav-dashboard',
  },
  {
    id: 'practice',
    label: '練習',
    icon: BookOpen,
    testId: 'nav-practice',
  },
  {
    id: 'notebook',
    label: '錯題本',
    icon: BookX,
    testId: 'nav-notebook',
  },
  {
    id: 'settings',
    label: '設定',
    icon: Settings,
    testId: 'nav-settings',
  },
];

const selectTab = (tabId: string) => {
  emit('update:currentTab', tabId);
  emit('update:modelValue', tabId);
  emit('change', tabId);
  emit('navigate', tabId);
};
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  z-index: 40;
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.nav-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  max-width: 640px;
  margin: 0 auto;
  height: 58px;
  padding: 0 4px;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* 觸控熱區 >= 48px */
  min-width: 48px;
  min-height: 48px;
  padding: 4px 0;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  border-radius: 8px;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.nav-item:active {
  transform: scale(0.96);
}

.icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-icon {
  transition: color 0.15s ease, transform 0.15s ease;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  margin-top: 3px;
  line-height: 1;
  transition: color 0.15s ease, font-weight 0.15s ease;
}

/* 啟用啟用狀態高亮 */
.nav-item.active {
  color: #2563eb;
}

.nav-item.active .nav-icon {
  color: #2563eb;
  transform: translateY(-1px);
}

.nav-item.active .nav-label {
  color: #2563eb;
  font-weight: 600;
}

.nav-badge {
  position: absolute;
  top: -4px;
  right: -8px;
  background-color: #ef4444;
  color: #ffffff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}
</style>

