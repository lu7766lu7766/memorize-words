<template>
  <div class="settings-view" data-testid="settings-view">
    <header class="settings-header">
      <h2 class="page-title">設定與資料管理</h2>
      <span class="page-subtitle">自訂學習節奏、詞庫偏好與離線備份</span>
    </header>

    <!-- 學習偏好設定 -->
    <section class="settings-section">
      <h3 class="section-title">學習偏好</h3>
      
      <div class="setting-item">
        <div class="setting-label-group">
          <label class="setting-label">每日新字上限</label>
          <span class="setting-desc">每天排入的新單字數量（錯題複習不占此額度）</span>
        </div>
        <select
          v-model.number="settings.dailyNewWords"
          class="setting-select"
          @change="settings.setDailyNewWords(settings.dailyNewWords)"
        >
          <option :value="10">10 個單字</option>
          <option :value="15">15 個單字</option>
          <option :value="20">20 個單字（推薦）</option>
          <option :value="30">30 個單字</option>
          <option :value="50">50 個單字</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-label-group">
          <label class="setting-label">每日複習上限</label>
          <span class="setting-desc">避免複習堆積過多造成負擔</span>
        </div>
        <select
          v-model.number="settings.dailyReviewLimit"
          class="setting-select"
          @change="settings.setDailyReviewLimit(settings.dailyReviewLimit)"
        >
          <option :value="50">50 個單字</option>
          <option :value="100">100 個單字（推薦）</option>
          <option :value="150">150 個單字</option>
          <option :value="200">200 個單字</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-label-group">
          <label class="setting-label">主詞庫目標</label>
          <span class="setting-desc">切換首頁預設學習的詞庫</span>
        </div>
        <div class="category-toggle">
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: settings.activeCategory === 'gsat' }"
            @click="handleCategoryChange('gsat')"
          >
            高中學測
          </button>
          <button
            type="button"
            class="toggle-btn"
            :class="{ active: settings.activeCategory === 'toeic' }"
            @click="handleCategoryChange('toeic')"
          >
            多益 TSL
          </button>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-label-group">
          <label class="setting-label">詞庫等級</label>
          <span class="setting-desc">
            {{ settings.activeCategory === 'gsat' ? '學測 Level 1~6' : '多益入門 / 中階 / 進階' }}
          </span>
        </div>
        <select
          v-model.number="settings.activeLevel"
          class="setting-select"
          @change="settings.setActiveLevel(settings.activeLevel)"
        >
          <template v-if="settings.activeCategory === 'gsat'">
            <option :value="1">Level 1（基礎）</option>
            <option :value="2">Level 2</option>
            <option :value="3">Level 3</option>
            <option :value="4">Level 4</option>
            <option :value="5">Level 5</option>
            <option :value="6">Level 6（高階）</option>
          </template>
          <template v-else>
            <option :value="1">入門（頻率排名前 400 字）</option>
            <option :value="2">中階（401 ~ 800 字）</option>
            <option :value="3">進階（801 ~ 1200 字）</option>
          </template>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-label-group">
          <label class="setting-label">單字朗讀語速</label>
          <span class="setting-desc">使用裝置內建語音朗讀</span>
        </div>
        <select
          v-model.number="settings.ttsRate"
          class="setting-select"
          @change="settings.setTtsRate(settings.ttsRate)"
        >
          <option :value="0.75">慢速 (0.75x)</option>
          <option :value="1.0">標準 (1.0x)</option>
          <option :value="1.25">快速 (1.25x)</option>
        </select>
      </div>
    </section>

    <!-- 資料備份與還原 -->
    <section class="settings-section">
      <h3 class="section-title">備份與本機儲存</h3>

      <div class="backup-actions">
        <div class="backup-card">
          <div class="backup-info">
            <span class="backup-icon">💾</span>
            <div>
              <strong>匯出學習紀錄 (JSON)</strong>
              <p>
                上次備份時間：{{ settings.lastBackupDate || '尚未備份' }}
              </p>
            </div>
          </div>
          <button type="button" class="btn btn-primary" @click="handleExportBackup">
            匯出備份檔案
          </button>
        </div>

        <div class="backup-card">
          <div class="backup-info">
            <span class="backup-icon">📥</span>
            <div>
              <strong>匯入學習紀錄</strong>
              <p>從本機 JSON 備份檔還原，換手機或誤清資料時使用</p>
            </div>
          </div>
          <div class="import-actions">
            <input
              ref="fileInputRef"
              type="file"
              accept=".json"
              class="hidden-file-input"
              @change="handleFileSelected"
            />
            <button type="button" class="btn btn-secondary" @click="triggerFileInput('merge')">
              合併匯入
            </button>
            <button type="button" class="btn btn-secondary" @click="triggerFileInput('overwrite')">
              完整還原
            </button>
          </div>
        </div>

        <!-- 持久儲存狀態 -->
        <div class="backup-card">
          <div class="backup-info">
            <span class="backup-icon">🛡️</span>
            <div>
              <strong>瀏覽器持久儲存 (Storage Persistence)</strong>
              <p>防止 iOS Safari 或瀏覽器在 7 天閒置時清除 IndexedDB 進度</p>
            </div>
          </div>
          <div class="persist-status-row">
            <span class="status-badge" :class="isPersisted ? 'badge-success' : 'badge-warning'">
              {{ isPersisted ? '✓ 已獲永久儲存授權' : '尚未啟用' }}
            </span>
            <button
              v-if="!isPersisted"
              type="button"
              class="btn btn-sm btn-primary"
              @click="handleRequestPersist"
            >
              請求持久儲存
            </button>
          </div>
        </div>

        <!-- 儲存空間使用情況 -->
        <div v-if="storageQuota" class="quota-info">
          <span>本機已使用容量：約 {{ (storageQuota.usedBytes / 1024).toFixed(1) }} KB / {{ (storageQuota.quotaBytes / (1024 * 1024)).toFixed(0) }} MB</span>
        </div>
      </div>
    </section>

    <!-- 關於與授權聲明 -->
    <section class="settings-section">
      <h3 class="section-title">關於與詞庫來源標示</h3>
      <div class="about-card">
        <h4 class="about-name">一字不漏 (Yizi Bulou) v1.0.0</h4>
        <p class="about-desc">
          專為高中生設計之學測與多益單字離線間隔複習 PWA，採用現代化 FSRS 演算法，所有資料僅存於學生裝置，無帳號、無追蹤、免網路。
        </p>
        <ul class="license-list">
          <li><strong>學測單字來源</strong>：大考中心高中英文參考詞彙表（111 學年度起適用，Level 1–6）。僅供非營利學習使用。</li>
          <li><strong>多益單字來源</strong>：TOEIC Service List 1.2 (TSL) 由 Charles Browne、Brent Culligan 與 Joseph Phillips 依據 CC BY-SA 4.0 條款授權釋出。</li>
          <li><strong>複習演算法</strong>：Free Spaced Repetition Scheduler (FSRS)。</li>
        </ul>
      </div>
    </section>

    <!-- 危險動作區 -->
    <section class="settings-section section-danger">
      <h3 class="section-title text-red">危險操作</h3>
      <div class="danger-box">
        <p>清空所有本機學習進度、複習紀錄與錯題本（不可復原，建議先匯出備份）：</p>
        <button type="button" class="btn btn-danger" @click="handleClearAllData">
          清空所有學習資料
        </button>
      </div>
    </section>

    <!-- 提示訊息 Toast -->
    <transition name="fade">
      <div v-if="toastMessage" class="toast-banner">
        {{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../stores/useSettingsStore';
import { db } from '../db';
import { exportToJson, triggerDownload, importFromJson } from '../services/backupService';
import { requestPersistentStorage, getStorageQuota } from '../services/storageService';

const settings = useSettingsStore();

const isPersisted = ref<boolean>(false);
const storageQuota = ref<{ usedBytes: number; quotaBytes: number; percentUsed: number } | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const importMode = ref<'merge' | 'overwrite'>('merge');
const toastMessage = ref<string>('');

onMounted(async () => {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
    try {
      isPersisted.value = await navigator.storage.persisted();
    } catch {
      isPersisted.value = false;
    }
  }
  storageQuota.value = await getStorageQuota();
});

function showToast(msg: string) {
  toastMessage.value = msg;
  setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
}

function handleCategoryChange(category: 'gsat' | 'toeic') {
  settings.setActiveCategory(category);
  settings.setActiveLevel(1);
}

async function handleRequestPersist() {
  const granted = await requestPersistentStorage();
  isPersisted.value = granted;
  showToast(granted ? '已成功取得瀏覽器永久儲存授權！' : '瀏覽器目前拒絕或不支援永久儲存請求');
}

async function handleExportBackup() {
  try {
    const jsonStr = await exportToJson();
    triggerDownload(jsonStr);
    const today = new Date().toISOString().split('T')[0];
    settings.setLastBackupDate(today);
    showToast('備份檔案下載成功！');
  } catch (err) {
    showToast('匯出失敗：' + (err as Error).message);
  }
}

function triggerFileInput(mode: 'merge' | 'overwrite') {
  importMode.value = mode;
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
}

async function handleFileSelected(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files && target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const content = e.target?.result as string;
    if (!content) return;

    try {
      const result = await importFromJson(content, importMode.value);
      if (result.success) {
        showToast(`還原成功！已還原 ${result.importedCount} 筆單字學習進度`);
      } else {
        showToast('還原失敗，檔案格式不正確');
      }
    } catch (err) {
      showToast('匯入失敗：' + (err as Error).message);
    }
  };
  reader.readAsText(file);
}

