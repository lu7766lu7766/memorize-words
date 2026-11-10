<template>
  <div class="app-root">
    <!-- PWA Updates & Offline Ready Notification Banner / Toast -->
    <div class="pwa-banners" aria-live="polite">
      <slot
        name="pwa-banner"
        :need-refresh="needRefresh"
        :offline-ready="offlineReady"
        :update-service-worker="handleUpdate"
        :dismiss-update="dismissUpdate"
        :dismiss-offline-ready="dismissOfflineReady"
      >
        <transition name="slide-fade">
          <div v-if="needRefresh" class="pwa-toast pwa-toast-update" role="alert" data-testid="pwa-update-toast">
            <div class="pwa-toast-content">
              <span class="pwa-toast-icon">🚀</span>
              <div class="pwa-toast-text">
                <strong>發現新版本</strong>
                <p>點擊立即更新體驗最新功能！</p>
              </div>
            </div>
            <div class="pwa-toast-actions">
              <button
                type="button"
                class="btn btn-primary btn-sm"
                data-testid="pwa-update-btn"
                @click="handleUpdate"
              >
                立即更新
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                data-testid="pwa-dismiss-btn"
                @click="dismissUpdate"
              >
                稍後
              </button>
            </div>
          </div>
        </transition>

        <transition name="slide-fade">
          <div v-if="offlineReady" class="pwa-toast pwa-toast-ready" role="status" data-testid="pwa-offline-toast">
            <div class="pwa-toast-content">
              <span class="pwa-toast-icon">⚡</span>
              <div class="pwa-toast-text">
                <strong>已可離線使用</strong>
                <p>詞庫與功能皆已快取，無網路也能隨時複習。</p>
              </div>
            </div>
            <div class="pwa-toast-actions">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                data-testid="pwa-offline-dismiss-btn"
                @click="dismissOfflineReady"
              >
                我知道了
              </button>
            </div>
          </div>
        </transition>
      </slot>
    </div>

    <!-- 頂部離線狀態提示 -->
    <OfflineBanner />

    <!-- Main Header (在非全螢幕練習頁面時顯示) -->
    <header v-if="currentTab !== 'practice'" class="app-header">
      <div class="header-inner">
        <div class="header-brand">
          <h1 class="app-title">一字不漏</h1>
          <span class="app-badge">學測 / 多益單字</span>
        </div>
        <div class="header-status">
          <span class="category-pill">
            {{ settingsStore.activeCategory === 'gsat' ? `學測 L${settingsStore.activeLevel}` : `多益第 ${settingsStore.activeLevel} 階` }}
          </span>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="app-main" :class="{ 'with-bottom-nav': currentTab !== 'practice' }">
      <!-- 首頁儀表板 -->
      <HomeView
        v-if="currentTab === 'dashboard'"
        @start-review="handleStartReview"
        @start-new-words="handleStartNewWords"
        @start-mistakes="handleStartMistakes"
        @navigate="handleHomeNavigate"
      />

      <!-- 單字練習頁面 -->
      <PracticeView
        v-else-if="currentTab === 'practice'"
        :items="activePracticeItems"
        :mode="activePracticeMode"
        @exit="handleExitPractice"
      />

      <!-- 錯題本頁面 -->
      <NotebookView
        v-else-if="currentTab === 'notebook'"
        @start-practice="handleNotebookStartPractice"
      />

      <!-- 設定與備份頁面 -->
      <SettingsView
        v-else-if="currentTab === 'settings'"
      />
    </main>

    <!-- 底部導覽列 (在一般頁面顯示) -->
    <BottomNav
      v-if="currentTab !== 'practice'"
      :current-tab="currentTab"
      @update:current-tab="handleTabChange"
      @navigate="handleTabChange"
    />

    <!-- PWA 安裝教學引導彈窗 -->
    <InstallPromptModal
      v-if="showInstallPrompt"
      v-model="showInstallPrompt"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getActivePinia, setActivePinia, createPinia } from 'pinia'

