import type { PracticeMode } from './practice';

/**
 * 答錯複習短間隔階段
 * day1: 隔天複習階段 (Day+1)
 * day3: 第 3 天複習階段 (Day+3)
 * graduated: 已自短間隔中畢業，交回常規 FSRS 排程
 */
export type ShortIntervalStage = 'day1' | 'day3' | 'graduated';

/**
 * 最後作答結果狀態
 */
export type LastAnswerStatus = 'correct' | 'incorrect';

/**
 * 錯題追蹤核心資料結構
 */
export interface WrongRecord {
  /** 單字唯一識別碼 (主鍵) */
  wordId: string;
  /** 初次答錯時間 (ISO 8601 字串) */
  firstWrongAt: string;
  /** 累積錯誤次數 */
  incorrectCount: number;
  /** 當前短間隔複習階段 */
  stage: ShortIntervalStage;
  /** 下次追蹤日期 (格式: YYYY-MM-DD) */
  nextReviewDate: string;
  /** 是否為頑固字 (累積答錯次數 >= 3 次) */
  isLeech: boolean;
  /** 最後作答狀態 */
  lastAnswerStatus: LastAnswerStatus;
  /** 最後作答時間 (ISO 8601 字串) */
  lastReviewedAt?: string;
}

/**
 * 頑固字特化複習策略
 */
export interface LeechStrategy {
  /** 推薦題型（限制為拼字與聽寫） */
  recommendedModes: ('spelling' | 'dictation')[];
  /** 作答時是否強制顯示完整例句 */
  showFullSentence: boolean;
}

/**
 * 錯題練習推薦設定
 */
export interface WrongReviewConfig {
  leechThreshold: number; // 預設 3
  recommendedLeechModes: ('spelling' | 'dictation')[];
}

