import {
  Card,
  ReviewLog,
  Rating,
  State,
  RecordLog,
  RecordLogItem,
  StateType,
  RatingType,
  Grade,
} from 'ts-fsrs';

export { Rating, State };
export type { Card, ReviewLog, RecordLog, RecordLogItem, StateType, RatingType, Grade };

/**
 * FSRSCard represents a spaced repetition card for a specific word,
 * extending the ts-fsrs Card interface.
 */
export interface FSRSCard extends Card {
  wordId: string;
  isDifficult?: boolean;
  // Compatibility aliases for Dexie progress table & camelCase conventions
  elapsedDays?: number;
  scheduledDays?: number;
  lastReview?: Date;
}

/**
 * FSRSRecordLog records the outcome of a review step,
 * extending the ts-fsrs ReviewLog interface.
 */
export interface FSRSRecordLog extends ReviewLog {
  wordId?: string;
  // Compatibility aliases for Dexie reviewLogs table & camelCase conventions
  elapsedDays?: number;
  lastElapsedDays?: number;
  scheduledDays?: number;
  reviewedAt?: Date;
}

/**
 * Four standard Rating labels used in flashcard mode
 */
export const RATING_LABELS: Record<Rating, string> = {
  [Rating.Manual]: '手動',
  [Rating.Again]: '忘了',
  [Rating.Hard]: '模糊',
  [Rating.Good]: '記得',
  [Rating.Easy]: '太簡單',
};

/**
 * Standard quiz to FSRS rating mapping:
 * - Correct: Rating 3 (Good)
 * - Incorrect: Rating 1 (Again)
 */
export interface QuizRatingMapping {
  correct: Rating;
  incorrect: Rating;
}

export const QUIZ_RATING_MAP: QuizRatingMapping = {
  correct: Rating.Good,    // 3
  incorrect: Rating.Again, // 1
};

/**
 * Options for generating daily study queue
 */
export interface DailyQueueConfig {
  reviewLimit?: number;    // default 100
  dailyNewWords?: number;  // default 20
  now?: Date;
}

export interface GenerateDailyQueueOptions<T = string> extends DailyQueueConfig {
  dueWords: T[];
  newWords: T[];
}

/**
 * Status and evaluation for leech (頑固字) tracking
 */
export interface LeechStatus {
  wordId?: string;
  isDifficult: boolean;
  lapses: number;
  consecutiveMistakes: number;
  sameDayMistakes: number;
  trackDates?: {
    day1: Date;
    day3: Date;
  };
}
