/**
 * 高中生背單字 PWA「一字不漏」- 備份與持久儲存型別定義 (TASK-05)
 */

export interface BackupWordProgress {
  wordId: string;
  due: string | Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | Date;
  isDifficult: boolean;
}

export interface BackupMistakeRecord {
  wordId: string;
  streakMistakes: number;
  stage: number;
  nextTrackDate: string | Date;
}

export interface BackupDailyStat {
  date: string;
  newWordsCount: number;
  reviewsCount: number;
  streakDays: number;
  completed: boolean;
}

export interface BackupSettings {
  dailyNewWords?: number;
  dailyReviewLimit?: number;
  ttsRate?: number;
  activeCategory?: 'gsat' | 'toeic';
  activeLevel?: number;
  lastBackupDate?: string | null;
  [key: string]: unknown;
}

export interface BackupPayloadData {
  progress: BackupWordProgress[];
  mistakes?: BackupMistakeRecord[];
  dailyStats?: BackupDailyStat[];
  settings?: BackupSettings;
  [key: string]: unknown;
}

export interface BackupPayload {
  app: 'yizi-bulou';
  version: '1.0.0';
  exportedAt: string;
  payload: BackupPayloadData;
  checksum: string;
}

export interface BackupValidationResult {
  valid: boolean;
  message?: string;
  data?: BackupPayload;
}

export type ImportMode = 'overwrite' | 'merge';

export interface ImportResult {
  success: boolean;
  importedCount: number;
  message?: string;
}

export interface StorageQuotaInfo {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

export interface PlatformInfo {
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
}
