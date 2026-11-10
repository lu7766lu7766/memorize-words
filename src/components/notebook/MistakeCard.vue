<template>
  <div
    class="mistake-card"
    :class="{ 'is-leech': isLeech }"
    data-testid="mistake-card"
  >
    <!-- Card Header: Word, Badges & Actions -->
    <div class="card-header">
      <div class="word-info">
        <div class="word-title-row">
          <h3 class="word-title" data-testid="word-title">{{ item.word }}</h3>
          <span v-if="item.phonetic" class="word-phonetic" data-testid="word-phonetic">
            {{ formatPhonetic(item.phonetic) }}
          </span>
          <button
            type="button"
            class="speak-btn"
            data-testid="speak-btn"
            title="發音"
            aria-label="發音"
            @click="handleSpeak"
          >
            <span class="speak-icon">🔊</span>
          </button>
        </div>

        <div class="tags-row">
          <span v-if="posDisplay" class="pos-badge" data-testid="word-pos">
            {{ posDisplay }}
          </span>
          <span
            v-if="isLeech"
            class="badge leech-badge"
            data-testid="leech-badge"
          >
            🔥 頑固字
          </span>
          <span class="badge mistake-count-badge" data-testid="mistake-count">
            答錯 {{ errorCount }} 次
          </span>
          <span v-if="categoryBadge" class="badge category-badge">
            {{ categoryBadge }}
          </span>
        </div>
      </div>

      <div class="card-actions">
        <button
          type="button"
          class="remove-btn"
          data-testid="remove-btn"
          title="標記為已克服，自錯題本移除"
          @click="handleRemove"
        >
          ✓ 已克服
        </button>
      </div>
    </div>

    <!-- Definition -->
    <div class="card-body">
      <p class="definition-text" data-testid="word-definition">
        {{ item.definition }}
      </p>
    </div>

    <!-- Expandable Examples Section -->
    <div class="card-footer">
      <button
        type="button"
        class="toggle-examples-btn"
        data-testid="toggle-examples-btn"
        @click="toggleExamples"
      >
        <span>{{ isExpanded ? '收合例句' : '查看例句' }}</span>
        <span class="toggle-arrow">{{ isExpanded ? '▲' : '▼' }}</span>
      </button>

      <div
        v-if="isExpanded"
        class="examples-section"
        data-testid="examples-section"
      >
        <template v-if="hasExamples">
          <div
            v-for="(ex, idx) in formattedExamples"
            :key="idx"
            class="example-item"
          >
            <p class="example-en">{{ ex.en }}</p>
            <p class="example-zh">{{ ex.zh }}</p>
          </div>
        </template>
        <div v-else class="no-examples">
          暫無例句
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { speak } from '../../services/speech';

export interface MistakeItem {
  id: string;
  word: string;
  phonetic?: string;
  pos?: string[] | string;
  definition: string;
  examples?: Array<{ en: string; zh: string }>;
  example?: string;
  exampleTranslation?: string;
  incorrectCount?: number;
  lapses?: number;
  isLeech?: boolean;
  isDifficult?: boolean;
  lastWrongAt?: number | string | Date;
  lastReview?: number | string | Date;
  category?: ('gsat' | 'toeic')[];
  level?: number;
  toeicTier?: 'entry' | 'intermediate' | 'advanced';
  tags?: string[];
}

const props = defineProps<{
  item: MistakeItem;
}>();

const emit = defineEmits<{
  (e: 'speak', word: string): void;
  (e: 'remove', item: MistakeItem): void;
  (e: 'toggleExpand', expanded: boolean): void;
}>();

const isExpanded = ref(false);

const errorCount = computed(() => {
  return props.item.incorrectCount ?? props.item.lapses ?? 0;
});

const isLeech = computed(() => {
  return Boolean(
    props.item.isLeech ||
    props.item.isDifficult ||
    errorCount.value >= 3
  );
});

const posDisplay = computed(() => {
  if (!props.item.pos) return '';
  if (Array.isArray(props.item.pos)) {
    return props.item.pos.join(' ');
  }
  return String(props.item.pos);
});

const categoryBadge = computed(() => {
  const parts: string[] = [];
  if (props.item.category?.includes('gsat')) {
    parts.push(props.item.level ? `學測 L${props.item.level}` : '學測');
  }
  if (props.item.category?.includes('toeic')) {
    const tierMap: Record<string, string> = {
      entry: '入門',
      intermediate: '中階',
      advanced: '進階',
    };
    const tierStr = props.item.toeicTier ? tierMap[props.item.toeicTier] ?? '' : '';
    parts.push(`多益${tierStr}`);
  }
  return parts.join(' · ');
});

const formattedExamples = computed(() => {
  if (props.item.examples && props.item.examples.length > 0) {
    return props.item.examples;
  }
  if (props.item.example) {
    return [
      {
        en: props.item.example,
        zh: props.item.exampleTranslation || '',
      },
    ];
  }
  return [];
});

const hasExamples = computed(() => formattedExamples.value.length > 0);

function formatPhonetic(raw?: string) {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('/') && trimmed.endsWith('/')) {
    return trimmed;
  }
  return `/${trimmed}/`;
}

function handleSpeak() {
  speak(props.item.word).catch(() => {});
  emit('speak', props.item.word);
}

function toggleExamples() {
  isExpanded.value = !isExpanded.value;
  emit('toggleExpand', isExpanded.value);
}

function handleRemove() {
  emit('remove', props.item);
}
</script>

<style scoped>
.mistake-card {
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease-in-out;
}

.mistake-card.is-leech {
  border-left: 4px solid #ef4444;
  background-color: #fffaf0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.word-info {
  flex: 1;
}

.word-title-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.word-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.word-phonetic {
  font-size: 0.875rem;
  color: #64748b;
  font-family: Consolas, monospace;
}

.speak-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #2563eb;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.speak-btn:hover {
  background-color: #eff6ff;
}

.speak-icon {
  font-size: 1rem;
}

.tags-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}

.badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.pos-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  background-color: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

.leech-badge {
  background-color: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  font-weight: 600;
}

.mistake-count-badge {
  background-color: #fef3c7;
  color: #b45309;
}

.category-badge {
  background-color: #e0f2fe;
  color: #0369a1;
}

.card-actions {
  display: flex;
  align-items: center;
}

.remove-btn {
  background-color: #f8fafc;
  border: 1px solid #cbd5e1;
  color: #475569;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.remove-btn:hover {
  background-color: #ecfdf5;
  color: #059669;
  border-color: #a7f3d0;
}

.card-body {
  margin-top: 10px;
}

.definition-text {
  margin: 0;
  font-size: 0.9375rem;
  color: #334155;
  line-height: 1.5;
}

.card-footer {
  margin-top: 12px;
  border-top: 1px dashed #e2e8f0;
  padding-top: 8px;
}

.toggle-examples-btn {
  background: none;
  border: none;
  padding: 4px 0;
  color: #2563eb;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.toggle-examples-btn:hover {
  text-decoration: underline;
}

.toggle-arrow {
  font-size: 0.625rem;
}

.examples-section {
  margin-top: 8px;
  padding: 10px 12px;
  background-color: #f8fafc;
  border-radius: 8px;
  font-size: 0.875rem;
}

.example-item {
  margin-bottom: 8px;
}

.example-item:last-child {
  margin-bottom: 0;
}

.example-en {
  margin: 0;
  color: #1e293b;
  font-style: italic;
}

.example-zh {
  margin: 2px 0 0 0;
  color: #64748b;
  font-size: 0.8125rem;
}

.no-examples {
  color: #94a3b8;
  font-size: 0.8125rem;
}
</style>
