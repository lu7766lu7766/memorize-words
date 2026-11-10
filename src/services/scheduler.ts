import { Rating } from '../types/fsrs';
import type {
  DailyQueueConfig,
  GenerateDailyQueueOptions,
  LeechStatus,
} from '../types/fsrs';

/**
 * Default constraints for daily practice queues
 */
export const DEFAULT_DAILY_NEW_WORDS = 20;
export const DEFAULT_REVIEW_LIMIT = 100;

/**
 * Generates the daily practice queue.
 * - Prioritizes overdue review words up to reviewLimit (default 100).
 * - Appends daily new words up to dailyNewWords (default 20).
 *
 * Supports both options object:
 *   generateDailyQueue({ dueWords, newWords, reviewLimit, dailyNewWords })
 * and positional parameters:
 *   generateDailyQueue(dueWords, newWords, { reviewLimit, dailyNewWords })
 */
export function generateDailyQueue<T = string>(
  dueOrOptions: T[] | GenerateDailyQueueOptions<T>,
  newWordsParam?: T[],
  configParam?: DailyQueueConfig
): T[] {
  let dueWords: T[] = [];
  let newWords: T[] = [];
  let reviewLimit = DEFAULT_REVIEW_LIMIT;
  let dailyNewWords = DEFAULT_DAILY_NEW_WORDS;

  if (Array.isArray(dueOrOptions)) {
    dueWords = dueOrOptions;
    newWords = newWordsParam ?? [];
    if (configParam?.reviewLimit !== undefined) {
      reviewLimit = configParam.reviewLimit;
    }
    if (configParam?.dailyNewWords !== undefined) {
      dailyNewWords = configParam.dailyNewWords;
    }
  } else {
    dueWords = dueOrOptions.dueWords ?? [];
    newWords = dueOrOptions.newWords ?? [];
    if (dueOrOptions.reviewLimit !== undefined) {
      reviewLimit = dueOrOptions.reviewLimit;
    }
    if (dueOrOptions.dailyNewWords !== undefined) {
      dailyNewWords = dueOrOptions.dailyNewWords;
    }
  }

  const selectedDue = reviewLimit <= 0 ? [] : dueWords.slice(0, reviewLimit);
  const selectedNew = dailyNewWords <= 0 ? [] : newWords.slice(0, dailyNewWords);

  return [...selectedDue, ...selectedNew];
}

/**
 * Options for insertRetryWord
 */
export interface RetryInsertOptions {
  minOffset?: number; // default 3
  maxOffset?: number; // default 5
  fixedOffset?: number;
}

/**
 * 答錯即時插隊機制 (當日補救隊列):
 * 當使用者在複習或測驗中答錯 (Rating.Again)，調用 insertRetryWord(currentQueue, currentIndex, wordId)：
 * 將該單字動態插入「目前位置之後 3 ~ 5 張卡」的位置。
 * 若剩餘題目不足 3 張，則直接排入隊尾。
 *
 * @param currentQueue The active practice queue array (mutated in place)
 * @param currentIndex The index currently being answered
 * @param word The word ID or item to re-insert
 * @param offsetOrOptions Optional explicit offset (e.g. 3, 4, 5) or options
 * @returns The mutated queue
 */
export function insertRetryWord<T = string>(
  currentQueue: T[],
  currentIndex: number,
  word: T,
  offsetOrOptions?: number | RetryInsertOptions
): T[] {
  const remainingAfter = currentQueue.length - (currentIndex + 1);

  // If fewer than 3 cards remain after current position, append to end of queue
  if (remainingAfter < 3) {
    currentQueue.push(word);
    return currentQueue;
  }

  let offset: number;
  if (typeof offsetOrOptions === 'number') {
    offset = offsetOrOptions;
  } else if (offsetOrOptions?.fixedOffset !== undefined) {
    offset = offsetOrOptions.fixedOffset;
  } else {
    const minOffset = offsetOrOptions?.minOffset ?? 3;
    const maxOffset = Math.min(offsetOrOptions?.maxOffset ?? 5, remainingAfter);
    if (maxOffset < minOffset) {
      currentQueue.push(word);
      return currentQueue;
    }
    offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
  }

  const targetIndex = Math.min(currentIndex + offset, currentQueue.length);
  currentQueue.splice(targetIndex, 0, word);
  return currentQueue;
}

/**
 * Calculates Day+1 and Day+3 tracking review dates for leech words.
 */
export function getLeechTrackDates(baseDate: Date = new Date()): { day1: Date; day3: Date } {
  const day1 = new Date(baseDate);
  day1.setDate(day1.getDate() + 1);

  const day3 = new Date(baseDate);
  day3.setDate(day3.getDate() + 3);

  return { day1, day3 };
}

export const calculateLeechReviewDates = getLeechTrackDates;

