<template>
  <div class="quiz-wrapper">
    <div class="question-card">
      <div class="word-header">
        <h2 class="question-word" data-testid="question-word">{{ item.word }}</h2>
        <span v-if="item.phonetic" class="phonetic-text">{{ item.phonetic }}</span>
      </div>

      <div class="audio-action">
        <button
          type="button"
          class="btn-audio"
          data-testid="play-audio-btn"
          title="播放發音"
          @click="playSpeech"
        >
          🔊 播放發音
        </button>
      </div>

      <div class="prompt-text">請選出正確的中文釋義：</div>
    </div>

    <!-- 4 Options -->
    <div class="options-grid" data-testid="options-grid">
      <button
        v-for="(option, index) in options"
        :key="index"
        type="button"
        class="option-btn"
        :class="getOptionClass(option)"
        :disabled="isAnswered"
        data-testid="quiz-option"
        @click="selectOption(option)"
      >
        <span class="option-idx">{{ ['A', 'B', 'C', 'D'][index] }}</span>
        <span class="option-content">{{ option }}</span>
      </button>
    </div>

    <!-- Feedback Banner & Next Button -->
    <transition name="fade">
      <div v-if="isAnswered" class="feedback-banner" :class="isCorrect ? 'fb-correct' : 'fb-wrong'" data-testid="feedback-banner">
        <div class="fb-info">
          <div class="fb-title">
            <span v-if="isCorrect">🎉 答對了！</span>
            <span v-else>❌ 答錯了！正解為：<strong>{{ item.definition }}</strong></span>
          </div>
          <p v-if="item.example" class="fb-example">{{ item.example }}</p>
        </div>
        <button
          type="button"
          class="btn-next"
          data-testid="quiz-next-btn"
          @click="handleNext"
        >
          下一題 ➔
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { PracticeItem } from '@/types/practice'
import { speechService } from '@/services/speech'

interface Props {
  item: PracticeItem
  distractors?: string[]
  pool?: PracticeItem[]
  autoAdvance?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoAdvance: false,
})

const emit = defineEmits<{
  (e: 'answer', isCorrect: boolean, selectedOption: string): void
  (e: 'next'): void
}>()

const isAnswered = ref<boolean>(false)
const selectedOption = ref<string | null>(null)
const isCorrect = ref<boolean>(false)
const options = ref<string[]>([])

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function generateOptions(): string[] {
  const correctDef = props.item.definition

  // If explicit distractors are passed
  if (props.distractors && props.distractors.length >= 3) {
    const subset = props.distractors.filter((d) => d !== correctDef).slice(0, 3)
    return shuffleArray([correctDef, ...subset])
  }

  // Generate from pool
  const fallbackPool: string[] = [
    '放棄；遺棄', '精確的；準確的', '獲取；學得', '能力；本領',
    '絕對的；完全的', '接受；認可', '伴隨；陪伴', '成就；實現',
    '累積；聚集', '適應；改編', '充足的；足夠的', '承認；確認',
  ]

  let candidates: string[] = []
  if (props.pool && props.pool.length > 0) {
    candidates = props.pool
      .filter((p) => p.id !== props.item.id && p.definition !== correctDef)
      .map((p) => p.definition)
  }

  if (candidates.length < 3) {
    candidates = [...candidates, ...fallbackPool.filter((f) => f !== correctDef)]
  }

  // Remove duplicates and pick 3
  const uniqueDistractors = Array.from(new Set(candidates)).slice(0, 3)
  return shuffleArray([correctDef, ...uniqueDistractors])
}

function initQuestion() {
  isAnswered.value = false
  selectedOption.value = null
  isCorrect.value = false
  options.value = generateOptions()
}

watch(() => props.item, initQuestion, { immediate: true })

function playSpeech() {
  speechService.speak(props.item.word)
}

function selectOption(option: string) {
  if (isAnswered.value) return
  isAnswered.value = true
  selectedOption.value = option
  isCorrect.value = option === props.item.definition

  // Speak word
  playSpeech()

  emit('answer', isCorrect.value, option)

  if (props.autoAdvance) {
    setTimeout(() => {
      handleNext()
    }, 1000)
  }
}

function getOptionClass(option: string): Record<string, boolean> {
  if (!isAnswered.value) return {}
  const isSelected = selectedOption.value === option
  const isRight = option === props.item.definition

  return {
    'option-correct': isRight,
    'option-wrong': isSelected && !isRight,
  }
}

function handleNext() {
  emit('next')
}
</script>

<style scoped>
.quiz-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.question-card {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
  text-align: center;
}

.question-word {
  font-size: 2.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}

.phonetic-text {
  display: inline-block;
  margin-top: 4px;
  font-size: 1rem;
  color: #64748b;
}

.audio-action {
  margin: 12px 0;
}

.btn-audio {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-height: 44px;
}

.prompt-text {
  font-size: 13px;
  color: #64748b;
  margin-top: 8px;
}

.options-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.option-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  min-height: 52px;
  background-color: #ffffff;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.option-btn:hover:not(:disabled) {
  border-color: #2563eb;
  background-color: #f8fafc;
}

.option-btn:disabled {
  cursor: default;
}

.option-idx {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: #f1f5f9;
  color: #475569;
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.option-content {
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  flex: 1;
}

.option-correct {
  background-color: #ecfdf5 !important;
  border-color: #10b981 !important;
  color: #065f46 !important;
}

.option-correct .option-idx {
  background-color: #10b981 !important;
  color: #ffffff !important;
}

.option-wrong {
  background-color: #fef2f2 !important;
  border-color: #ef4444 !important;
  color: #991b1b !important;
}

.option-wrong .option-idx {
  background-color: #ef4444 !important;
  color: #ffffff !important;
}

.feedback-banner {
  padding: 14px 16px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.fb-info {
  flex: 1;
}

.fb-title {
  font-size: 14px;
  font-weight: 600;
}

.fb-example {
  margin: 4px 0 0 0;
  font-size: 12px;
  opacity: 0.9;
}

.btn-next {
  min-height: 44px;
  padding: 8px 16px;
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
