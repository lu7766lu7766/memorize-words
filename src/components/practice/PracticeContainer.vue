<template>
  <div class="practice-container">
    <!-- Active Practice Section -->
    <template v-if="!session.isCompleted && session.currentItem">
      <!-- Top Navigation & Progress Bar -->
      <div class="progress-section" data-testid="progress-section">
        <div class="progress-meta">
          <div class="mode-info">
            <span class="mode-badge" data-testid="mode-badge">{{ modeLabel }}</span>
            <span v-if="session.isClearedRound" class="cleared-badge" data-testid="cleared-round-badge">
              🔥 錯題清空輪
            </span>
          </div>

          <div class="counter-info" data-testid="question-counter">
            第 {{ session.currentIndex + 1 }} 題 / 共 {{ session.totalCount }} 題
          </div>
        </div>

        <!-- Progress bar visual -->
        <div class="progress-bar-track">
          <div
            class="progress-bar-fill"
            data-testid="progress-bar-fill"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Mode Switch Tab Buttons -->
      <div class="mode-switcher" data-testid="mode-switcher">
        <button
          v-for="m in modes"
          :key="m.id"
          type="button"
          class="mode-tab-btn"
          :class="{ active: currentMode === m.id }"
          @click="switchMode(m.id)"
        >
          {{ m.label }}
        </button>
      </div>

      <!-- Dynamic Mode Component -->
      <div class="mode-container" data-testid="active-mode-container">
        <FlashcardMode
          v-if="currentMode === 'flashcard'"
          :item="session.currentItem"
          @rate="handleFlashcardRate"
        />

        <QuizMode
          v-else-if="currentMode === 'quiz'"
          :item="session.currentItem"
          :pool="pool"
          @answer="handleQuizAnswer"
          @next="handleNextQuestion"
        />

        <SpellingMode
          v-else-if="currentMode === 'spelling'"
          :item="session.currentItem"
          @answer="handleSpellingAnswer"
          @next="handleNextQuestion"
        />

        <DictationMode
          v-else-if="currentMode === 'dictation'"
          :item="session.currentItem"
          @answer="handleDictationAnswer"
          @next="handleNextQuestion"
        />
      </div>
    </template>

    <!-- Completion Summary Panel -->
    <template v-else>
      <div class="completion-panel" data-testid="completion-panel">
        <div class="trophy-icon">🏆</div>
        <h2 class="completion-title">練習完成！</h2>
        <p class="completion-subtitle">恭喜您完成了本次的所有單字練習！</p>

        <!-- Stats Grid -->
        <div class="stats-card" data-testid="stats-card">
          <div class="stat-item">
            <span class="stat-label">首輪答對率</span>
            <span class="stat-value correct-rate" data-testid="stat-accuracy">
              {{ firstPassRatePercent }}%
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">總練習題次</span>
            <span class="stat-value" data-testid="stat-total-attempts">
              {{ session.stats.totalAttempts }}
            </span>
          </div>
          <div class="stat-item">
            <span class="stat-label">練習字數</span>
            <span class="stat-value" data-testid="stat-unique-words">
              {{ session.stats.uniqueWordsCount }}
            </span>
          </div>
        </div>

        <!-- Incorrect Items Summary -->
        <div v-if="session.incorrectItems.length > 0" class="mistakes-summary" data-testid="mistakes-summary">
          <h3 class="mistakes-title">本次曾答錯的單字 ({{ session.incorrectItems.length }})</h3>
          <ul class="mistakes-list">
            <li v-for="w in session.incorrectItems" :key="w.id" class="mistake-item">
              <span class="mistake-word">{{ w.word }}</span>
              <span class="mistake-phonetic">{{ w.phonetic }}</span>
              <span class="mistake-def">{{ w.definition }}</span>
            </li>
          </ul>
        </div>
        <div v-else class="perfect-hint" data-testid="perfect-hint">
          🌟 太棒了！本次練習首輪全數答對，無任何錯題！
        </div>

        <!-- Action Buttons -->
        <div class="completion-actions">
          <button
            v-if="session.incorrectItems.length > 0"
            type="button"
            class="btn-action btn-retry-mistakes"
            data-testid="retry-mistakes-btn"
            @click="handleRetryMistakes"
          >
            🔥 一鍵複習錯題 ({{ session.incorrectItems.length }})
          </button>
          <button
            type="button"
            class="btn-action btn-restart"
            data-testid="restart-btn"
            @click="handleRestart"
          >
            🔄 重新開始練習
          </button>
          <button
            type="button"
            class="btn-action btn-exit"
            data-testid="exit-btn"
            @click="handleExit"
          >
            🏠 回到首頁
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PracticeItem, PracticeMode, RatingLevel, PracticeStats, PracticeAnswerResult } from '@/types/practice'
import { PracticeSession } from '@/services/practiceEngine'
import FlashcardMode from './FlashcardMode.vue'
import QuizMode from './QuizMode.vue'
import SpellingMode from './SpellingMode.vue'
import DictationMode from './DictationMode.vue'

