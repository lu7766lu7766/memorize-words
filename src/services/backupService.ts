/**
 * 高中生背單字 PWA「一字不漏」- 備份匯出／匯入與完整性驗證服務 (TASK-05)
 */

import { Dexie, type Table } from 'dexie';
import { db as appDb } from '../db';
import type {
  BackupPayload,
  BackupPayloadData,
  BackupValidationResult,
  BackupWordProgress,
  BackupMistakeRecord,
  BackupDailyStat,
  BackupSettings,
  ImportMode,
  ImportResult,
} from '../types/backup';

/**
 * 預設 Dexie 資料庫實例結構
 */
export class YiziBulouDatabase extends Dexie {
  progress!: Table<BackupWordProgress, string>;
  mistakes!: Table<BackupMistakeRecord, string>;
  dailyStats!: Table<BackupDailyStat, string>;

  constructor(dbName = 'yizi_bulou_db') {
    super(dbName);
    this.version(1).stores({
      progress: '&wordId, due, state, lapses, isDifficult, lastReview',
      reviewLogs: '++id, wordId, reviewedAt, rating',
      mistakes: '&wordId, stage, nextTrackDate',
      dailyStats: '&date',
    });
  }
}

let activeDbInstance: Dexie | null = null;

/**
 * 取得當前使用的 Dexie 資料庫實例
 */
export function getDb(): Dexie {
  if (activeDbInstance) {
    return activeDbInstance;
  }
  if (appDb) {
    return appDb;
  }
  activeDbInstance = new YiziBulouDatabase();
  return activeDbInstance;
}

export const getDatabase = getDb;

/**
 * 自訂或重設 Dexie 資料庫實例（單元測試或相依注入時使用）
 */
export function setDb(db: Dexie | null): void {
  activeDbInstance = db;
}

export const setDatabase = setDb;

/**
 * 物件正規化字串化（保證物件鍵依字母排序，確保相同物件計算出唯一的 Checksum）
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const record = obj as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJsonStringify(record[k])).join(',') + '}';
}

/**
 * 計算 Payload 校驗碼 (FNV-1a 32-bit Hash 轉 16 進位字串)
 */