async function handleClearAllData() {
  const confirmed = window.confirm('確定要清空所有單字進度與錯題本嗎？此操作無法復原！');
  if (!confirmed) return;

  try {
    await db.clearAllTables();
    settings.resetSettings();
    showToast('所有資料已成功清空');
  } catch (err) {
    showToast('清空失敗：' + (err as Error).message);
  }
}
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-bottom: 24px;
}

.settings-header {
  margin-bottom: 4px;
}

.page-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
}

.page-subtitle {
  font-size: 0.8125rem;
  color: #64748b;
  margin-top: 4px;
  display: block;
}

.settings-section {
  background-color: #ffffff;
  border-radius: 16px;
  padding: 16px 20px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  margin: 0 0 4px 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  padding-bottom: 8px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f8fafc;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-label-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.setting-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.setting-desc {
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.4;
}

.setting-select {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background-color: #f8fafc;
  color: #0f172a;
  font-size: 0.875rem;
  min-height: 40px;
  cursor: pointer;
}

.category-toggle {
  display: flex;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #cbd5e1;
}

.toggle-btn {
  padding: 8px 14px;
  border: none;
  background-color: #f8fafc;
  color: #475569;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 40px;
}

.toggle-btn.active {
  background-color: #2563eb;
  color: #ffffff;
  font-weight: 600;
}

.backup-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.backup-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  background-color: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.backup-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.backup-icon {
  font-size: 1.5rem;
}

.backup-info strong {
  display: block;
  font-size: 0.875rem;
  color: #1e293b;
}

.backup-info p {
  margin: 2px 0 0 0;
  font-size: 0.75rem;
  color: #64748b;
}

.import-actions {
  display: flex;
  gap: 8px;
}

.hidden-file-input {
  display: none;
}

.persist-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 9999px;
}