interface Props {
  session: PracticeSession
  pool?: PracticeItem[]
  mode?: PracticeMode
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'complete', stats: PracticeStats): void
  (e: 'exit'): void
  (e: 'retry-mistakes', items: PracticeItem[]): void
  (e: 'restart'): void
  (e: 'answer', result: PracticeAnswerResult): void
}>()

const currentMode = ref<PracticeMode>(props.mode || props.session.mode || 'flashcard')

const modes: { id: PracticeMode; label: string }[] = [
  { id: 'flashcard', label: '翻卡' },
  { id: 'quiz', label: '選擇' },
  { id: 'spelling', label: '拼字' },
  { id: 'dictation', label: '聽寫' },
]

const modeLabels: Record<PracticeMode, string> = {
  flashcard: '翻卡模式',
  quiz: '四選一測驗',
  spelling: '拼字測驗',
  dictation: '聽寫測驗',
}

const modeLabel = computed<string>(() => modeLabels[currentMode.value])

const progressPercent = computed<number>(() => props.session.progressPercent)

const firstPassRatePercent = computed<number>(() => {
  return Math.round(props.session.stats.firstPassCorrectRate * 100)
})

function switchMode(newMode: PracticeMode) {
  currentMode.value = newMode
}

function handleFlashcardRate(rating: RatingLevel, isCorrect: boolean) {
  const result = props.session.submitAnswer({
    isCorrect,
    rating,
    autoAdvance: true,
  })
  emit('answer', result)
  checkCompletion()
}

function handleQuizAnswer(isCorrect: boolean, selectedOption: string) {
  const result = props.session.submitAnswer({
    isCorrect,
    userAnswer: selectedOption,
    autoAdvance: false,
  })
  emit('answer', result)
}

function handleSpellingAnswer(isCorrect: boolean, inputWord: string) {
  const result = props.session.submitAnswer({
    isCorrect,
    userAnswer: inputWord,
    autoAdvance: false,
  })
  emit('answer', result)
}

function handleDictationAnswer(isCorrect: boolean, inputWord: string) {
  const result = props.session.submitAnswer({
    isCorrect,
    userAnswer: inputWord,
    autoAdvance: false,
  })
  emit('answer', result)
}

function handleNextQuestion() {
  props.session.nextQuestion()
  checkCompletion()
}

function checkCompletion() {
  if (props.session.isCompleted) {
    emit('complete', props.session.stats)
  }
}

function handleRetryMistakes() {
  emit('retry-mistakes', props.session.incorrectItems)
}

function handleRestart() {
  emit('restart')
}

function handleExit() {
  emit('exit')
}
</script>

<style scoped>
.practice-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 540px;
  margin: 0 auto;
  box-sizing: border-box;
}

.progress-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  background-color: #ffffff;
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mode-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode-badge {
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 3px 10px;
  border-radius: 9999px;
  border: 1px solid #bfdbfe;
}

.cleared-badge {
  font-size: 12px;
  font-weight: 700;
  color: #b45309;
  background-color: #fef3c7;
  padding: 3px 8px;
  border-radius: 9999px;
  border: 1px solid #fde68a;
}

.counter-info {
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.progress-bar-track {
  width: 100%;
  height: 8px;
  background-color: #f1f5f9;
  border-radius: 9999px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  border-radius: 9999px;
  transition: width 0.3s ease-in-out;
}

.mode-switcher {
  display: flex;
  gap: 6px;
  background-color: #f1f5f9;
  padding: 4px;
  border-radius: 10px;
}

.mode-tab-btn {
  flex: 1;
  min-height: 40px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mode-tab-btn.active {
  background-color: #ffffff;
  color: #1e293b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mode-container {
  width: 100%;
}

.completion-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  background-color: #ffffff;
  padding: 32px 20px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  gap: 16px;
}

.trophy-icon {
  font-size: 48px;
  line-height: 1;
}

.completion-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.completion-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 0;
}

.stats-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  background-color: #f8fafc;
  padding: 16px;
  border-radius: 12px;
  box-sizing: border-box;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
}

.correct-rate {
  color: #2563eb;
}

.mistakes-summary {
  width: 100%;
  text-align: left;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 12px;
  padding: 14px 16px;
  box-sizing: border-box;
}

.mistakes-title {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 700;
  color: #991b1b;
}

.mistakes-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
}

.mistake-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.mistake-word {
  font-weight: 700;
  color: #7f1d1d;
}

.mistake-phonetic {
  color: #991b1b;
  font-size: 11px;
}

.mistake-def {
  color: #4b5563;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.perfect-hint {
  width: 100%;
  background-color: #ecfdf5;
  border: 1px solid #a7f3d0;
  color: #065f46;
  padding: 14px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  box-sizing: border-box;
}

.completion-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  margin-top: 8px;
}

.btn-action {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.15s ease;
}

.btn-retry-mistakes {
  background-color: #dc2626;
  color: #ffffff;
}

.btn-retry-mistakes:hover {
  background-color: #b91c1c;
}

.btn-restart {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-restart:hover {
  background-color: #1d4ed8;
}

.btn-exit {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.btn-exit:hover {
  background-color: #e2e8f0;
}
</style>
