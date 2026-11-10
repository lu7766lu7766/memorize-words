<template>
  <div class="review-counter-card" data-testid="review-counter-card">
    <div class="counter-section review-section" data-testid="review-progress">
      <div class="section-header">
        <span class="section-title">🔄 今日複習進度</span>
        <span class="section-values" data-testid="review-values-text">
          已完成 {{ effectiveReviewed }} / 待複習 {{ effectiveDue }}
        </span>
      </div>
      <div class="progress-track" role="progressbar" :aria-valuenow="reviewPercent" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar progress-bar-review" :style="{ width: `${reviewPercent}%` }"></div>
      </div>
      <div class="progress-meta">
        <span>完成度 {{ reviewPercent }}%</span>
      </div>
    </div>

    <div class="counter-section new-section" data-testid="new-words-progress">
      <div class="section-header">
        <span class="section-title">🌱 今日新字進度</span>
        <span class="section-values" data-testid="new-values-text">
          已學習 {{ effectiveNewLearned }} / 上限 {{ effectiveNewLimit }} 個
        </span>
      </div>
      <div class="progress-track" role="progressbar" :aria-valuenow="newPercent" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar progress-bar-new" :style="{ width: `${newPercent}%` }"></div>
      </div>
      <div class="progress-meta">
        <span class="default-limit-hint">每日新字上限預設 {{ effectiveNewLimit }} 個</span>
        <span class="percent-label">{{ newPercent }}%</span>
      </div>
    </div>

    <div class="tip-box" data-testid="mistake-quota-tip">
      <span class="tip-icon" aria-hidden="true">💡</span>
      <span class="tip-text">貼心提示：錯題複習不占新字額度</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '../../stores/dashboardStore';

const props = defineProps<{
  reviewedCount?: number;
  dueCount?: number;
  newLearnedCount?: number;
  newLimit?: number;
}>();

const store = useDashboardStore();

const effectiveReviewed = computed(() => {
  return props.reviewedCount !== undefined ? props.reviewedCount : store.todayReviewedCount;
});

const effectiveDue = computed(() => {
  return props.dueCount !== undefined ? props.dueCount : store.todayDueCount;
});

const effectiveNewLearned = computed(() => {
  return props.newLearnedCount !== undefined ? props.newLearnedCount : store.todayNewLearnedCount;
});

const effectiveNewLimit = computed(() => {
  return props.newLimit !== undefined ? props.newLimit : store.dailyNewLimit;
});

const reviewTotal = computed(() => effectiveReviewed.value + effectiveDue.value);

const reviewPercent = computed(() => {
  if (reviewTotal.value === 0) return 100;
  return Math.min(100, Math.round((effectiveReviewed.value / reviewTotal.value) * 100));
});

const newPercent = computed(() => {
  if (effectiveNewLimit.value <= 0) return 100;
  return Math.min(100, Math.round((effectiveNewLearned.value / effectiveNewLimit.value) * 100));
});
</script>

<style scoped>
.review-counter-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.counter-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-title {
  font-weight: 700;
  font-size: 0.95rem;
  color: #1f2937;
}

.section-values {
  font-size: 0.85rem;
  color: #4b5563;
  font-weight: 500;
}

.progress-track {
  width: 100%;
  height: 10px;
  background: #f3f4f6;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.3s ease;
}

.progress-bar-review {
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
}

.progress-bar-new {
  background: linear-gradient(90deg, #10b981 0%, #059669 100%);
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 4px;
}

.default-limit-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.tip-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #eff6ff;
  border: 1px dashed #bfdbfe;
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.825rem;
  color: #1e40af;
}

.tip-icon {
  font-size: 1rem;
}
</style>
