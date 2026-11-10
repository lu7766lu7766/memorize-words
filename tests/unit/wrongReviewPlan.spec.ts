import { describe, expect, it } from 'vitest';
import {
  addDays,
  createWrongRecord,
  formatDate,
  getLeechStrategy,
  getRecommendedModes,
  isDue,
  isLeech,
  isLeechWord,
  recordCorrectAnswerPlan,
  recordWrongAnswerPlan,
  resetWrongRecordPlan,
} from '../../src/services/wrongReviewPlan';
import type { WrongRecord } from '../../src/types/wrongReview';

describe('wrongReviewPlan 答錯複習計畫與頑固字排程模組', () => {
  describe('1. 答錯排定流程（Day+1 與連續錯誤）', () => {
    it('驗證單字答錯 1 次排定明天（Day+1）', () => {
      const baseDate = new Date('2026-11-10T10:00:00Z');
      const tomorrowStr = '2026-11-11';

      // 呼叫 recordWrongAnswerPlan
      const record = recordWrongAnswerPlan(undefined, 'w_apple', baseDate);

      expect(record.wordId).toBe('w_apple');
      expect(record.incorrectCount).toBe(1);
      expect(record.stage).toBe('day1');
      expect(record.nextReviewDate).toBe(tomorrowStr);
      expect(record.isLeech).toBe(false);
      expect(record.lastAnswerStatus).toBe('incorrect');

      // createWrongRecord 也應有相同產出
      const directRecord = createWrongRecord('w_apple', baseDate);
      expect(directRecord.nextReviewDate).toBe(tomorrowStr);
      expect(directRecord.stage).toBe('day1');
    });

    it('在短間隔任一階段再次答錯，重置短間隔流程回 Day 1 (次日再考)', () => {
      const baseDate = new Date('2026-11-10T10:00:00Z');
      const day1Record: WrongRecord = {
        wordId: 'w_banana',
        firstWrongAt: baseDate.toISOString(),
        incorrectCount: 1,
        stage: 'day3', // 原先已推進到第 3 天
        nextReviewDate: '2026-11-13',
        isLeech: false,
        lastAnswerStatus: 'correct',
      };

      // 在 2026-11-13 複習時再次答錯
      const reviewDate = new Date('2026-11-13T10:00:00Z');
      const updated = recordWrongAnswerPlan(day1Record, 'w_banana', reviewDate);

      expect(updated.incorrectCount).toBe(2);
      expect(updated.stage).toBe('day1'); // 重置回 Day 1
      expect(updated.nextReviewDate).toBe('2026-11-14'); // 重排為次日
      expect(updated.lastAnswerStatus).toBe('incorrect');
    });
  });

  describe('2. 答對推進流程（Day+1 -> Day+3 -> graduated）', () => {
    it('驗證 Day+1 答對後排定第 3 天（Day+3）', () => {
      const day1ReviewDate = new Date('2026-11-11T09:00:00Z');
      const currentRecord: WrongRecord = {
        wordId: 'w_cherry',
        firstWrongAt: '2026-11-10T10:00:00Z',
        incorrectCount: 1,
        stage: 'day1',
        nextReviewDate: '2026-11-11',
        isLeech: false,
        lastAnswerStatus: 'incorrect',
      };

      const updated = recordCorrectAnswerPlan(currentRecord, day1ReviewDate);

      expect(updated.stage).toBe('day3');
      // Day+1 答對推進第 3 天：相隔 +2 天，預計為 2026-11-13
      expect(updated.nextReviewDate).toBe('2026-11-13');
      expect(updated.lastAnswerStatus).toBe('correct');
    });

    it('驗證 Day+3 答對後狀態轉為畢業 (graduated)', () => {
      const day3ReviewDate = new Date('2026-11-13T09:00:00Z');
      const currentRecord: WrongRecord = {
        wordId: 'w_cherry',
        firstWrongAt: '2026-11-10T10:00:00Z',
        incorrectCount: 1,
        stage: 'day3',
        nextReviewDate: '2026-11-13',
        isLeech: false,
        lastAnswerStatus: 'correct',
      };

      const updated = recordCorrectAnswerPlan(currentRecord, day3ReviewDate);

      expect(updated.stage).toBe('graduated');
      expect(updated.nextReviewDate).toBe('');
      expect(updated.lastAnswerStatus).toBe('correct');
    });

    it('已畢業狀態再次答對保持 graduated', () => {
      const currentRecord: WrongRecord = {
        wordId: 'w_date',
        firstWrongAt: '2026-11-10T10:00:00Z',
        incorrectCount: 1,
        stage: 'graduated',
        nextReviewDate: '',
        isLeech: false,
        lastAnswerStatus: 'correct',
      };

      const updated = recordCorrectAnswerPlan(currentRecord);
      expect(updated.stage).toBe('graduated');
    });
  });

  describe('3. 頑固字 (Leech) 判定規則與特別處理策略', () => {
    it('驗證累積答錯次數達 3 次時，isLeech 自動為 true，且其推薦模式為拼字與聽寫', () => {
      const d1 = new Date('2026-11-10T10:00:00Z');
      const r1 = recordWrongAnswerPlan(undefined, 'w_leech', d1);
      expect(r1.incorrectCount).toBe(1);
      expect(r1.isLeech).toBe(false);

      const d2 = new Date('2026-11-11T10:00:00Z');
      const r2 = recordWrongAnswerPlan(r1, 'w_leech', d2);
      expect(r2.incorrectCount).toBe(2);
      expect(r2.isLeech).toBe(false);

      // 第 3 次答錯：累積達 3 次
      const d3 = new Date('2026-11-12T10:00:00Z');
      const r3 = recordWrongAnswerPlan(r2, 'w_leech', d3);
      expect(r3.incorrectCount).toBe(3);
      expect(r3.isLeech).toBe(true);

      // 驗證推薦模式
      const recommended = getRecommendedModes(r3.isLeech);
      expect(recommended).toEqual(['spelling', 'dictation']);

      // 非頑固字推薦題型應包含四種常規題型
      expect(getRecommendedModes(false)).toEqual(['flashcard', 'quiz', 'spelling', 'dictation']);

      // 驗證頑固字策略
      const strategy = getLeechStrategy();
      expect(strategy.recommendedModes).toEqual(['spelling', 'dictation']);
      expect(strategy.showFullSentence).toBe(true);
    });

    it('isLeech 與 isLeechWord 函式門檻判定準確', () => {
      expect(isLeech(0)).toBe(false);
      expect(isLeech(1)).toBe(false);
      expect(isLeech(2)).toBe(false);
      expect(isLeech(3)).toBe(true);
      expect(isLeech(5)).toBe(true);
      expect(isLeechWord(3)).toBe(true);
    });
  });

  describe('4. 日期輔助與重設計畫', () => {
    it('formatDate 與 addDays 能準確計算日期字串', () => {
      const base = new Date('2026-11-10T12:00:00');
      expect(formatDate(base)).toBe('2026-11-10');
      const future = addDays(base, 5);
      expect(formatDate(future)).toBe('2026-11-15');
    });

    it('isDue 能準確判定是否到期或逾期', () => {
      const today = new Date('2026-11-10T12:00:00');
      expect(isDue('2026-11-09', today)).toBe(true); // 逾期
      expect(isDue('2026-11-10', today)).toBe(true); // 今日到期
      expect(isDue('2026-11-11', today)).toBe(false); // 明日未到期
      expect(isDue('', today)).toBe(false);
    });

    it('resetWrongRecordPlan 能完全重設錯題紀錄', () => {
      const record: WrongRecord = {
        wordId: 'w_test',
        firstWrongAt: '2026-11-10',
        incorrectCount: 4,
        stage: 'day1',
        nextReviewDate: '2026-11-11',
        isLeech: true,
        lastAnswerStatus: 'incorrect',
      };

      const reset = resetWrongRecordPlan(record);
      expect(reset.incorrectCount).toBe(0);
      expect(reset.isLeech).toBe(false);
      expect(reset.stage).toBe('graduated');
      expect(reset.nextReviewDate).toBe('');
    });
  });
});

