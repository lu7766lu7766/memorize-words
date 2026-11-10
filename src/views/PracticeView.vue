<template>
  <div class="practice-view">
    <header class="view-header">
      <button type="button" class="btn-back" data-testid="back-btn" @click="handleExit">
        ‹ 返回
      </button>
      <h1 class="view-title">單字練習</h1>
      <div class="header-placeholder"></div>
    </header>

    <main class="view-main">
      <PracticeContainer
        v-if="session"
        :key="sessionKey"
        :session="session"
        :mode="selectedMode"
        :pool="itemsPool"
        @exit="handleExit"
        @retry-mistakes="handleRetryMistakes"
        @restart="handleRestart"
      />
      <div v-else class="empty-state">
        <p>目前沒有可練習的單字題目。</p>
        <button type="button" class="btn-back-home" @click="handleExit">返回首頁</button>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, shallowRef, onMounted } from 'vue'
import type { PracticeItem, PracticeMode } from '@/types/practice'
import { PracticeSession } from '@/services/practiceEngine'
import PracticeContainer from '@/components/practice/PracticeContainer.vue'

interface Props {
  items?: PracticeItem[]
  mode?: PracticeMode
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'flashcard',
})

const emit = defineEmits<{
  (e: 'exit'): void
}>()

// Default sample items if none provided
const sampleItems: PracticeItem[] = [
  {
    id: 'w_abandon_001',
    word: 'abandon',
    phonetic: '/əˈbændən/',
    definition: '放棄；遺棄',
    example: 'He decided to abandon the sunken ship.',
    exampleTranslation: '他決定放棄那艘沉沒的船。',
    pos: ['v.'],
    level: 3,
    category: ['gsat'],
    incorrectCount: 0,
    isLeech: false,
  },
  {
    id: 'w_capacity_002',
    word: 'capacity',
    phonetic: '/kəˈpæsəti/',
    definition: '容量；能力',
    example: 'The stadium was filled to capacity.',
    exampleTranslation: '體育館座無虛席。',
    pos: ['n.'],
    level: 4,
    category: ['gsat', 'toeic'],
    incorrectCount: 0,
    isLeech: false,
  },
  {
    id: 'w_efficient_003',
    word: 'efficient',
    phonetic: '/ɪˈfɪʃnt/',
    definition: '有效率的；能勝任的',
    example: 'We need to find a more efficient way to work.',
    exampleTranslation: '我們需要找出更有效率的工作方式。',
    pos: ['adj.'],
    level: 4,
    category: ['toeic'],
    incorrectCount: 0,
    isLeech: false,
  },
]

const session = shallowRef<PracticeSession | null>(null)
const sessionKey = ref<number>(0)
const itemsPool = ref<PracticeItem[]>([])
const selectedMode = ref<PracticeMode>(props.mode)

function initSession(items: PracticeItem[]) {
  itemsPool.value = [...items]
  session.value = new PracticeSession(items, { mode: selectedMode.value })
  sessionKey.value++
}

onMounted(() => {
  const initialItems = props.items && props.items.length > 0 ? props.items : sampleItems
  initSession(initialItems)
})

function handleRetryMistakes(mistakes: PracticeItem[]) {
  if (mistakes.length > 0) {
    initSession(mistakes)
  }
}

function handleRestart() {
  const initialItems = props.items && props.items.length > 0 ? props.items : sampleItems
  initSession(initialItems)
}

function handleExit() {
  emit('exit')
}
</script>

<style scoped>
.practice-view {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 20;
}

.btn-back {
  background: none;
  border: none;
  font-size: 18px;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
  padding: 6px 12px;
  min-height: 44px;
}

.view-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.header-placeholder {
  width: 44px;
}

.view-main {
  flex: 1;
  padding: 16px;
  box-sizing: border-box;
}

.empty-state {
  text-align: center;
  padding: 48px 16px;
  color: #64748b;
}

.btn-back-home {
  margin-top: 16px;
  padding: 10px 20px;
  min-height: 44px;
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
</style>
