import 'fake-indexeddb/auto';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../src/db';
import { addDays, formatDate } from '../../src/services/wrongReviewPlan';
import { useWrongReviewStore } from '../../src/stores/wrongReviewStore';

describe('useWrongReviewStore 錯題複習狀態管理 Store', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await db.mistakes.clear();
  });

  afterEach(async () => {
    await db.mistakes.clear();
  });

  describe('1. recordWrongAnswer 與狀態統計', () => {
    it('初次答錯新增紀錄至 store 與 IndexedDB，並更新 wrongCount 與 allWrongItems', async () => {
      const store = useWrongReviewStore();

      expect(store.wrongCount).toBe(0);
      expect(store.allWrongItems).toHaveLength(0);

      const baseDate = new Date('2026-11-10T08:00:00Z');
      const record = await store.recordWrongAnswer('word_001', baseDate);

      expect(record.wordId).toBe('word_001');
      expect(record.incorrectCount).toBe(1);
      expect(record.stage).toBe('day1');
      expect(record.isLeech).toBe(false);
      expect(record.nextReviewDate).toBe('2026-11-11');

      expect(store.wrongCount).toBe(1);
      expect(store.allWrongItems).toHaveLength(1);
      expect(store.allWrongItems[0].wordId).toBe('word_001');

      // 檢查 IndexedDB 持久化
      const inDb = await db.mistakes.get('word_001');
      expect(inDb).toBeDefined();
      expect(inDb?.wordId).toBe('word_001');
      expect(inDb?.streakMistakes).toBe(1);
      expect(inDb?.nextTrackDate).toBe('2026-11-11');
    });

    it('累積答錯達 3 次自動升級為頑固字並反映在 leechList', async () => {
      const store = useWrongReviewStore();

      await store.recordWrongAnswer('word_leech');
      await store.recordWrongAnswer('word_leech');
      expect(store.leechList).toHaveLength(0);

      const r3 = await store.recordWrongAnswer('word_leech');
      expect(r3.incorrectCount).toBe(3);
      expect(r3.isLeech).toBe(true);

      expect(store.leechList).toHaveLength(1);
      expect(store.leechList[0].wordId).toBe('word_leech');

      // 檢查 IndexedDB 中的 stage 為 4
      const inDb = await db.mistakes.get('word_leech');
      expect(inDb?.stage).toBe(4);
    });
  });

  describe('2. recordCorrectAnswer 推進與畢業', () => {
    it('Day+1 複習答對推進至 Day+3，第 3 天複習答對推進為 graduated', async () => {
      const store = useWrongReviewStore();

      // Day 0: 答錯
      const day0 = new Date('2026-11-10T08:00:00Z');
      await store.recordWrongAnswer('word_progress', day0);

      // Day 1: 複習答對 -> 推進至 day3
      const day1 = new Date('2026-11-11T08:00:00Z');
      const r1 = await store.recordCorrectAnswer('word_progress', day1);
      expect(r1).toBeDefined();
      expect(r1?.stage).toBe('day3');
      expect(r1?.nextReviewDate).toBe('2026-11-13');

      // Day 3: 複習答對 -> 畢業 (graduated)
      const day3 = new Date('2026-11-13T08:00:00Z');
      const r2 = await store.recordCorrectAnswer('word_progress', day3);
      expect(r2).toBeDefined();
      expect(r2?.stage).toBe('graduated');
      expect(r2?.nextReviewDate).toBe('');
    });

    it('對不存在的 wordId 呼叫 recordCorrectAnswer 回傳 undefined', async () => {
      const store = useWrongReviewStore();
      const res = await store.recordCorrectAnswer('non_existent');
      expect(res).toBeUndefined();
    });
  });

  describe('3. todayFollowUpList 今日追蹤篩選', () => {
    it('僅包含到期日 <= 今日且非 graduated 之錯題', async () => {
      const store = useWrongReviewStore();
      const todayStr = formatDate();
      const yesterdayStr = formatDate(addDays(new Date(), -1));
      const tomorrowStr = formatDate(addDays(new Date(), 1));

      // 項目 1: 昨日到期（逾期，應包含）
      await store.recordWrongAnswer('w_overdue', addDays(new Date(), -2));
      // 手動覆寫 nextReviewDate 為昨天以精準驗證
      store.records['w_overdue'].nextReviewDate = yesterdayStr;

      // 項目 2: 今日到期（應包含）
      await store.recordWrongAnswer('w_today', addDays(new Date(), -1));
      store.records['w_today'].nextReviewDate = todayStr;

      // 項目 3: 明天到期（未到期，不應包含）
      await store.recordWrongAnswer('w_tomorrow', new Date());
      store.records['w_tomorrow'].nextReviewDate = tomorrowStr;

      // 項目 4: 已畢業（即使有日期也不應包含）
      await store.recordWrongAnswer('w_graduated');
      store.records['w_graduated'].stage = 'graduated';
      store.records['w_graduated'].nextReviewDate = todayStr;

      const followUps = store.todayFollowUpList;
      const followUpIds = followUps.map((r) => r.wordId);

      expect(followUpIds).toContain('w_overdue');
      expect(followUpIds).toContain('w_today');
      expect(followUpIds).not.toContain('w_tomorrow');
      expect(followUpIds).not.toContain('w_graduated');
    });
  });

  describe('4. removeWrongRecord, resetWrongRecord 與 clearAll', () => {
    it('removeWrongRecord 自 store 與 IndexedDB 完整移除', async () => {
      const store = useWrongReviewStore();
      await store.recordWrongAnswer('w_to_remove');
      expect(store.wrongCount).toBe(1);

      await store.removeWrongRecord('w_to_remove');
      expect(store.wrongCount).toBe(0);
      expect(store.records['w_to_remove']).toBeUndefined();

      const inDb = await db.mistakes.get('w_to_remove');
      expect(inDb).toBeUndefined();
    });

    it('resetWrongRecord 重設指定單字統計為 0 與畢業', async () => {
      const store = useWrongReviewStore();
      await store.recordWrongAnswer('w_to_reset');
      await store.recordWrongAnswer('w_to_reset');
      await store.recordWrongAnswer('w_to_reset'); // leech
      expect(store.records['w_to_reset'].isLeech).toBe(true);

      await store.resetWrongRecord('w_to_reset');
      const reset = store.records['w_to_reset'];
      expect(reset.incorrectCount).toBe(0);
      expect(reset.isLeech).toBe(false);
      expect(reset.stage).toBe('graduated');
    });

    it('clearAll 清空所有紀錄', async () => {
      const store = useWrongReviewStore();
      await store.recordWrongAnswer('w1');
      await store.recordWrongAnswer('w2');
      expect(store.wrongCount).toBe(2);

      await store.clearAll();
      expect(store.wrongCount).toBe(0);
      expect(await db.mistakes.count()).toBe(0);
    });
  });

  describe('5. loadFromDb IndexedDB 恢復快照', () => {
    it('成功從 IndexedDB 載入歷史錯題並還原狀態', async () => {
      // 預先在 Dexie 中寫入測試資料
      await db.mistakes.bulkPut([
        {
          wordId: 'db_w1',
          streakMistakes: 1,
          stage: 1,
          nextTrackDate: '2026-11-11',
        },
        {
          wordId: 'db_w2',
          streakMistakes: 3,
          stage: 4, // leech
          nextTrackDate: '2026-11-12',
        },
      ]);

      const store = useWrongReviewStore();
      await store.loadFromDb();

      expect(store.isLoaded).toBe(true);
      expect(store.wrongCount).toBe(2);
      expect(store.records['db_w1'].stage).toBe('day1');
      expect(store.records['db_w2'].isLeech).toBe(true);
      expect(store.leechList.map((r) => r.wordId)).toEqual(['db_w2']);
    });
  });
});