// 確保測試環境即使未手動掛載 Pinia 也能安全運作
if (!getActivePinia()) {
  setActivePinia(createPinia())
}

import {
  needRefresh,
  offlineReady,
  updateServiceWorker,
  dismissUpdate,
  dismissOfflineReady,
} from './pwa'
import OfflineBanner from './components/pwa/OfflineBanner.vue'
import BottomNav from './components/layout/BottomNav.vue'
import InstallPromptModal from './components/pwa/InstallPromptModal.vue'
import HomeView from './views/HomeView.vue'
import PracticeView from './views/PracticeView.vue'
import NotebookView from './views/NotebookView.vue'
import SettingsView from './views/SettingsView.vue'
import { useSettingsStore } from './stores/useSettingsStore'
import { useDashboardStore } from './stores/dashboardStore'
import { loadVocabulary } from './services/dictService'
import { db } from './db'
import type { PracticeItem, PracticeMode } from './types/practice'
import type { WordItem } from './types/word'

const settingsStore = useSettingsStore()
const dashboardStore = useDashboardStore()

const currentTab = ref<'dashboard' | 'practice' | 'notebook' | 'settings'>('dashboard')
const showInstallPrompt = ref<boolean>(false)
const activePracticeMode = ref<PracticeMode>('flashcard')
const activePracticeItems = ref<PracticeItem[]>([])

onMounted(async () => {
  // 載入詞庫與儀表板數據
  try {
    await loadVocabulary()
    await dashboardStore.loadDashboardData()
  } catch (err) {
    console.warn('Initial load error:', err)
  }
})

async function handleUpdate() {
  await updateServiceWorker(true)
}

function handleTabChange(tabId: string) {
  if (tabId === 'dashboard' || tabId === 'practice' || tabId === 'notebook' || tabId === 'settings') {
    if (tabId === 'practice' && activePracticeItems.value.length === 0) {
      // 點選練習時若尚未載入題目，預設載入今日新字或複習題目
      handleStartNewWords()
      return
    }
    currentTab.value = tabId
  }
}

function handleHomeNavigate(target: string) {
  if (target === 'review') {
    handleStartReview()
  } else if (target === 'new-words') {
    handleStartNewWords()
  } else if (target === 'mistakes') {
    handleStartMistakes()
  }
}

function wordItemToPracticeItem(w: WordItem, incorrectCount = 0, isLeech = false): PracticeItem {
  const firstEx = w.examples && w.examples[0]
  return {
    id: w.id,
    word: w.word,
    phonetic: w.phonetic,
    definition: w.definition,
    examples: w.examples,
    example: firstEx?.en || '',
    exampleTranslation: firstEx?.zh || '',
    pos: w.pos || [],
    level: w.level,
    tags: w.tags || [],
    category: w.category || ['gsat'],
    incorrectCount,
    isLeech,
  }
}

/**
 * 啟動今日複習：載入到期單字
 */
async function handleStartReview() {
  try {
    const vocab = await loadVocabulary()
    const now = new Date()
    
    // 查詢到期待複習單字
    const dueProgress = await db.progress
      .where('due')
      .belowOrEqual(now)
      .filter((p) => p.state !== 0)
      .limit(settingsStore.dailyReviewLimit)
      .toArray()

    const vocabMap = new Map(vocab.map((v) => [v.id, v]))
    const items: PracticeItem[] = []

    for (const prog of dueProgress) {
      const word = vocabMap.get(prog.wordId)
      if (word) {
        items.push(wordItemToPracticeItem(word, prog.lapses || 0, prog.isDifficult || false))
      }
    }

    if (items.length > 0) {
      activePracticeItems.value = items
      activePracticeMode.value = 'flashcard'
      currentTab.value = 'practice'
    } else {
      // 若今日暫無待複習單字，自動開啟新字學習
      await handleStartNewWords()
    }
  } catch (err) {
    console.error('Failed to start review:', err)
    await handleStartNewWords()
  }
}

