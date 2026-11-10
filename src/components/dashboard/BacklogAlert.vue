<template>
  <div
    v-if="showAlert"
    class="backlog-alert"
    role="alert"
    data-testid="backlog-alert"
  >
    <div class="alert-icon" aria-hidden="true">⚠️</div>
    <div class="alert-body">
      <div class="alert-title">待複習量提醒（目前 {{ effectiveDueCount }} 個待複習）</div>
      <p class="alert-message" data-testid="alert-message">
        今日待複習單字較多，建議先暫停新字，專注清空複習，避免積壓！
      </p>
      <div class="alert-actions">
        <button
          type="button"
          class="btn-pause-new"
          data-testid="pause-new-words-btn"
          @click="handlePauseNewWords"
        >
          暫停今日新字
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '../../stores/dashboardStore';

const props = defineProps<{
  dueCount?: number;
  threshold?: number;
}>();

const emit = defineEmits<{
  (e: 'pause-new-words'): void;
}>();

const store = useDashboardStore();

const effectiveDueCount = computed(() => {
  return props.dueCount !== undefined ? props.dueCount : store.todayDueCount;
});

const effectiveThreshold = computed(() => {
  return props.threshold !== undefined ? props.threshold : store.backlogThreshold;
});

const showAlert = computed(() => {
  return effectiveDueCount.value > effectiveThreshold.value;
});

const handlePauseNewWords = () => {
  store.pauseTodayNewWords();
  emit('pause-new-words');
};
</script>

<style scoped>
.backlog-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-left: 5px solid #ef4444;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 16px;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.08);
}

.alert-icon {
  font-size: 1.5rem;
  line-height: 1;
}

.alert-body {
  flex: 1;
}

.alert-title {
  font-weight: 700;
  color: #991b1b;
  font-size: 0.95rem;
  margin-bottom: 4px;
}

.alert-message {
  font-size: 0.85rem;
  color: #b91c1c;
  line-height: 1.4;
  margin: 0 0 10px 0;
}

.alert-actions {
  display: flex;
  gap: 8px;
}

.btn-pause-new {
  background: #dc2626;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-pause-new:hover {
  background: #b91c1c;
}
</style>