/**
 * Evaluates whether a word is considered a leech (頑固字):
 * - Cumulative lapses >= 3
 * - Or same-day repetitions / mistakes >= 3
 * - Or consecutive wrong answers >= 3
 * - Or already marked isDifficult = true
 */
export function isLeechWord(
  input:
    | number
    | {
        lapses?: number;
        sameDayMistakes?: number;
        consecutiveMistakes?: number;
        streakMistakes?: number;
        isDifficult?: boolean;
      }
): boolean {
  if (typeof input === 'number') {
    return input >= 3;
  }
  return Boolean(
    input.isDifficult ||
      (input.lapses !== undefined && input.lapses >= 3) ||
      (input.sameDayMistakes !== undefined && input.sameDayMistakes >= 3) ||
      (input.consecutiveMistakes !== undefined && input.consecutiveMistakes >= 3) ||
      (input.streakMistakes !== undefined && input.streakMistakes >= 3)
  );
}

export const isDifficultWord = isLeechWord;

/**
 * Evaluates mistake progression for a word.
 * When cumulative lapses or consecutive/same-day mistakes reach 3+,
 * triggers leech mark (isDifficult = true) and assigns Day+1 and Day+3 track dates.
 */
export function evaluateLeechStatus(
  currentState: {
    wordId?: string;
    lapses?: number;
    consecutiveMistakes?: number;
    sameDayMistakes?: number;
    streakMistakes?: number;
    isDifficult?: boolean;
  },
  ratingOrCorrect: Rating | number | boolean,
  baseDate: Date = new Date()
): LeechStatus {
  const isCorrect =
    typeof ratingOrCorrect === 'boolean'
      ? ratingOrCorrect
      : ratingOrCorrect !== 1 && ratingOrCorrect !== Rating.Again;

  const prevLapses = currentState.lapses ?? 0;
  const prevConsecutive =
    currentState.consecutiveMistakes ?? currentState.streakMistakes ?? 0;
  const prevSameDay = currentState.sameDayMistakes ?? 0;
  const wasDifficult = Boolean(currentState.isDifficult);

  if (isCorrect) {
    const isDifficult = wasDifficult || prevLapses >= 3;
    return {
      wordId: currentState.wordId,
      isDifficult,
      lapses: prevLapses,
      consecutiveMistakes: 0,
      sameDayMistakes: prevSameDay,
      ...(isDifficult ? { trackDates: getLeechTrackDates(baseDate) } : {}),
    };
  } else {
    const newLapses = prevLapses + 1;
    const newConsecutive = prevConsecutive + 1;
    const newSameDay = prevSameDay + 1;
    const isDifficult =
      wasDifficult || newLapses >= 3 || newConsecutive >= 3 || newSameDay >= 3;

    return {
      wordId: currentState.wordId,
      isDifficult,
      lapses: newLapses,
      consecutiveMistakes: newConsecutive,
      sameDayMistakes: newSameDay,
      ...(isDifficult ? { trackDates: getLeechTrackDates(baseDate) } : {}),
    };
  }
}

export const evaluateWordMistake = evaluateLeechStatus;

/**
 * PracticeQueue manages the clear-the-deck dynamic retry queue during a session.
 * Guarantees that the session only finishes once every mistake has been cleared.
 */
export class PracticeQueue<T = string> {
  private queue: T[];
  private currentIndex: number = 0;
  private mistakesCount: Map<T, number> = new Map();

  constructor(initialItems: T[]) {
    this.queue = [...initialItems];
  }

  get items(): T[] {
    return this.queue;
  }

  get index(): number {
    return this.currentIndex;
  }

  get currentItem(): T | undefined {
    return this.queue[this.currentIndex];
  }

  get length(): number {
    return this.queue.length;
  }

  get remaining(): number {
    return Math.max(0, this.queue.length - this.currentIndex);
  }

  get isCompleted(): boolean {
    return this.currentIndex >= this.queue.length;
  }

  /**
   * Process the current card answer.
   * If incorrect, inserts the item 3~5 cards behind.
   * Advances the current pointer.
   */
  handleAnswer(
    isCorrect: boolean,
    offset?: number
  ): {
    currentItem: T | undefined;
    inserted: boolean;
    isCompleted: boolean;
    mistakesCount: number;
  } {
    if (this.isCompleted) {
      return {
        currentItem: undefined,
        inserted: false,
        isCompleted: true,
        mistakesCount: 0,
      };
    }

    const currentItem = this.queue[this.currentIndex];
    let inserted = false;

    if (!isCorrect) {
      const currentMistakes = (this.mistakesCount.get(currentItem) ?? 0) + 1;
      this.mistakesCount.set(currentItem, currentMistakes);
      insertRetryWord(this.queue, this.currentIndex, currentItem, offset);
      inserted = true;
    }

    this.currentIndex++;

    return {
      currentItem,
      inserted,
      isCompleted: this.isCompleted,
      mistakesCount: this.mistakesCount.get(currentItem) ?? 0,
    };
  }
}
