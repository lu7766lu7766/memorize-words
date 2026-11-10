<template>
  <div class="home-view" data-testid="home-view">
    <!-- 頂部連續學習天數與里程碑勳章 -->
    <StreakMilestone />

    <!-- 防積壓警示橫幅（待複習 > 50 時顯示） -->
    <BacklogAlert />

    <!-- 複習與新字進度計數看板 -->
    <ReviewCounter />

    <!-- 三大核心學習入口按鈕 -->
    <section class="action-section" aria-label="學習模式入口">
      <h2 class="section-heading">開始學習</h2>
      <div class="action-grid">
        <button
          type="button"
          class="action-btn btn-review"
          data-testid="start-review-btn"
          @click="handleStartReview"
        >
          <span class="btn-icon" aria-hidden="true">📖</span>
          <div class="btn-text-group">
            <span class="btn-primary-text">開始今日複習</span>
            <span class="btn-sub-text">
              {{ store.todayDueCount > 0 ? `${store.todayDueCount} 個單字待複習` : '今日已全數清空' }}
            </span>
          </div>
        </button>

        <button
          type="button"
          class="action-btn btn-new-words"
          data-testid="start-new-words-btn"
          @click="handleStartNewWords"
        >
          <span class="btn-icon" aria-hidden="true">✨</span>
          <div class="btn-text-group">
            <span class="btn-primary-text">學習今日新字</span>
            <span class="btn-sub-text">
              每日配額 {{ store.dailyNewLimit }} 個
            </span>
          </div>
        </button>

        <button
          type="button"
          class="action-btn btn-mistakes"
          data-testid="start-mistakes-btn"
          @click="handleStartMistakes"
        >
          <span class="btn-icon" aria-hidden="true">🎯</span>
          <div class="btn-text-group">
            <span class="btn-primary-text">錯題快速複習</span>
            <span class="btn-sub-text">針對頑固字與近期錯題專項強化</span>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useDashboardStore } from '../stores/dashboardStore';
import StreakMilestone from '../components/dashboard/StreakMilestone.vue';
import BacklogAlert from '../components/dashboard/BacklogAlert.vue';
import ReviewCounter from '../components/dashboard/ReviewCounter.vue';

const props = defineProps<{
  onStartReview?: () => void;
  onStartNewWords?: () => void;
  onStartMistakes?: () => void;
  onNavigate?: (target: string) => void;
}>();

const emit = defineEmits<{
  (e: 'start-review'): void;
  (e: 'start-new-words'): void;
  (e: 'start-mistakes'): void;
  (e: 'navigate', target: string): void;
}>();

const store = useDashboardStore();

onMounted(async () => {
  await store.loadDashboardData();
});

const handleStartReview = () => {
  emit('start-review');
  emit('navigate', 'review');
};

const handleStartNewWords = () => {
  emit('start-new-words');
  emit('navigate', 'new-words');
};

const handleStartMistakes = () => {
  emit('start-mistakes');
  emit('navigate', 'mistakes');
};
</script>

<style scoped>
.home-view {
  max-width: 600px;
  margin: 0 auto;
  padding: 16px;
}

.action-section {
  margin-top: 20px;
}

.section-heading {
  font-size: 1.1rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 12px;
}

.action-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-radius: 14px;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  min-height: 72px;
}

.action-btn:active {
  transform: scale(0.98);
}

.btn-icon {
  font-size: 1.75rem;
  line-height: 1;
}

.btn-text-group {
  display: flex;
  flex-direction: column;
}

.btn-primary-text {
  font-size: 1.05rem;
  font-weight: 700;
}

.btn-sub-text {
  font-size: 0.8rem;
  margin-top: 2px;
  opacity: 0.85;
}

.btn-review {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.btn-new-words {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
}

.btn-mistakes {
  background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
}
</style>
