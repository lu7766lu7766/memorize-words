<template>
  <div class="dictation-wrapper">
    <!-- Dictation Audio Control Card -->
    <div class="audio-card">
      <div class="audio-status-tag">🎧 聽寫測驗</div>

      <!-- Offline / No voice fallback warning -->
      <div v-if="!isVoiceAvailable" class="voice-warning" data-testid="voice-warning">
        ⚠️ 當前環境未偵測到發音語音支援，已啟用輔助拼字提示模式。
        <div class="fallback-hint">提示字首：<strong>{{ fallbackHint }}</strong></div>
      </div>

      <div class="play-controls">
        <button
          type="button"
          class="btn-play btn-play-normal"
          data-testid="play-normal-btn"
          @click="playNormal"
        >
          🔊 朗讀 (常速 1.0x)
        </button>
        <button
          type="button"
          class="btn-play btn-play-slow"
          data-testid="play-slow-btn"
          @click="playSlow"
        >
          🐢 慢速 (0.75x)
        </button>
      </div>

      <div class="prompt-tip">請聆聽單字發音並在下方輸入正確拼法：</div>
    </div>

    <!-- Input Form -->
    <form class="input-form" @submit.prevent="handleSubmit">
      <div class="input-wrapper">
        <input
          ref="inputRef"
          v-model="inputWord"
          type="text"
          class="dictation-input"
          :class="{
            'input-correct': isAnswered && isCorrect,
            'input-wrong': isAnswered && !isCorrect,
          }"
          data-testid="dictation-input"
          placeholder="聆聽發音後輸入單字..."
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
          data-testid="dictation-submit-btn"
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
        data-testid="dictation-feedback"
      >
        <div class="fb-content">
          <div class="fb-header">
            <span v-if="isCorrect" class="status-icon">🎉</span>
            <span v-else class="status-icon">❌</span>
            <span class="revealed-word" data-testid="revealed-word">{{ item.word }}</span>
            <span v-if="item.phonetic" class="revealed-phonetic">{{ item.phonetic }}</span>
          </div>

          <div class="revealed-def">{{ item.definition }}</div>
          <p v-if="item.example" class="revealed-example">{{ item.example }}</p>
        </div>

        <button
          type="button"
          class="btn-next"
          data-testid="dictation-next-btn"
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
import { speechService, isSpeechSupported } from '@/services/speech'

interface Props {
  item: PracticeItem
  autoPlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoPlay: true,
})

const emit = defineEmits<{
  (e: 'answer', isCorrect: boolean, inputWord: string): void
  (e: 'next'): void
}>()

const inputWord = ref<string>('')
const isAnswered = ref<boolean>(false)
const isCorrect = ref<boolean>(false)
const isVoiceAvailable = ref<boolean>(true)
const inputRef = ref<HTMLInputElement | null>(null)

const fallbackHint = computed<string>(() => {
  const word = props.item.word
  if (!word) return ''
  return word.slice(0, 2) + '...'
})

async function checkVoice() {
  if (!isSpeechSupported()) {
    isVoiceAvailable.value = false
    return
  }
  const available = await speechService.checkAvailability(500)
  isVoiceAvailable.value = available
}

function playNormal() {
  speechService.speak(props.item.word, { rate: 1.0 })
}

function playSlow() {
  speechService.speakSlow(props.item.word)
}

function initQuestion() {
  inputWord.value = ''
  isAnswered.value = false
  isCorrect.value = false

  checkVoice().then(() => {
    if (props.autoPlay && isVoiceAvailable.value) {
      playNormal()
    }
  })

  nextTick(() => {
    inputRef.value?.focus()
  })
}

watch(() => props.item, initQuestion, { immediate: true })

function handleSubmit() {
  if (isAnswered.value) return
  const cleanInput = inputWord.value.trim()
  if (!cleanInput) return

  isAnswered.value = true
  const targetWord = props.item.word.trim().toLowerCase()
  isCorrect.value = cleanInput.toLowerCase() === targetWord

  // 答錯答對皆播放一次正音
  playNormal()

  emit('answer', isCorrect.value, cleanInput)
}

function handleNext() {
  emit('next')
}
</script>

<style scoped>
.dictation-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.audio-card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.audio-status-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  color: #4338ca;
  background-color: #e0e7ff;
  padding: 3px 10px;
  border-radius: 9999px;
  margin-bottom: 12px;
}

.voice-warning {
  background-color: #fffbeb;
  border: 1px solid #fcd34d;
  color: #92400e;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  margin-bottom: 14px;
  text-align: left;
}

.fallback-hint {
  margin-top: 4px;
  font-size: 12px;
}

.play-controls {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin: 8px 0 16px 0;
}

.btn-play {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: all 0.15s ease;
}

.btn-play-normal {
  background-color: #eff6ff;
  color: #2563eb;
  border: 1.5px solid #93c5fd;
}

.btn-play-normal:hover {
  background-color: #dbeafe;
}

.btn-play-slow {
  background-color: #f8fafc;
  color: #475569;
  border: 1.5px solid #cbd5e1;
}

.btn-play-slow:hover {
  background-color: #f1f5f9;
}

.prompt-tip {
  font-size: 13px;
  color: #64748b;
}

.input-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-wrapper {
  width: 100%;
}

.dictation-input {
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

.dictation-input:focus {
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

.fb-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.revealed-word {
  font-size: 1.25rem;
  font-weight: 700;
}

.revealed-phonetic {
  font-size: 13px;
  opacity: 0.8;
}

.revealed-def {
  font-size: 14px;
  font-weight: 500;
  margin-top: 4px;
}

.revealed-example {
  margin: 6px 0 0 0;
  font-size: 12px;
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