export function computeChecksum(payload: unknown): string {
  const canonical = canonicalJsonStringify(payload);
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) {
    hash ^= canonical.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * 讀取 localStorage 中的使用者設定
 */
function getStoredSettings(): BackupSettings {
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem('yizi_settings') || localStorage.getItem('yizi-bulou-settings');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return {
    dailyNewWords: 20,
    dailyReviewLimit: 100,
    ttsRate: 1.0,
    activeCategory: 'gsat',
    activeLevel: 1,
    lastBackupDate: null,
  };
}

/**
 * 寫入設定至 localStorage
 */
function saveStoredSettings(settings: BackupSettings): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('yizi_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }
}

/**
 * 匯出學習進度與設定為標準備份 JSON 字串
 */
export async function exportToJson(): Promise<string> {
  const db = getDb();

  const progress: BackupWordProgress[] = db.tables.some((t) => t.name === 'progress')
    ? await db.table('progress').toArray()
    : [];

  const mistakes: BackupMistakeRecord[] = db.tables.some((t) => t.name === 'mistakes')
    ? await db.table('mistakes').toArray()
    : [];

  const dailyStats: BackupDailyStat[] = db.tables.some((t) => t.name === 'dailyStats')
    ? await db.table('dailyStats').toArray()
    : [];

  const nowIso = new Date().toISOString();
  const settings = getStoredSettings();
  settings.lastBackupDate = nowIso;
  saveStoredSettings(settings);

  const payloadData: BackupPayloadData = {
    progress,
    mistakes,
    dailyStats,
    settings,
  };

  const checksum = computeChecksum(payloadData);

  const backup: BackupPayload = {
    app: 'yizi-bulou',
    version: '1.0.0',
    exportedAt: nowIso,
    payload: payloadData,
    checksum,
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * 觸發瀏覽器下載備份檔案（檔案格式預設為 yizi-bulou-backup-YYYYMMDD.json）
 */
export function triggerDownload(jsonContent: string, filename?: string): void {
  if (!filename) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    filename = `yizi-bulou-backup-${yyyy}${mm}${dd}.json`;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(blob)
    : '';

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  if (a.parentNode) {
    a.parentNode.removeChild(a);
  }

  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
}

/**
 * 防呆校驗備份 JSON 字串之合法性、必要欄位與資料完整性 Checksum
 */
export function validateBackup(rawJson: string): BackupValidationResult {
  if (!rawJson || typeof rawJson !== 'string' || !rawJson.trim()) {
    return { valid: false, message: '備份資料為空或非字串' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { valid: false, message: 'JSON 格式無效，無法解析' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, message: '備份資料根結構必須為物件' };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.app !== 'yizi-bulou') {
    return { valid: false, message: '非本應用程式 (yizi-bulou) 之備份檔案' };
  }

  if (obj.version !== '1.0.0') {
    return { valid: false, message: `不支援的備份版本: ${obj.version}` };
  }

  if (!obj.exportedAt || typeof obj.exportedAt !== 'string' || isNaN(new Date(obj.exportedAt).getTime())) {
    return { valid: false, message: '缺少有效的匯出時間 (exportedAt)' };
  }

  if (!obj.payload || typeof obj.payload !== 'object' || Array.isArray(obj.payload)) {
    return { valid: false, message: '缺少有效的 payload 資料結構' };
  }

  const payload = obj.payload as Record<string, unknown>;

  if (!Array.isArray(payload.progress)) {
    return { valid: false, message: 'payload 缺少 progress 單字學習進度清單' };
  }

  for (let index = 0; index < payload.progress.length; index++) {
    const item = payload.progress[index];
    if (!item || typeof item !== 'object' || typeof (item as { wordId?: unknown }).wordId !== 'string' || !(item as { wordId: string }).wordId.trim()) {
      return { valid: false, message: `進度資料第 ${index} 筆項目損毀：缺少有效 wordId` };
    }
  }

  if (!obj.checksum || typeof obj.checksum !== 'string') {
    return { valid: false, message: '缺少資料校驗碼 (checksum)' };
  }

  const expectedChecksum = computeChecksum(payload);
  if (obj.checksum !== expectedChecksum) {
    return { valid: false, message: '資料校驗碼 (checksum) 不符，檔案內容可能已損毀或被篡改' };
  }

  return {
    valid: true,
    data: parsed as BackupPayload,
  };
}

/**
 * 匯入備份資料
 * @param rawJson 備份 JSON 字串
 * @param mode 'overwrite' (清空現有進度表後還原) 或 'merge' (比對單字 ID，以 lastReview 較新者優先保留)
 */
export async function importFromJson(
  rawJson: string,
  mode: ImportMode = 'overwrite'
): Promise<ImportResult> {
  const validation = validateBackup(rawJson);
  if (!validation.valid || !validation.data) {
    return {
      success: false,
      importedCount: 0,
      message: validation.message || '備份驗證失敗',
    };
  }

  const { payload } = validation.data;
  const db = getDb();
  let importedCount = 0;

  const hasProgress = db.tables.some((t) => t.name === 'progress');
  const hasMistakes = db.tables.some((t) => t.name === 'mistakes');
  const hasDailyStats = db.tables.some((t) => t.name === 'dailyStats');

  if (mode === 'overwrite') {
    if (hasProgress) {
      const progressTable = db.table('progress');
      await progressTable.clear();
      if (payload.progress && payload.progress.length > 0) {
        await progressTable.bulkAdd(payload.progress);
      }
      importedCount = payload.progress ? payload.progress.length : 0;
    }

    if (hasMistakes && payload.mistakes) {
      const mistakesTable = db.table('mistakes');
      await mistakesTable.clear();
      if (payload.mistakes.length > 0) {
        await mistakesTable.bulkAdd(payload.mistakes);
      }
    }

    if (hasDailyStats && payload.dailyStats) {
      const dailyStatsTable = db.table('dailyStats');
      await dailyStatsTable.clear();
      if (payload.dailyStats.length > 0) {
        await dailyStatsTable.bulkAdd(payload.dailyStats);
      }
    }

    if (payload.settings) {
      saveStoredSettings(payload.settings);
    }
  } else {
    // merge 模式：依單字 ID 比對，若兩邊皆有紀錄，以 lastReview 時間較新者優先保留
    if (hasProgress && payload.progress) {
      const progressTable = db.table('progress');
      for (const item of payload.progress) {
        const existing = await progressTable.get(item.wordId);
        if (!existing) {
          await progressTable.add(item);
          importedCount++;
        } else {
          const existingTime = existing.lastReview ? new Date(existing.lastReview).getTime() : 0;
          const incomingTime = item.lastReview ? new Date(item.lastReview).getTime() : 0;
          if (incomingTime > existingTime) {
            await progressTable.put(item);
            importedCount++;
          }
        }
      }
    }

    if (hasMistakes && payload.mistakes) {
      const mistakesTable = db.table('mistakes');
      for (const mistake of payload.mistakes) {
        const existing = await mistakesTable.get(mistake.wordId);
        if (!existing) {
          await mistakesTable.add(mistake);
        } else if (mistake.streakMistakes > (existing.streakMistakes ?? 0)) {
          await mistakesTable.put(mistake);
        }
      }
    }

    if (hasDailyStats && payload.dailyStats) {
      const dailyStatsTable = db.table('dailyStats');
      for (const stat of payload.dailyStats) {
        const existing = await dailyStatsTable.get(stat.date);
        if (!existing) {
          await dailyStatsTable.add(stat);
        } else {
          await dailyStatsTable.put({ ...existing, ...stat });
        }
      }
    }

    if (payload.settings) {
      const current = getStoredSettings();
      saveStoredSettings({ ...current, ...payload.settings });
    }
  }

  return {
    success: true,
    importedCount,
  };
}

/**
 * 每週備份提醒邏輯判斷
 * 距離上次備份超過 7 天（或從未備份）回傳 true
 */
export function shouldRemindBackup(lastBackupDate: string | null): boolean {
  if (!lastBackupDate) {
    return true;
  }
  const lastDate = new Date(lastBackupDate);
  if (isNaN(lastDate.getTime())) {
    return true;
  }
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > 7;
}
