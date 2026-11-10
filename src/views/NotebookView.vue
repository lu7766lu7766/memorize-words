<template>
  <div class="notebook-view" data-testid="notebook-view">
    <!-- Top Header -->
    <header class="notebook-header">
      <div class="header-left">
        <h2 class="page-title">錯題本</h2>
        <span class="page-subtitle">針對答錯單字重點突破</span>
      </div>

      <!-- Start Practice Action -->
      <div class="header-right">
        <button
          type="button"
          class="start-practice-btn"
          data-testid="start-practice-btn"
          :disabled="filteredItems.length === 0"
          @click="handleStartPractice"
        >
          <span class="btn-icon">⚡</span>
          <span>只練錯題 ({{ filteredItems.length }})</span>
        </button>
      </div>
    </header>

    <!-- Stats Dashboard -->
    <section class="stats-dashboard" data-testid="stats-dashboard">
      <div class="stat-card" data-testid="stat-total">
        <div class="stat-label">總錯題數</div>
        <div class="stat-value" data-testid="stat-total-value">{{ totalMistakes }}</div>
      </div>
      <div class="stat-card stat-leech" data-testid="stat-leech">
        <div class="stat-label">頑固字數</div>
        <div class="stat-value text-red" data-testid="stat-leech-value">{{ leechCount }}</div>
      </div>
      <div class="stat-card stat-overcome" data-testid="stat-overcome">
        <div class="stat-label">本週克服數</div>
        <div class="stat-value text-green" data-testid="stat-overcome-value">{{ overcomeCount }}</div>
      </div>
    </section>

    <!-- Quick Tab Switch (All vs Leech Only) -->
    <div class="tab-switcher" data-testid="tab-switcher">
      <button
        type="button"
        class="tab-btn"
        :class="{ active: !filterState.onlyLeech }"
        data-testid="tab-all"
        @click="setLeechTab(false)"
      >
        全體錯題 ({{ totalMistakes }})
      </button>
      <button
        type="button"
        class="tab-btn tab-leech-btn"
        :class="{ active: filterState.onlyLeech }"
        data-testid="tab-leech"
        @click="setLeechTab(true)"
      >
        🔥 僅頑固字 ({{ leechCount }})
      </button>
    </div>

    <!-- Filter & Search Controls -->
    <MistakeFilter
      v-model="filterState"
      @update:search="onFilterSearchUpdate"
      @update:category="onFilterCategoryUpdate"
      @update:sort-by="onFilterSortUpdate"
      @update:only-leech="onFilterOnlyLeechUpdate"
    />

    <!-- Mistakes List -->
    <main class="mistakes-container">
      <div v-if="filteredItems.length > 0" class="mistakes-list" data-testid="mistakes-list">
        <MistakeCard
          v-for="item in filteredItems"
          :key="item.id"
          :item="item"
          @remove="handleRemoveMistake"
          @speak="handleSpeak"
        />
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state" data-testid="empty-state">
        <div class="empty-icon">🎉</div>
        <h3 class="empty-title">
          {{ filterState.search || filterState.category !== 'all' || filterState.onlyLeech ? '沒有符合篩選條件的錯題' : '太棒了，目前沒有錯題！' }}
        </h3>
        <p class="empty-desc">
          {{ filterState.search || filterState.category !== 'all' || filterState.onlyLeech ? '請嘗試調整搜尋關鍵字或詞庫篩選條件。' : '繼續保持學習節奏，間隔複習助你一字不漏！' }}
        </p>
      </div>
    </main>

    <!-- Practice Mode Selection Modal -->
    <div
      v-if="showPracticeModal"
      class="modal-backdrop"
      data-testid="practice-modal"
      @click.self="showPracticeModal = false"
    >
      <div class="modal-content">
        <h3 class="modal-title">選擇錯題練習模式</h3>
        <p class="modal-desc">
          將為您排程練習共 {{ filteredItems.length }} 個錯題單字。
        </p>

        <div class="mode-options-grid">
          <button
            type="button"
            class="mode-btn"
            data-testid="mode-flashcard-btn"
            @click="startSessionWithMode('flashcard')"
          >
            <span class="mode-icon">🃏</span>
            <div class="mode-info">
              <strong>翻卡記憶</strong>
              <small>看英文想中文，自我評分</small>
            </div>
          </button>
          <button
            type="button"
            class="mode-btn"
            data-testid="mode-quiz-btn"
            @click="startSessionWithMode('quiz')"
          >
            <span class="mode-icon">📝</span>
            <div class="mode-info">
              <strong>四選一測驗</strong>
              <small>快速檢驗辨識度</small>
            </div>
          </button>
          <button
            type="button"
            class="mode-btn"
            data-testid="mode-spelling-btn"
            @click="startSessionWithMode('spelling')"
          >
            <span class="mode-icon">✍️</span>
            <div class="mode-info">
              <strong>拼字練習</strong>
              <small>加深單字拼寫記憶</small>
            </div>
          </button>
          <button
            type="button"
            class="mode-btn"
            data-testid="mode-dictation-btn"
            @click="startSessionWithMode('dictation')"
          >
            <span class="mode-icon">🎧</span>
            <div class="mode-info">
              <strong>聽寫練習</strong>
              <small>盲聽單字發音輸入</small>
            </div>
          </button>
        </div>

        <div class="modal-actions">
          <button
            type="button"
            class="btn-cancel"
            data-testid="modal-cancel-btn"
            @click="showPracticeModal = false"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import MistakeCard, { type MistakeItem } from '../components/notebook/MistakeCard.vue';
