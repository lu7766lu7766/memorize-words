import { describe, it, expect } from 'vitest';
import {
  createNewCard,
  scheduleNextReview,
  previewNextReviews,
  mapQuizRating,
  getRatingFromQuizResult,
  getRatingLabel,
  isCardDue,
} from '../src/services/fsrsService';
import { Rating, State, RATING_LABELS } from '../src/types/fsrs';

describe('FSRS Service - ts-fsrs Integration', () => {
  const baseDate = new Date('2026-01-01T12:00:00Z');

  describe('createNewCard', () => {
    it('initializes a new card with default State.New (0) and 0 reps', () => {
      const card = createNewCard('w_apple_001', baseDate);

      expect(card.wordId).toBe('w_apple_001');
      expect(card.state).toBe(State.New);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.stability).toBe(0);
      expect(card.difficulty).toBe(0);
      expect(card.elapsed_days).toBe(0);
      expect(card.scheduled_days).toBe(0);
      expect(card.due instanceof Date).toBe(true);
      expect(card.due.getTime()).toBe(baseDate.getTime());
      expect(card.isDifficult).toBe(false);
    });
  });

  describe('scheduleNextReview with 4 Ratings on a new card', () => {
    it('calculates correct state and parameters for Rating.Again (1 - 忘了)', () => {
      const initial = createNewCard('w_test_again', baseDate);
      const { card, log } = scheduleNextReview(initial, Rating.Again, baseDate);

      expect(card.wordId).toBe('w_test_again');
      expect(card.state).toBe(State.Learning);
      expect(card.reps).toBe(1);
      expect(typeof card.stability).toBe('number');
      expect(!isNaN(card.stability)).toBe(true);
      expect(card.stability).toBeGreaterThan(0);
      expect(typeof card.difficulty).toBe('number');
      expect(!isNaN(card.difficulty)).toBe(true);
      expect(card.difficulty).toBeGreaterThan(0);
      expect(card.due instanceof Date).toBe(true);
      expect(!isNaN(card.due.getTime())).toBe(true);
      expect(card.due.getTime()).toBeGreaterThan(baseDate.getTime());

      expect(log.rating).toBe(Rating.Again);
      expect(log.wordId).toBe('w_test_again');
    });

    it('calculates correct state and parameters for Rating.Hard (2 - 模糊)', () => {
      const initial = createNewCard('w_test_hard', baseDate);
      const { card, log } = scheduleNextReview(initial, Rating.Hard, baseDate);

      expect(card.wordId).toBe('w_test_hard');
      expect(card.state).toBe(State.Learning);
      expect(card.reps).toBe(1);
      expect(card.stability).toBeGreaterThan(0);
      expect(card.difficulty).toBeGreaterThan(0);
      expect(card.due.getTime()).toBeGreaterThan(baseDate.getTime());
      expect(log.rating).toBe(Rating.Hard);
    });

    it('calculates correct state and parameters for Rating.Good (3 - 記得)', () => {
      const initial = createNewCard('w_test_good', baseDate);
      const { card, log } = scheduleNextReview(initial, Rating.Good, baseDate);

      expect(card.wordId).toBe('w_test_good');
      expect(card.state).toBe(State.Learning);
      expect(card.reps).toBe(1);
      expect(card.stability).toBeGreaterThan(0);
      expect(card.difficulty).toBeGreaterThan(0);
      expect(card.due.getTime()).toBeGreaterThan(baseDate.getTime());
      expect(log.rating).toBe(Rating.Good);
    });

    it('calculates correct state and parameters for Rating.Easy (4 - 太簡單)', () => {
      const initial = createNewCard('w_test_easy', baseDate);
      const { card, log } = scheduleNextReview(initial, Rating.Easy, baseDate);

      expect(card.wordId).toBe('w_test_easy');
      // Rating.Easy graduates card immediately into Review state
      expect(card.state).toBe(State.Review);
      expect(card.reps).toBe(1);
      expect(card.stability).toBeGreaterThan(0);
      expect(card.difficulty).toBeGreaterThan(0);
      expect(card.scheduled_days).toBeGreaterThanOrEqual(1);
      expect(card.due.getTime()).toBeGreaterThan(baseDate.getTime());
      expect(log.rating).toBe(Rating.Easy);
    });
  });

  describe('Quiz / Spelling / Dictation rating mapping', () => {
    it('maps correct answer to Rating 3 (Good)', () => {
      expect(mapQuizRating(true)).toBe(Rating.Good);
      expect(getRatingFromQuizResult(true)).toBe(Rating.Good);
      expect(Rating.Good).toBe(3);
    });

    it('maps incorrect answer to Rating 1 (Again)', () => {
      expect(mapQuizRating(false)).toBe(Rating.Again);
      expect(getRatingFromQuizResult(false)).toBe(Rating.Again);
      expect(Rating.Again).toBe(1);
    });
  });

  describe('Delayed review (拖延複習 30 天情境)', () => {
    it('handles 30+ days overdue review gracefully with robust numbers and valid dates', () => {
      const day0 = new Date('2026-01-01T08:00:00Z');
      const card0 = createNewCard('w_delayed_001', day0);

      // First study session on Day 0
      const { card: card1 } = scheduleNextReview(card0, Rating.Good, day0);

      // Student disappears for 30+ days and reviews on Day 35
      const day35 = new Date('2026-02-05T08:00:00Z');
      const { card: cardDelayed, log: logDelayed } = scheduleNextReview(card1, Rating.Good, day35);

      // Verify no NaN values
      expect(Number.isFinite(cardDelayed.stability)).toBe(true);
      expect(Number.isFinite(cardDelayed.difficulty)).toBe(true);
      expect(Number.isFinite(cardDelayed.elapsed_days)).toBe(true);
      expect(Number.isFinite(cardDelayed.scheduled_days)).toBe(true);
      expect(!isNaN(cardDelayed.due.getTime())).toBe(true);

      // Elapsed days should be >= 30 days
      expect(cardDelayed.elapsed_days).toBeGreaterThanOrEqual(30);
      expect(logDelayed.elapsed_days).toBeGreaterThanOrEqual(30);

      // Next due date must be strictly after the delayed review date
      expect(cardDelayed.due.getTime()).toBeGreaterThan(day35.getTime());
      expect(cardDelayed.reps).toBe(2);
    });

    it('handles delayed review when student answers Rating.Again', () => {
      const day0 = new Date('2026-01-01T08:00:00Z');
      const card0 = createNewCard('w_delayed_again', day0);
      const { card: card1 } = scheduleNextReview(card0, Rating.Good, day0);

      const day40 = new Date('2026-02-10T08:00:00Z');
      const { card: cardAfterLapse } = scheduleNextReview(card1, Rating.Again, day40);

      expect(Number.isFinite(cardAfterLapse.stability)).toBe(true);
      expect(Number.isFinite(cardAfterLapse.difficulty)).toBe(true);
      expect(!isNaN(cardAfterLapse.due.getTime())).toBe(true);
      expect(cardAfterLapse.due.getTime()).toBeGreaterThan(day40.getTime());
    });
  });

  describe('previewNextReviews', () => {
    it('returns preview entries for all 4 ratings', () => {
      const card = createNewCard('w_preview_test', baseDate);
      const previews = previewNextReviews(card, baseDate);

      expect(previews[Rating.Again]).toBeDefined();
      expect(previews[Rating.Hard]).toBeDefined();
      expect(previews[Rating.Good]).toBeDefined();
      expect(previews[Rating.Easy]).toBeDefined();

      expect(previews[Rating.Again].card.state).toBe(State.Learning);
      expect(previews[Rating.Easy].card.state).toBe(State.Review);
    });
  });

  describe('Rating Labels and Due Helper', () => {
    it('returns traditional Chinese rating labels', () => {
      expect(getRatingLabel(Rating.Again)).toBe('忘了');
      expect(getRatingLabel(Rating.Hard)).toBe('模糊');
      expect(getRatingLabel(Rating.Good)).toBe('記得');
      expect(getRatingLabel(Rating.Easy)).toBe('太簡單');
      expect(RATING_LABELS[Rating.Again]).toBe('忘了');
    });

    it('determines if card is due', () => {
      const card = createNewCard('w_due_check', new Date('2026-01-01'));
      expect(isCardDue(card, new Date('2026-01-02'))).toBe(true);
      expect(isCardDue(card, new Date('2025-12-31'))).toBe(false);
    });

    it('handles card with string dates and camelCase properties', () => {
      const rawCard: any = {
        wordId: 'w_compat_001',
        due: '2026-01-01T00:00:00Z',
        lastReview: '2026-01-01T00:00:00Z',
        elapsedDays: 5,
        scheduledDays: 3,
        reps: 2,
        lapses: 1,
        state: State.Review,
        stability: 2.5,
        difficulty: 4.0,
      };

      const { card } = scheduleNextReview(rawCard, Rating.Good, new Date('2026-01-10'));
      expect(card.wordId).toBe('w_compat_001');
      expect(card.due instanceof Date).toBe(true);
      expect(card.reps).toBe(3);
    });
  });
});
