import { describe, it, expect } from 'vitest';
import {
  generateDailyQueue,
  insertRetryWord,
  isLeechWord,
  evaluateLeechStatus,
  getLeechTrackDates,
  PracticeQueue,
  DEFAULT_DAILY_NEW_WORDS,
  DEFAULT_REVIEW_LIMIT,
} from '../src/services/scheduler';
import { Rating } from '../src/types/fsrs';

describe('Scheduler Service', () => {
  describe('generateDailyQueue', () => {
    it('strictly limits new words to dailyNewWords default (20)', () => {
      const dueWords = ['d1', 'd2', 'd3'];
      const newWords = Array.from({ length: 50 }, (_, i) => `new_${i + 1}`);

      const queue = generateDailyQueue({
        dueWords,
        newWords,
      });

      // 3 due + 20 new = 23
      expect(queue.length).toBe(23);
      expect(queue.slice(0, 3)).toEqual(dueWords);
      // Ensure only first 20 new words are included
      expect(queue.slice(3)).toEqual(newWords.slice(0, DEFAULT_DAILY_NEW_WORDS));
    });

    it('respects custom dailyNewWords setting (e.g. 10)', () => {
      const dueWords = ['d1'];
      const newWords = Array.from({ length: 30 }, (_, i) => `new_${i + 1}`);

      const queue = generateDailyQueue({
        dueWords,
        newWords,
        dailyNewWords: 10,
      });

      expect(queue.length).toBe(11);
      expect(queue.slice(1)).toEqual(newWords.slice(0, 10));
    });

    it('supports pausing new words when dailyNewWords is 0 (anti-backlog mode)', () => {
      const dueWords = ['d1', 'd2', 'd3'];
      const newWords = ['new_1', 'new_2'];

      const queue = generateDailyQueue({
        dueWords,
        newWords,
        dailyNewWords: 0,
      });

      expect(queue).toEqual(dueWords);
    });

    it('strictly limits review words to reviewLimit (default 100 or custom)', () => {
      const dueWords = Array.from({ length: 150 }, (_, i) => `due_${i + 1}`);
      const newWords = ['new_1', 'new_2'];

      const queue = generateDailyQueue({
        dueWords,
        newWords,
        reviewLimit: 50,
        dailyNewWords: 20,
      });

      expect(queue.length).toBe(52); // 50 review + 2 new
      expect(queue.slice(0, 50)).toEqual(dueWords.slice(0, 50));
      expect(queue.slice(50)).toEqual(newWords);
    });

    it('orders overdue review words first, followed by new words', () => {
      const dueWords = ['review_A', 'review_B'];
      const newWords = ['new_A', 'new_B'];

      const queue = generateDailyQueue(dueWords, newWords);

      expect(queue[0]).toBe('review_A');
      expect(queue[1]).toBe('review_B');
      expect(queue[2]).toBe('new_A');
      expect(queue[3]).toBe('new_B');
    });

    it('handles empty due words or empty new words gracefully', () => {
      expect(generateDailyQueue([], [])).toEqual([]);
      expect(generateDailyQueue(['due_1'], [])).toEqual(['due_1']);
      expect(generateDailyQueue([], ['new_1'])).toEqual(['new_1']);
    });
  });

  describe('insertRetryWord (答錯即時插隊機制)', () => {
    it('inserts failed word 3~5 cards behind current position (random within [3, 5])', () => {
      for (let run = 0; run < 50; run++) {
        const queue = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'];
        const currentIndex = 0;
        const failedWord = queue[currentIndex];

        insertRetryWord(queue, currentIndex, failedWord);

        // Find next occurrence of failedWord after currentIndex
        const nextOccurrence = queue.indexOf(failedWord, currentIndex + 1);
        const offset = nextOccurrence - currentIndex;

        expect(offset).toBeGreaterThanOrEqual(3);
        expect(offset).toBeLessThanOrEqual(5);
        expect(queue.length).toBe(11);
      }
    });

    it('inserts at middle index of queue with offset between 3 and 5', () => {
      for (let run = 0; run < 30; run++) {
        const queue = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8', 'w9'];
        const currentIndex = 3; // 'w3'
        const failedWord = queue[currentIndex];

        insertRetryWord(queue, currentIndex, failedWord);

        const nextOccurrence = queue.indexOf(failedWord, currentIndex + 1);
        const offset = nextOccurrence - currentIndex;

        expect(offset).toBeGreaterThanOrEqual(3);
        expect(offset).toBeLessThanOrEqual(5);
      }
    });

    it('supports explicit fixed offset within [3, 5]', () => {
      const q3 = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
      insertRetryWord(q3, 0, 'w0', 3);
      expect(q3.indexOf('w0', 1)).toBe(3);

      const q4 = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
      insertRetryWord(q4, 0, 'w0', 4);
      expect(q4.indexOf('w0', 1)).toBe(4);

      const q5 = ['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6'];
      insertRetryWord(q5, 0, 'w0', 5);
      expect(q5.indexOf('w0', 1)).toBe(5);
    });

    it('appends to end of queue when fewer than 3 cards remain after current index', () => {
      const queue = ['w0', 'w1', 'w2', 'w3'];
      const currentIndex = 2; // only 1 card ('w3') remains after current
      const failedWord = queue[currentIndex];

      insertRetryWord(queue, currentIndex, failedWord);

      expect(queue.length).toBe(5);
      expect(queue[queue.length - 1]).toBe(failedWord);
    });

    it('appends to end when at the very last card in queue', () => {
      const queue = ['w0', 'w1', 'w2'];
      const currentIndex = 2; // last card
      insertRetryWord(queue, currentIndex, 'w2');

      expect(queue.length).toBe(4);
      expect(queue[3]).toBe('w2');
    });
  });

  describe('Leech Word Logic (頑固字累計 3 次判定邏輯)', () => {
    it('upgrades to leech (isDifficult = true) when consecutive mistakes reach 3', () => {
      let state: any = {
        wordId: 'w_difficult_001',
        lapses: 0,
        consecutiveMistakes: 0,
        sameDayMistakes: 0,
        isDifficult: false,
      };

      // 1st mistake
      state = evaluateLeechStatus(state, Rating.Again);
      expect(state.isDifficult).toBe(false);
      expect(state.lapses).toBe(1);
      expect(state.consecutiveMistakes).toBe(1);
      expect(state.trackDates).toBeUndefined();

      // 2nd mistake
      state = evaluateLeechStatus(state, Rating.Again);
      expect(state.isDifficult).toBe(false);
      expect(state.lapses).toBe(2);
      expect(state.consecutiveMistakes).toBe(2);
      expect(state.trackDates).toBeUndefined();

      // 3rd mistake -> upgrades to leech!
      const baseDate = new Date('2026-05-01T10:00:00Z');
      state = evaluateLeechStatus(state, Rating.Again, baseDate);
      expect(state.isDifficult).toBe(true);
      expect(state.lapses).toBe(3);
      expect(state.consecutiveMistakes).toBe(3);
      expect(state.trackDates).toBeDefined();

      // Day+1 and Day+3 tracking dates
      const day1 = new Date(baseDate);
      day1.setDate(day1.getDate() + 1);
      const day3 = new Date(baseDate);
      day3.setDate(day3.getDate() + 3);

      expect(state.trackDates!.day1.getTime()).toBe(day1.getTime());
      expect(state.trackDates!.day3.getTime()).toBe(day3.getTime());
    });

    it('upgrades to leech when cumulative lapses reach 3 (even with intervening correct answers)', () => {
      let state: any = {
        wordId: 'w_cumulative_001',
        lapses: 0,
        consecutiveMistakes: 0,
        sameDayMistakes: 0,
        isDifficult: false,
      };

      // Mistake 1
      state = evaluateLeechStatus(state, false);
      expect(state.lapses).toBe(1);
      expect(state.consecutiveMistakes).toBe(1);

      // Correct answer resets consecutive mistake streak, but lapses stay at 1
      state = evaluateLeechStatus(state, true);
      expect(state.lapses).toBe(1);
      expect(state.consecutiveMistakes).toBe(0);
      expect(state.isDifficult).toBe(false);

      // Mistake 2
      state = evaluateLeechStatus(state, false);
      expect(state.lapses).toBe(2);

      // Another correct answer
      state = evaluateLeechStatus(state, true);
      expect(state.lapses).toBe(2);

      // Mistake 3 -> triggers leech status!
      state = evaluateLeechStatus(state, false);
      expect(state.lapses).toBe(3);
      expect(state.isDifficult).toBe(true);
      expect(state.trackDates).toBeDefined();
    });

    it('retains leech status once triggered even when answered correctly later', () => {
      const leechState = {
        wordId: 'w_persisted_leech',
        lapses: 3,
        isDifficult: true,
      };

      const result = evaluateLeechStatus(leechState, Rating.Good);
      expect(result.isDifficult).toBe(true);
      expect(result.trackDates).toBeDefined();
    });

    it('isLeechWord helper checks correctly with various input formats', () => {
      expect(isLeechWord(0)).toBe(false);
      expect(isLeechWord(2)).toBe(false);
      expect(isLeechWord(3)).toBe(true);
      expect(isLeechWord(4)).toBe(true);

      expect(isLeechWord({ lapses: 1 })).toBe(false);
      expect(isLeechWord({ lapses: 3 })).toBe(true);
      expect(isLeechWord({ consecutiveMistakes: 3 })).toBe(true);
      expect(isLeechWord({ sameDayMistakes: 3 })).toBe(true);
      expect(isLeechWord({ isDifficult: true })).toBe(true);
    });

    it('getLeechTrackDates calculates Day+1 and Day+3 accurately', () => {
      const base = new Date('2026-03-10T00:00:00Z');
      const { day1, day3 } = getLeechTrackDates(base);

      expect(day1.toISOString()).toBe('2026-03-11T00:00:00.000Z');
      expect(day3.toISOString()).toBe('2026-03-13T00:00:00.000Z');
    });
  });

  describe('PracticeQueue simulation (反覆清理錯題隊列 Clear-the-deck)', () => {
    it('keeps practicing until all mistaken cards are re-tested and passed', () => {
      const queue = new PracticeQueue(['wordA', 'wordB', 'wordC', 'wordD', 'wordE']);
      expect(queue.length).toBe(5);
      expect(queue.isCompleted).toBe(false);

      // wordA answered wrong -> inserted 3~5 cards behind
      const res0 = queue.handleAnswer(false, 3);
      expect(res0.inserted).toBe(true);
      expect(res0.isCompleted).toBe(false);
      expect(queue.length).toBe(6);

      // wordB answered correct
      queue.handleAnswer(true);
      // wordC answered correct
      queue.handleAnswer(true);
      // wordA reappears at index 3! Answer correct this time
      expect(queue.currentItem).toBe('wordA');
      queue.handleAnswer(true);

      // wordD answered correct
      queue.handleAnswer(true);
      // wordE answered correct
      const lastRes = queue.handleAnswer(true);

      expect(lastRes.isCompleted).toBe(true);
      expect(queue.isCompleted).toBe(true);
      expect(queue.remaining).toBe(0);
    });
  });
});