import MistakeFilter, { type FilterOptions, type SortOption } from '../components/notebook/MistakeFilter.vue';

const props = withDefaults(
  defineProps<{
    initialItems?: MistakeItem[];
    initialOvercomeCount?: number;
  }>(),
  {
    initialItems: () => [],
    initialOvercomeCount: 0,
  }
);

const emit = defineEmits<{
  (e: 'start-practice', words: MistakeItem[], mode?: string): void;
  (e: 'remove-mistake', item: MistakeItem): void;
  (e: 'speak', word: string): void;
}>();

// Internal list of mistakes
const mistakeItems = ref<MistakeItem[]>(
  props.initialItems && props.initialItems.length > 0
    ? [...props.initialItems]
    : [
        {
          id: 'w_abandon_001',
          word: 'abandon',
          phonetic: '/əˈbændən/',
          pos: ['v.'],
          definition: '放棄；拋棄；遺棄',
          examples: [
            {
              en: 'He decided to abandon the bad habit of staying up late.',
              zh: '他決定放棄熬夜的壞習慣。',
            },
          ],
          incorrectCount: 4,
          isLeech: true,
          category: ['gsat'],
          level: 3,
          lastWrongAt: '2026-05-01T10:00:00Z',
        },
        {
          id: 'w_capacity_002',
          word: 'capacity',
          phonetic: '/kəˈpæsəti/',
          pos: ['n.'],
          definition: '容量；能力；生產力',
          examples: [
            {
              en: 'The stadium was filled to its full capacity.',
              zh: '體育場座無虛席。',
            },
          ],
          incorrectCount: 2,
          isLeech: false,
          category: ['gsat', 'toeic'],
          level: 4,
          toeicTier: 'intermediate',
          lastWrongAt: '2026-05-02T14:30:00Z',
        },
        {
          id: 'w_negotiate_003',
          word: 'negotiate',
          phonetic: '/nɪˈɡoʊʃieɪt/',
          pos: ['v.'],
          definition: '談判；協商',
          examples: [
            {
              en: 'The union will negotiate with management for better wages.',
              zh: '工會將與管理層談判以爭取更好的薪資。',
            },
          ],
          incorrectCount: 3,
          isLeech: true,
          category: ['toeic'],
          level: 2,
          toeicTier: 'intermediate',
          lastWrongAt: '2026-05-03T09:15:00Z',
        },
      ]
);

const overcomeCount = ref(props.initialOvercomeCount);
const showPracticeModal = ref(false);

const filterState = ref<FilterOptions>({
  search: '',
  category: 'all',
  sortBy: 'mistakes-desc',
  onlyLeech: false,
});

// Stats
const totalMistakes = computed(() => mistakeItems.value.length);

const leechCount = computed(() => {
  return mistakeItems.value.filter((item) => {
    const errors = item.incorrectCount ?? item.lapses ?? 0;
    return Boolean(item.isLeech || item.isDifficult || errors >= 3);
  }).length;
});