/**
 * 啟動今日新字：依據目前設定詞庫與等級排入新單字
 */
async function handleStartNewWords() {
  try {
    const vocab = await loadVocabulary()
    const targetCat = settingsStore.activeCategory
    const targetLvl = settingsStore.activeLevel
    const limit = settingsStore.dailyNewWords || 20

    // 篩選符合分類與等級之單字
    const matched = vocab.filter((v) => {
      const catMatch = v.category && v.category.includes(targetCat)
      const lvlMatch = v.level === targetLvl
      return catMatch && lvlMatch
    })

    // 排除已學習單字
    const existingIds = new Set(await db.progress.toCollection().primaryKeys())
    const unlearned = matched.filter((v) => !existingIds.has(v.id))

    const selected = unlearned.length > 0 ? unlearned.slice(0, limit) : matched.slice(0, limit)
    const items = selected.map((w) => wordItemToPracticeItem(w))

    activePracticeItems.value = items.length > 0 ? items : vocab.slice(0, limit).map((w) => wordItemToPracticeItem(w))
    activePracticeMode.value = 'flashcard'
    currentTab.value = 'practice'
  } catch (err) {
    console.error('Failed to start new words:', err)
  }
}

/**
 * 啟動錯題快速複習：跳轉錯題本或直接開始練習錯題
 */
async function handleStartMistakes() {
  currentTab.value = 'notebook'
}

/**
 * 錯題本自訂模式開始練習
 */
function handleNotebookStartPractice(words: any[], mode?: any) {
  if (Array.isArray(words) && words.length > 0) {
    activePracticeItems.value = words.map((item) => ({
      id: item.id || `mistake_${item.word}`,
      word: item.word,
      phonetic: item.phonetic,
      definition: item.definition,
      example: item.example,
      exampleTranslation: item.exampleTranslation,
      pos: item.pos || [],
      level: item.level || 1,
      tags: item.tags || [],
      category: item.category || ['gsat'],
      incorrectCount: item.incorrectCount || item.mistakeCount || 1,
      isLeech: !!item.isLeech,
      showFullSentence: item.showFullSentence ?? !!item.isLeech,
    }))
    activePracticeMode.value = (mode as PracticeMode) || 'flashcard'
    currentTab.value = 'practice'
  }
}

function handleExitPractice() {
  currentTab.value = 'dashboard'
  // 重整儀表板統計
  dashboardStore.loadDashboardData()
}
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  color: #0f172a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  padding-top: env(safe-area-inset-top, 0px);
}

.pwa-banners {
  position: fixed;
  top: max(12px, env(safe-area-inset-top));
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 24px);
  max-width: 480px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.pwa-toast {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
}

.pwa-toast-update {
  border-left: 4px solid #2563eb;
}

.pwa-toast-ready {
  border-left: 4px solid #10b981;
}

.pwa-toast-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.pwa-toast-icon {
  font-size: 20px;
  line-height: 1;
}

.pwa-toast-text strong {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.pwa-toast-text p {
  margin: 2px 0 0 0;
  font-size: 13px;
  color: #64748b;
}

.pwa-toast-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
  min-height: 36px;
}

.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #f1f5f9;
  color: #475569;
  border-color: #e2e8f0;
}

.btn-secondary:hover {
  background-color: #e2e8f0;
}

.app-header {
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 20;
}

.header-inner {
  max-width: 640px;
  margin: 0 auto;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.02em;
}

.app-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2563eb;
  background-color: #eff6ff;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid #bfdbfe;
}

.category-pill {
  font-size: 0.75rem;
  font-weight: 600;
  color: #475569;
  background-color: #f1f5f9;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid #e2e8f0;
}

.app-main {
  flex: 1;
  max-width: 640px;
  width: 100%;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.app-main.with-bottom-nav {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.25s ease-out;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-16px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
