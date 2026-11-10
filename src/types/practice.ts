/**
 * 練習模式型別
 * flashcard: 翻卡模式
 * quiz: 四選一選擇題
 * spelling: 拼字練習
 * dictation: 聽寫模式
 */
export type PracticeMode = 'flashcard' | 'quiz' | 'spelling' | 'dictation';

/**
 * 例句結構
 */
export interface PracticeExample {
  en: string;
  zh: string;
}

/**
 * 練習卡片資料結構
 */
export interface PracticeItem {
  id: string;
  word: string;
  phonetic?: string;
  definition: string;
  examples?: PracticeExample[];
  example?: string;
  exampleTranslation?: string;
  pos: string[];
  level: number;
  tags?: string[];
  category?: ('gsat' | 'toeic')[];
  incorrectCount: number;
  isLeech: boolean;
  showFullSentence?: boolean;
}

/**
 * FSRS 與練習評分等級
 * 1: Again (忘了)
 * 2: Hard (模糊)
 * 3: Good (記得)
 * 4: Easy (太簡單)
 */
export type RatingLevel = 'again' | 'hard' | 'good' | 'easy';
export type NumericRating = 1 | 2 | 3 | 4;
export type PracticeRating = RatingLevel | NumericRating;

export const PracticeRatingEnum = {
  Again: 1,
  Hard: 2,
  Good: 3,
  Easy: 4,
} as const;

/**
 * 單次作答結果紀錄
 */
export interface PracticeAnswerResult {
  itemId: string;
  word: string;
  isCorrect: boolean;
  rating?: PracticeRating;
  userAnswer?: string;
  round: 'main' | 'cleared';
  timestamp: number;
  timeSpentMs?: number;
}

/**
 * 練習結算統計數據
 */
export interface PracticeStats {
  durationMs: number;
  totalQuestions: number;
  uniqueWordsCount: number;
  totalAttempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  firstPassCorrectRate: number;
  firstPassCorrectCount: number;
  firstPassTotalCount: number;
  incorrectItems: PracticeItem[];
  completedAt?: number;
}