// Filter & Sort
const filteredItems = computed(() => {
  let list = [...mistakeItems.value];

  // 1. Only leech filter
  if (filterState.value.onlyLeech) {
    list = list.filter((item) => {
      const errors = item.incorrectCount ?? item.lapses ?? 0;
      return Boolean(item.isLeech || item.isDifficult || errors >= 3);
    });
  }

  // 2. Category filter
  if (filterState.value.category !== 'all') {
    const cat = filterState.value.category;
    if (cat === 'gsat') {
      list = list.filter((item) => item.category?.includes('gsat'));
    } else if (cat.startsWith('gsat-')) {
      const lvl = parseInt(cat.replace('gsat-', ''), 10);
      list = list.filter((item) => item.category?.includes('gsat') && item.level === lvl);
    } else if (cat === 'toeic') {
      list = list.filter((item) => item.category?.includes('toeic'));
    } else if (cat.startsWith('toeic-')) {
      const tier = cat.replace('toeic-', '');
      list = list.filter((item) => item.category?.includes('toeic') && item.toeicTier === tier);
    }
  }

  // 3. Keyword Search filter
  if (filterState.value.search.trim()) {
    const q = filterState.value.search.trim().toLowerCase();
    list = list.filter((item) => {
      const matchWord = item.word.toLowerCase().includes(q);
      const matchDef = item.definition.toLowerCase().includes(q);
      return matchWord || matchDef;
    });
  }

  // 4. Sort
  const sort = filterState.value.sortBy;
  list.sort((a, b) => {
    if (sort === 'mistakes-desc') {
      const countA = a.incorrectCount ?? a.lapses ?? 0;
      const countB = b.incorrectCount ?? b.lapses ?? 0;
      return countB - countA;
    }
    if (sort === 'recent') {
      const timeA = a.lastWrongAt ? new Date(a.lastWrongAt).getTime() : 0;
      const timeB = b.lastWrongAt ? new Date(b.lastWrongAt).getTime() : 0;
      return timeB - timeA;
    }
    if (sort === 'alphabetical') {
      return a.word.localeCompare(b.word);
    }
    return 0;
  });

  return list;
});

function setLeechTab(onlyLeech: boolean) {
  filterState.value.onlyLeech = onlyLeech;
}

function onFilterSearchUpdate(val: string) {
  filterState.value.search = val;
}

function onFilterCategoryUpdate(val: string) {
  filterState.value.category = val;
}

function onFilterSortUpdate(val: SortOption) {
  filterState.value.sortBy = val;
}

function onFilterOnlyLeechUpdate(val: boolean) {
  filterState.value.onlyLeech = val;
}

function handleRemoveMistake(item: MistakeItem) {
  mistakeItems.value = mistakeItems.value.filter((i) => i.id !== item.id);
  overcomeCount.value += 1;
  emit('remove-mistake', item);
}

function handleSpeak(word: string) {
  emit('speak', word);
}

function handleStartPractice() {
  if (filteredItems.value.length === 0) return;
  // Trigger practice start event
  emit('start-practice', filteredItems.value);
  // Optional modal popup
  showPracticeModal.value = true;
}

function startSessionWithMode(mode: string) {
  showPracticeModal.value = false;
  emit('start-practice', filteredItems.value, mode);
}
</script>

<style scoped>
.notebook-view {
  max-width: 680px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.notebook-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #0f172a;
}

.page-subtitle {
  font-size: 0.8125rem;
  color: #64748b;
}

.start-practice-btn {
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  padding: 8px 16px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
  transition: all 0.15s;
}

.start-practice-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
  box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3);
}

.start-practice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  font-size: 1rem;
}

.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.stat-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stat-label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.375rem;
  font-weight: 800;
  color: #0f172a;
}

.text-red {
  color: #dc2626;
}

.text-green {
  color: #16a34a;
}

.tab-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}

.tab-btn.active {
  background-color: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.tab-leech-btn.active {
  background-color: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.mistakes-container {
  min-height: 200px;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  background-color: #ffffff;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.empty-title {
  margin: 0 0 6px 0;
  font-size: 1.125rem;
  color: #1e293b;
}

.empty-desc {
  margin: 0;
  font-size: 0.875rem;
  color: #64748b;
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}

.modal-content {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-title {
  margin: 0 0 6px 0;
  font-size: 1.125rem;
  color: #0f172a;
}

.modal-desc {
  margin: 0 0 16px 0;
  font-size: 0.875rem;
  color: #64748b;
}

.mode-options-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}

.mode-btn {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.15s;
}

.mode-btn:hover {
  background-color: #eff6ff;
  border-color: #93c5fd;
}

.mode-icon {
  font-size: 1.5rem;
}

.mode-info strong {
  display: block;
  font-size: 0.875rem;
  color: #1e293b;
}

.mode-info small {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-cancel {
  background: none;
  border: 1px solid #cbd5e1;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #475569;
  cursor: pointer;
}

.btn-cancel:hover {
  background-color: #f1f5f9;
}
</style>