.badge-success {
  background-color: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.badge-warning {
  background-color: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.quota-info {
  font-size: 0.75rem;
  color: #94a3b8;
  text-align: right;
}

.about-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.about-name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #1e293b;
}

.about-desc {
  margin: 0;
  font-size: 0.8125rem;
  color: #475569;
  line-height: 1.5;
}

.license-list {
  margin: 4px 0 0 0;
  padding-left: 20px;
  font-size: 0.75rem;
  color: #64748b;
  line-height: 1.6;
}

.section-danger {
  border-color: #fecaca;
  background-color: #fffafb;
}

.text-red {
  color: #dc2626 !important;
}

.danger-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.danger-box p {
  margin: 0;
  font-size: 0.8125rem;
  color: #7f1d1d;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  min-height: 40px;
  white-space: nowrap;
}

.btn-sm {
  padding: 4px 10px;
  min-height: 32px;
  font-size: 0.75rem;
}

.btn-primary {
  background-color: #2563eb;
  color: #ffffff;
}

.btn-primary:hover {
  background-color: #1d4ed8;
}

.btn-secondary {
  background-color: #ffffff;
  color: #334155;
  border-color: #cbd5e1;
}

.btn-secondary:hover {
  background-color: #f1f5f9;
}

.btn-danger {
  background-color: #ef4444;
  color: #ffffff;
}

.btn-danger:hover {
  background-color: #dc2626;
}

.toast-banner {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #1e293b;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 9999px;
  font-size: 0.875rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  white-space: nowrap;
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

