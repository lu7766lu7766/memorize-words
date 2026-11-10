<template>
  <div class="spelling-wrapper">
    <!-- Prompt Card -->
    <div class="prompt-card">
      <div class="pos-group">
        <span v-for="p in item.pos" :key="p" class="pos-badge">{{ p }}</span>
        <span v-if="item.level" class="level-badge">L{{ item.level }}</span>
      </div>

      <div class="definition-text" data-testid="spelling-definition">
        {{ item.definition }}
      </div>

      <!-- Hint Section -->
      <div class="hint-bar">
        <button
          type="button"
          class="btn-hint"
          data-testid="hint-toggle-btn"
          @click="toggleHint"
        >
          💡 {{ showHint ? '隱藏提示' : '取得提示' }}
        </button>

        <div v-if="showHint" class="hint-display" data-testid="hint-display">
          <span class="hint-pattern">{{ hintPattern }}</span>
          <span class="hint-count">（共 {{ item.word.length }} 個字母）</span>
        </div>
      </div>
    </div>

    <!-- Spelling Input Form -->
    <form class="input-form" @submit.prevent="handleSubmit">
      <div class="input-wrapper">
        <input
          ref="inputRef"
          v-model="inputWord"
          type="text"
          class="spelling-input"
          :class="{
            'input-correct': isAnswered && isCorrect,
            'input-wrong': isAnswered && !isCorrect,
          }"
          data-testid="spelling-input"
          placeholder="輸入英文單字..."
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          :disabled="isAnswered"
        />
      </div>

      <div v-if="!isAnswered" class="form-actions">
        <button
          type="submit"
          class="btn-submit"
          data-testid="spelling-submit-btn"
          :disabled="!inputWord.trim()"
        >
          送出答案 (Enter)
        </button>
      </div>
    </form>

    <!-- Feedback Banner -->
    <transition name="fade">
      <div
        v-if="isAnswered"
        class="feedback-banner"
        :class="isCorrect ? 'fb-correct' : 'fb-wrong'"
        data-testid="spelling-feedback"
      >
        <div class="fb-content">
          <div v-if="isCorrect" class="fb-title">🎉 拼寫正確！</div>
          <div v-else class="fb-title">
            ❌ 正確拼法：<strong data-testid="correct-word-reveal">{{ item.word }}</strong>
          </div>

          <div v-if="item.phonetic" class="fb-phonetic">{{ item.phonetic }}</div>
          <p v-if="item.example" class="fb-example">{{ item.example }}</p>
        </div>

        <button
          type="button"
          class="btn-next"
          data-testid="spelling-next-btn"
          @click="handleNext"
        >
          下一題 ➔
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import type { PracticeItem } from '@/types/practice'
import { speechService } from '@/services/speech'

interface Props {
  item: PracticeItem
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'answer', isCorrect: boolean, inputWord: string): void
  (e: 'next'): void
}>()

const inputWord = ref<string>('')
const isAnswered = ref<boolean>(false)
const isCorrect = ref<boolean>(false)
const showHint = ref<boolean>(false)
const inputRef = ref<HTMLInputElement | null>(null)

const hintPattern = computed<string>(() => {
  const word = props.item.word
  if (!word) return ''
  // 字首提示 + 其餘底線
  const first = word.charAt(0)
  const rest = word.slice(1).split('').map(() => '_').join(' ')
  return `${first} ${rest}`
})

function initQuestion() {
  inputWord.value = ''
  isAnswered.value = false
  isCorrect.value = false
  showHint.value = false
  nextTick(() => {
    inputRef.value?.focus()
  })
}

watch(() => props.item, initQuestion, { immediate: true })

function toggleHint() {
  showHint.value = !showHint.value
}

function handleSubmit() {
  if (isAnswered.value) return
  const cleanInput = inputWord.value.trim()
  if (!cleanInput) return

  isAnswered.value = true
  const targetWord = props.item.word.trim().toLowerCase()
  isCorrect.value = cleanInput.toLowerCase() === targetWord

  // 強制朗讀單字
  speechService.speak(props.item.word)

  emit('answer', isCorrect.value, cleanInput)
}

function handleNext() {
  emit('next')
}
</script>

<style scoped>
.spelling-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.prompt-card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.pos-group {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}

.pos-badge {
  font-size: 12px;
  font-weight: 600;
  color: #0284c7;
  background-color: #e0f2fe;
  padding: 2px 8px;
  border-radius: 6px;
}

.level-badge {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  background-color: #d1fae5;
  padding: 2px 8px;
  border-radius: 6px;
}

.definition-text {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.4;
  margin-bottom: 16px;
}

.hint-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.btn-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background-color: #fef3c7;
  color: #b45309;
  border: 1px solid #fcd34d;
  padding: 6px 14px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
}

.hint-display {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #fffbeb;
  padding: 6px 14px;
  border-radius: 8px;
}

.hint-pattern {
  font-family: monospace;
  font-size: 1.1rem;
  font-weight: 700;
  color: #92400e;
  letter-spacing: 0.1em;
}

.hint-count {
  font-size: 12px;
  color: #b45309;
}

.input-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-wrapper {
  width: 100%;
}

.spelling-input {
  width: 100%;
  box-sizing: border-box;
  min-height: 52px;
  padding: 12px 18px;
  font-size: 1.25rem;
  font-weight: 600;
  text-align: center;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  transition: all 0.15s ease;
  background-color: #ffffff;
}

.spelling-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.input-correct {
  border-color: #10b981 !important;
  background-color: #ecfdf5 !important;
  color: #065f46 !important;
}

.input-wrong {
  border-color: #ef4444 !important;
  background-color: #fef2f2 !important;
  color: #991b1b !important;
}

.form-actions {
  display: flex;
  justify-content: center;
}

.btn-submit {
  min-height: 48px;
  padding: 10px 24px;
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.btn-submit:disabled {
  background-color: #94a3b8;
  cursor: not-allowed;
}

.feedback-banner {
  padding: 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.fb-correct {
  background-color: #d1fae5;
  border: 1px solid #6ee7b7;
  color: #065f46;
}

.fb-wrong {
  background-color: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
}

.fb-content {
  flex: 1;
}

.fb-title {
  font-size: 15px;
  font-weight: 600;
}

.fb-phonetic {
  font-size: 13px;
  color: #64748b;
  margin-top: 2px;
}

.fb-example {
  margin: 6px 0 0 0;
  font-size: 13px;
  opacity: 0.9;
}

.btn-next {
  min-height: 44px;
  padding: 8px 18px;
  background-color: #2563eb;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.btn-next:hover {
  background-color: #1d4ed8;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
