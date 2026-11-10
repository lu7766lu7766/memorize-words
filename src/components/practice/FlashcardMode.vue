<template>
  <div class="flashcard-wrapper">
    <div
      class="flashcard"
      :class="{ 'is-flipped': isFlipped }"
      data-testid="flashcard"
      @click="toggleFlip"
    >
      <!-- Front side -->
      <div class="card-face card-front" data-testid="flashcard-front">
        <div class="badge-hint">點擊翻轉查看釋義</div>
        <div class="word-section">
          <h2 class="word-text" data-testid="word-text">{{ item.word }}</h2>
          <span v-if="item.phonetic" class="phonetic-text" data-testid="phonetic-text">
            {{ item.phonetic }}
          </span>
        </div>

        <div class="audio-control" @click.stop>
          <button
            type="button"
            class="btn-audio"
            data-testid="play-audio-btn"
            title="播放發音"
            @click="playSpeech"
          >
            <span class="icon">🔊</span>
            <span class="audio-label">朗讀單字</span>
          </button>
        </div>

        <div v-if="frontExample" class="example-box front-example" @click.stop>
          <div class="example-label">例句</div>
          <p class="example-en">{{ frontExample }}</p>
          <div class="mask-hint">（中文釋義翻面後揭曉）</div>
        </div>
      </div>

      <!-- Back side -->
      <div class="card-face card-back" data-testid="flashcard-back">
        <div class="pos-badge-group">
          <span v-for="p in item.pos" :key="p" class="pos-tag">{{ p }}</span>
          <span v-if="item.level" class="level-tag">L{{ item.level }}</span>
        </div>

        <div class="definition-section">
          <div class="definition-text" data-testid="definition-text">
            {{ item.definition }}
          </div>
        </div>

        <div v-if="backExample" class="example-box back-example">
          <div class="example-label">例句與翻譯</div>
          <p class="example-en">{{ backExample.en }}</p>
          <p v-if="backExample.zh" class="example-zh">{{ backExample.zh }}</p>
        </div>
      </div>
    </div>

    <!-- Rating Actions -->
    <div class="rating-bar" data-testid="rating-bar">
      <div class="rating-prompt">
        {{ isFlipped ? '請評估您對此單字的掌握程度：' : '請先點擊卡片翻面確認釋義，或直接評分：' }}
      </div>
      <div class="rating-buttons">
        <button
          type="button"
          class="rating-btn rating-again"
          data-testid="rate-again-btn"
          @click="submitRating('again', false)"
        >
          <span class="btn-title">忘了</span>
          <span class="btn-sub">Again</span>
        </button>
        <button
          type="button"
          class="rating-btn rating-hard"
          data-testid="rate-hard-btn"
          @click="submitRating('hard', true)"
        >
          <span class="btn-title">模糊</span>
          <span class="btn-sub">Hard</span>
        </button>
        <button
          type="button"
          class="rating-btn rating-good"
          data-testid="rate-good-btn"
          @click="submitRating('good', true)"
        >
          <span class="btn-title">記得</span>
          <span class="btn-sub">Good</span>
        </button>
        <button
          type="button"
          class="rating-btn rating-easy"
          data-testid="rate-easy-btn"
          @click="submitRating('easy', true)"
        >
          <span class="btn-title">太簡單</span>
          <span class="btn-sub">Easy</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PracticeItem, RatingLevel } from '@/types/practice'
import { speechService } from '@/services/speech'

interface Props {
  item: PracticeItem
  autoPlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoPlay: false,
})

const emit = defineEmits<{
  (e: 'rate', rating: RatingLevel, isCorrect: boolean): void
  (e: 'flip', isFlipped: boolean): void
}>()

const isFlipped = ref<boolean>(false)

const frontExample = computed<string>(() => {
  if (props.item.example) return props.item.example
  if (props.item.examples && props.item.examples.length > 0) return props.item.examples[0].en
  return ''
})

const backExample = computed<{ en: string; zh?: string } | null>(() => {
  if (props.item.example) {
    return {
      en: props.item.example,
      zh: props.item.exampleTranslation,
    }
  }
  if (props.item.examples && props.item.examples.length > 0) {
    return props.item.examples[0]
  }
  return null
})

function toggleFlip() {
  isFlipped.value = !isFlipped.value
  emit('flip', isFlipped.value)
}

function playSpeech() {
  speechService.speak(props.item.word)
}

function submitRating(rating: RatingLevel, isCorrect: boolean) {
  emit('rate', rating, isCorrect)
}
</script>

<style scoped>
.flashcard-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.flashcard {
  width: 100%;
  min-height: 280px;
  perspective: 1000px;
  position: relative;
  cursor: pointer;
}

.card-face {
  width: 100%;
  min-height: 280px;
  box-sizing: border-box;
  padding: 24px;
  border-radius: 16px;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  transition: transform 0.4s ease, box-shadow 0.2s ease;
  backface-visibility: hidden;
  user-select: none;
}

.card-front {
  position: relative;
}

.card-back {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  transform: rotateY(180deg);
  background-color: #f8fafc;
}

.flashcard.is-flipped .card-front {
  transform: rotateY(-180deg);
}

.flashcard.is-flipped .card-back {
  transform: rotateY(0deg);
}

.badge-hint {
  position: absolute;
  top: 12px;
  font-size: 11px;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

.word-section {
  margin-top: 8px;
}

.word-text {
  font-size: 2.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  letter-spacing: -0.02em;
}

.phonetic-text {
  display: inline-block;
  margin-top: 4px;
  font-size: 1.1rem;
  color: #64748b;
  font-family: 'Lucida Sans', 'Segoe UI', sans-serif;
}

.audio-control {
  margin-top: 16px;
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
  min-width: 44px;
  transition: all 0.15s ease;
}

.btn-audio:hover {
  background-color: #dbeafe;
}

.example-box {
  margin-top: 18px;
  width: 100%;
  padding: 12px 14px;
  background-color: #f1f5f9;
  border-radius: 10px;
  text-align: left;
}

.example-label {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.example-en {
  margin: 0;
  font-size: 14px;
  color: #1e293b;
  line-height: 1.4;
}

.example-zh {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #475569;
  line-height: 1.4;
}

.mask-hint {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}

.pos-badge-group {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.pos-tag {
  font-size: 12px;
  font-weight: 600;
  color: #0284c7;
  background-color: #e0f2fe;
  padding: 2px 8px;
  border-radius: 6px;
}

.level-tag {
  font-size: 12px;
  font-weight: 600;
  color: #059669;
  background-color: #d1fae5;
  padding: 2px 8px;
  border-radius: 6px;
}

.definition-section {
  margin-bottom: 16px;
}

.definition-text {
  font-size: 1.35rem;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.4;
}

.rating-bar {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rating-prompt {
  font-size: 13px;
  color: #64748b;
  text-align: center;
}

.rating-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  width: 100%;
}

.rating-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 8px 4px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.15s ease;
}

.rating-btn:hover {
  filter: brightness(0.95);
  transform: translateY(-1px);
}

.rating-btn:active {
  transform: translateY(1px);
}

.btn-title {
  font-size: 15px;
  font-weight: 700;
}

.btn-sub {
  font-size: 11px;
  opacity: 0.85;
}

.rating-again {
  background-color: #fee2e2;
  color: #dc2626;
  border-color: #fca5a5;
}

.rating-hard {
  background-color: #fef3c7;
  color: #d97706;
  border-color: #fcd34d;
}

.rating-good {
  background-color: #e0e7ff;
  color: #4338ca;
  border-color: #a5b4fc;
}

.rating-easy {
  background-color: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}
</style>
