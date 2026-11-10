<template>
  <div class="streak-milestone-card" data-testid="streak-milestone-card">
    <div class="streak-header" data-testid="streak-display">
      <span class="streak-fire-icon" aria-hidden="true">🔥</span>
      <div class="streak-info">
        <span class="streak-label">連續學習</span>
        <span class="streak-count" data-testid="streak-days-text">{{ currentStreak }} 天</span>
      </div>
    </div>

    <!-- 每連續 10 天達成里程碑展示勳章與恭賀文案 -->
    <div
      v-if="hasMilestone"
      class="milestone-badge-box"
      data-testid="milestone-badge"
    >
      <div class="milestone-badge-icon" aria-hidden="true">🏅</div>
      <div class="milestone-content">
        <div class="milestone-title" data-testid="milestone-title">
          {{ milestoneBadgeTitle }}（{{ milestoneCount }} 天勳章）
        </div>
        <p class="milestone-congrats" data-testid="milestone-congrats">
          恭喜達成 {{ milestoneCount }} 天連續學習里程碑！
        </p>
      </div>
    </div>

    <!-- 未達 10 天里程碑提示 -->
    <div v-else class="streak-encourage" data-testid="streak-encourage">
      距離下個里程碑（10 天）還差 {{ daysToNextMilestone }} 天，繼續加油！
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useDashboardStore } from '../../stores/dashboardStore';

const props = defineProps<{
  streak?: number;
}>();

const store = useDashboardStore();

const currentStreak = computed(() => {
  return props.streak !== undefined ? props.streak : store.streakDays;
});

const milestoneCount = computed(() => {
  return Math.floor(currentStreak.value / 10) * 10;
});

const hasMilestone = computed(() => {
  return milestoneCount.value >= 10;
});

const daysToNextMilestone = computed(() => {
  if (currentStreak.value < 10) {
    return 10 - currentStreak.value;
  }
  return 10 - (currentStreak.value % 10);
});

const milestoneBadgeTitle = computed(() => {
  const count = milestoneCount.value;
  if (count >= 50) return '半百傳奇';
  if (count >= 40) return '毅力非凡';
  if (count >= 30) return '卓越習慣';
  if (count >= 20) return '持之以恆';
  if (count >= 10) return '初試啼聲';
  return '學習萌芽';
});
</script>

<style scoped>
.streak-milestone-card {
  background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
  border: 1px solid #fed7aa;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(249, 115, 22, 0.08);
}

.streak-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.streak-fire-icon {
  font-size: 2.25rem;
  line-height: 1;
}

.streak-info {
  display: flex;
  flex-direction: column;
}

.streak-label {
  font-size: 0.85rem;
  color: #9a3412;
  font-weight: 500;
}

.streak-count {
  font-size: 1.5rem;
  font-weight: 800;
  color: #ea580c;
}

.milestone-badge-box {
  margin-top: 12px;
  background: #ffffff;
  border: 1px solid #fdba74;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  animation: pulse-glow 2s infinite ease-in-out;
}

.milestone-badge-icon {
  font-size: 1.75rem;
  line-height: 1;
}

.milestone-content {
  flex: 1;
}

.milestone-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #c2410c;
}

.milestone-congrats {
  font-size: 0.85rem;
  color: #4b5563;
  margin: 2px 0 0;
}

.streak-encourage {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #9a3412;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(234, 88, 12, 0.2);
  }
  50% {
    box-shadow: 0 0 10px 2px rgba(234, 88, 12, 0.25);
  }
}
</style>
