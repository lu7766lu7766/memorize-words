import {
  fsrs,
  createEmptyCard,
  Rating,
  State,
  type Grade,
  type Card,
} from 'ts-fsrs';
import {
  type FSRSCard,
  type FSRSRecordLog,
  QUIZ_RATING_MAP,
  RATING_LABELS,
} from '../types/fsrs';

/**
 * Default ts-fsrs scheduler instance
 */
const defaultFsrs = fsrs();

/**
 * Creates a new FSRS card for a given word ID with initial State.New (0).
 *
 * @param wordId Unique identifier of the word
 * @param now Optional creation timestamp (defaults to current time)
 * @returns Initialized FSRSCard
 */
export function createNewCard(wordId: string, now: Date = new Date()): FSRSCard {
  const empty = createEmptyCard(now);
  return {
    ...empty,
    wordId,
    isDifficult: false,
    elapsedDays: empty.elapsed_days,
    scheduledDays: empty.scheduled_days,
    lastReview: empty.last_review,
  };
}

/**
 * Normalizes an arbitrary rating input to ts-fsrs Grade (1, 2, 3, 4).
 */
export function normalizeRating(rating: Rating | number | string): Grade {
  const num = typeof rating === 'string' ? parseInt(rating, 10) : Number(rating);
  if (num === 1 || num === 2 || num === 3 || num === 4) {
    return num as Grade;
  }
  throw new Error(
    `Invalid FSRS rating: ${rating}. Valid ratings are 1 (Again), 2 (Hard), 3 (Good), or 4 (Easy).`
  );
}

/**
 * Normalizes input card to guarantee valid Date instances and populated snake_case fields.
 */
function normalizeCard(card: FSRSCard): Card {
  const rawDue = card.due;
  const due = rawDue instanceof Date ? rawDue : new Date(rawDue);

  const rawLastReview = card.last_review ?? card.lastReview;
  const last_review = rawLastReview
    ? rawLastReview instanceof Date
      ? rawLastReview
      : new Date(rawLastReview)
    : undefined;

  return {
    due: isNaN(due.getTime()) ? new Date() : due,
    last_review: last_review && !isNaN(last_review.getTime()) ? last_review : undefined,
    elapsed_days: card.elapsed_days ?? card.elapsedDays ?? 0,
    scheduled_days: card.scheduled_days ?? card.scheduledDays ?? 0,
    reps: card.reps ?? 0,
    lapses: card.lapses ?? 0,
    state: card.state ?? State.New,
    stability: card.stability ?? 0,
    difficulty: card.difficulty ?? 0,
  };
}

/**
 * Schedules the next review for a card based on the given rating.
 * Handles delayed reviews (interrupted study, 30+ days overdue) gracefully
 * ensuring robust numerical values and valid dates.
 *
 * @param card Current FSRSCard
 * @param rating User rating: 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 * @param reviewDate Date of the review (defaults to current time)
 * @returns Updated card and corresponding review log
 */
export function scheduleNextReview(
  card: FSRSCard,
  rating: Rating | number | string,
  reviewDate: Date = new Date()
): { card: FSRSCard; log: FSRSRecordLog } {
  const validRating = normalizeRating(rating);
  const normalizedCard = normalizeCard(card);
  const safeReviewDate =
    reviewDate instanceof Date && !isNaN(reviewDate.getTime())
      ? reviewDate
      : new Date();

  const repeatResult = defaultFsrs.repeat(normalizedCard, safeReviewDate);
  const resultItem = repeatResult[validRating];

  if (!resultItem) {
    throw new Error(`FSRS calculation failed for rating ${validRating}`);
  }

  // Preserve isDifficult if already true, or trigger if lapses reach 3
  const isDifficult = Boolean(card.isDifficult || resultItem.card.lapses >= 3);

  const updatedCard: FSRSCard = {
    ...resultItem.card,
    wordId: card.wordId,
    isDifficult,
    elapsedDays: resultItem.card.elapsed_days,
    scheduledDays: resultItem.card.scheduled_days,
    lastReview: resultItem.card.last_review,
  };

  const log: FSRSRecordLog = {
    ...resultItem.log,
    wordId: card.wordId,
    elapsedDays: resultItem.log.elapsed_days,
    lastElapsedDays: resultItem.log.last_elapsed_days,
    scheduledDays: resultItem.log.scheduled_days,
    reviewedAt: resultItem.log.review,
  };

  return { card: updatedCard, log };
}

/**
 * Previews next review outcomes for all 4 ratings (Again, Hard, Good, Easy).
 * Useful for showing next intervals on flashcard buttons.
 */
export function previewNextReviews(
  card: FSRSCard,
  reviewDate: Date = new Date()
): Record<1 | 2 | 3 | 4, { card: FSRSCard; log: FSRSRecordLog }> {
  return {
    [Rating.Again]: scheduleNextReview(card, Rating.Again, reviewDate),
    [Rating.Hard]: scheduleNextReview(card, Rating.Hard, reviewDate),
    [Rating.Good]: scheduleNextReview(card, Rating.Good, reviewDate),
    [Rating.Easy]: scheduleNextReview(card, Rating.Easy, reviewDate),
  };
}

/**
 * Maps quiz, spelling, or dictation test result to standard FSRS rating:
 * - isCorrect = true  -> Rating 3 (Good)
 * - isCorrect = false -> Rating 1 (Again)
 */
export function mapQuizRating(isCorrect: boolean): Rating {
  return isCorrect ? QUIZ_RATING_MAP.correct : QUIZ_RATING_MAP.incorrect;
}

export function getRatingFromQuizResult(isCorrect: boolean): Rating {
  return mapQuizRating(isCorrect);
}

/**
 * Returns traditional Chinese label for a rating:
 * 1: '忘了', 2: '模糊', 3: '記得', 4: '太簡單'
 */
export function getRatingLabel(rating: Rating | number): string {
  const r = typeof rating === 'number' ? (rating as Rating) : rating;
  return RATING_LABELS[r] ?? '未知';
}

/**
 * Determines whether a card is currently due for review.
 */
export function isCardDue(card: FSRSCard, now: Date = new Date()): boolean {
  const due = card.due instanceof Date ? card.due : new Date(card.due);
  return due.getTime() <= now.getTime();
}
