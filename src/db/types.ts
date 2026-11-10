/**
 * 資料庫型別定義 (Dexie.js IndexedDB Types)
 * 遵循 TASK-03 規格
 */

/**
 * 單字學習進度 (Word Progress)
 * 對應 Dexie 資料表 `progress`
 */
export interface WordProgress {
  /** 單字識別碼 (主鍵) */
  wordId: string;
  /** 下次複習時間 */
  due: Date;
  /** FSRS 記憶穩定度 (Stability) */
  stability: number;
  /** FSRS 難度 (Difficulty) */
  difficulty: number;
  /** 距離上次複習經過天數 */
  elapsedDays: number;
  /** 排定複習間隔天數 */
  scheduledDays: number;
  /** 複習次數 */
  reps: number;
  /** 答錯次數 (Lapses) */
  lapses: number;
  /** FSRS 狀態 (0: New, 1: Learning, 2: Review, 3: Relearning) */
  state: number;
  /** 上次複習時間 */
  lastReview: Date | null;
  /** 頑固字標記 (累積答錯 >= 3 次) */
  isDifficult: boolean;
}

/**
 * 複習歷史紀錄 (Review Log)
 * 對應 Dexie 資料表 `reviewLogs`
 */
export interface ReviewLog {
  /** 自增主鍵 */
  id?: number;
  /** 單字識別碼 */
  wordId: string;
  /** 評分 (1: Again, 2: Hard, 3: Good, 4: Easy) */
  rating: number;
  /** FSRS 狀態 */
  state: number;
  /** 複習排定時間 */
  due: Date;
  /** 複習後穩定度 */
  stability: number;
  /** 複習後難度 */
  difficulty: number;
  /** 複習時間戳記 */
  reviewedAt: Date;
}

/**
 * 答錯專屬計畫追蹤 (Mistake Tracking Record)
 * 對應 Dexie 資料表 `mistakes`
 */
export interface MistakeRecord {
  /** 單字識別碼 (主鍵) */
  wordId: string;
  /** 連續錯題次數 */
  streakMistakes: number;
  /** 階段 (1: 當日補救, 2: 隔天, 3: 第3天, 4: 頑固字) */
  stage: number;
  /** 下次追蹤日期 (YYYY-MM-DD) */
  nextTrackDate: string;
}

/**
 * 每日學習里程碑統計 (Daily Milestone Statistics)
 * 對應 Dexie 資料表 `dailyStats`
 */
export interface DailyStat {
  /** 日期 (主鍵, YYYY-MM-DD) */
  date: string;
  /** 今日新學單字數 */
  newWordsCount: number;
  /** 今日複習次數 */
  reviewsCount: number;
  /** 連續學習天數 (Streak) */
  streakDays: number;
  /** 今日學習目標是否達成 */
  completed: boolean;
}

/**
 * 學習階段篩選設定 (Study Session Filter)
 */
export interface StudySessionFilter {
  /** 詞庫類別 ('gsat' | 'toeic' 等) */
  category: string;
  /** 等級 (學測 1~6, 多益 1~3) */
  level: number;
  /** 每日新字上限 */
  newLimit: number;
  /** 每日複習上限 */
  reviewLimit: number;
}

