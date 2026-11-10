import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSettingsStore, SETTINGS_STORAGE_KEY } from '../src/stores/useSettingsStore';
import { useStudyStore } from '../src/stores/useStudyStore';
import { db } from '../src/db';
import type { WordProgress } from '../src/db/types';

describe('Pinia Stores 狀態測試', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    await db.clearAllTables();
  });

  afterEach(async () => {
    await db.clearAllTables();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  describe('useSettingsStore 使用者設定 Store', () => {
    it('應具有符合規格之預設值', () => {
      const store = useSettingsStore();

      expect(store.dailyNewWords).toBe(20);
      expect(store.dailyReviewLimit).toBe(100);
      expect(store.ttsRate).toBe(1.0);
      expect(store.activeCategory).toBe('gsat');
      expect(store.activeLevel).toBe(1);
      expect(store.lastBackupDate).toBeNull();
    });

    it('Actions 應能更新狀態並同步至 localStorage', () => {
      const store = useSettingsStore();

      store.setDailyNewWords(25);
      expect(store.dailyNewWords).toBe(25);

      store.setDailyReviewLimit(120);
      expect(store.dailyReviewLimit).toBe(120);

      store.setTtsRate(0.85);
      expect(store.ttsRate).toBe(0.85);

      store.setActiveCategory('toeic');
      expect(store.activeCategory).toBe('toeic');

      store.setActiveLevel(2);
      expect(store.activeLevel).toBe(2);

      const backupDate = '2026-11-10T10:00:00.000Z';
      store.setLastBackupDate(backupDate);
      expect(store.lastBackupDate).toBe(backupDate);

      // 驗證 localStorage 持久化內容
      const storedRaw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(storedRaw).toBeDefined();
      const parsed = JSON.parse(storedRaw!);
      expect(parsed.dailyNewWords).toBe(25);
      expect(parsed.dailyReviewLimit).toBe(120);
      expect(parsed.ttsRate).toBe(0.85);
      expect(parsed.activeCategory).toBe('toeic');
      expect(parsed.activeLevel).toBe(2);
      expect(parsed.lastBackupDate).toBe(backupDate);
    });

    it('updateSettings 批次更新應生效', () => {
      const store = useSettingsStore();
      store.updateSettings({
        dailyNewWords: 30,
        ttsRate: 1.2,
      });

      expect(store.dailyNewWords).toBe(30);
      expect(store.ttsRate).toBe(1.2);
      expect(store.dailyReviewLimit).toBe(100); // 未更動維持原值
    });

    it('resetSettings 應將所有設定恢復預設值並更新 localStorage', () => {
      const store = useSettingsStore();
      store.setDailyNewWords(50);
      store.setActiveCategory('toeic');

      store.resetSettings();

      expect(store.dailyNewWords).toBe(20);
      expect(store.activeCategory).toBe('gsat');

      const storedRaw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      const parsed = JSON.parse(storedRaw!);
      expect(parsed.dailyNewWords).toBe(20);
      expect(parsed.activeCategory).toBe('gsat');
    });

    it('初始化時應能正確載入已儲存在 localStorage 的設定', () => {
      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          dailyNewWords: 15,
          activeCategory: 'toeic',
          activeLevel: 3,
        })
      );

      const store = useSettingsStore();
      expect(store.dailyNewWords).toBe(15);
      expect(store.activeCategory).toBe('toeic');
      expect(store.activeLevel).toBe(3);
      expect(store.dailyReviewLimit).toBe(100); // 預設值補充
    });
  });

  describe('useStudyStore 學習進度 Store', () => {
    it('初始化應具有空隊列且 isLoaded 為 false', () => {
      const store = useStudyStore();
      expect(store.todayDueWordIds).toEqual([]);
      expect(store.todayNewWordIds).toEqual([]);
      expect(store.mistakeWordIds).toEqual([]);
      expect(store.isLoaded).toBe(false);
    });

    it('loadStudySession 應正確載入待複習、錯題與新字隊列', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 3600000);
      const future = new Date(now.getTime() + 86400000);

      // 準備 progress 表資料
      await db.progress.bulkAdd([
        {
          wordId: 'w_due_1',
          due: past,
          stability: 2,
          difficulty: 3,
          elapsedDays: 1,
          scheduledDays: 1,
          reps: 1,
          lapses: 0,
          state: 1,
          lastReview: past,
          isDifficult: false,
        },
        {
          wordId: 'w_due_2',
          due: past,
          stability: 3,
          difficulty: 3,
          elapsedDays: 2,
          scheduledDays: 2,
          reps: 2,
          lapses: 0,
          state: 2,
          lastReview: past,
          isDifficult: false,
        },
        {
          wordId: 'w_future',
          due: future,
          stability: 5,
          difficulty: 3,
          elapsedDays: 0,
          scheduledDays: 5,
          reps: 3,
          lapses: 0,
          state: 2,
          lastReview: now,
          isDifficult: false,
        },
        // 預留尚未開始學習的新字 (state === 0)
        {
          wordId: 'w_new_1',
          due: now,
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 0,
          state: 0,
          lastReview: null,
          isDifficult: false,
        },
      ]);

      // 準備 mistakes 表資料
      await db.mistakes.add({
        wordId: 'w_mistake_1',
        streakMistakes: 1,
        stage: 1,
        nextTrackDate: '2026-11-10',
      });

      const store = useStudyStore();
      await store.loadStudySession({
        category: 'gsat',
        level: 1,
        newLimit: 10,
        reviewLimit: 50,
      });

      expect(store.isLoaded).toBe(true);
      expect(store.todayDueWordIds).toEqual(expect.arrayContaining(['w_due_1', 'w_due_2']));
      expect(store.todayDueWordIds).not.toContain('w_future');
      expect(store.mistakeWordIds).toEqual(['w_mistake_1']);
      expect(store.todayNewWordIds).toContain('w_new_1');
    });

    it('recordWordReview (Rating 3 Good) 應寫入 progress、reviewLogs、dailyStats 並更新 store 隊列', async () => {
      const store = useStudyStore();
      store.todayNewWordIds = ['w_target'];

      await store.recordWordReview('w_target', 3);

      // 1. progress 驗證
      const prog = await db.progress.get('w_target');
      expect(prog).toBeDefined();
      expect(prog?.wordId).toBe('w_target');
      expect(prog?.reps).toBe(1);
      expect(prog?.lapses).toBe(0);
      expect(prog?.isDifficult).toBe(false);
      expect(prog?.stability).toBeGreaterThan(0);

      // 2. reviewLogs 驗證
      const logs = await db.reviewLogs.where('wordId').equals('w_target').toArray();
      expect(logs).toHaveLength(1);
      expect(logs[0].rating).toBe(3);

      // 3. dailyStats 驗證
      const todayStr = new Date().toISOString().slice(0, 10);
      const stat = await db.dailyStats.get(todayStr);
      expect(stat).toBeDefined();
      expect(stat?.reviewsCount).toBe(1);
      expect(stat?.newWordsCount).toBe(1);

      // 4. store 響應式佇列驗證：w_target 已自 todayNewWordIds 移除
      expect(store.todayNewWordIds).not.toContain('w_target');
    });

    it('recordWordReview (Rating 1 Again) 應增加 lapses、加入 mistakes 表與 store 錯題隊列', async () => {
      const store = useStudyStore();
      store.todayDueWordIds = ['w_fail'];

      await store.recordWordReview('w_fail', 1);

      // progress
      const prog = await db.progress.get('w_fail');
      expect(prog?.lapses).toBe(1);

      // mistakes 表
      const mistake = await db.mistakes.get('w_fail');
      expect(mistake).toBeDefined();
      expect(mistake?.streakMistakes).toBe(1);
      expect(mistake?.stage).toBe(1);

      // store 響應式隊列更新
      expect(store.todayDueWordIds).not.toContain('w_fail');
      expect(store.mistakeWordIds).toContain('w_fail');
    });

    it('累計答錯次數達到 3 次時應自動標記 isDifficult = true 且錯題階段為 4 (頑固字)', async () => {
      const store = useStudyStore();

      // 第 1 次答錯
      await store.recordWordReview('w_hard', 1);
      // 第 2 次答錯
      await store.recordWordReview('w_hard', 1);
      // 第 3 次答錯
      await store.recordWordReview('w_hard', 1);

      const prog = await db.progress.get('w_hard');
      expect(prog?.lapses).toBe(3);
      expect(prog?.isDifficult).toBe(true);

      const mistake = await db.mistakes.get('w_hard');
      expect(mistake?.stage).toBe(4);
    });

    it('錯題複習 (isMistakeReview: true) 答對推進階段，達到 stage >= 3 畢業後自錯題表移除', async () => {
      // 預設一筆 stage 3 的錯題
      await db.mistakes.put({
        wordId: 'w_graduate',
        streakMistakes: 1,
        stage: 3,
        nextTrackDate: '2026-11-10',
      });
      await db.progress.put({
        wordId: 'w_graduate',
        due: new Date(),
        stability: 3,
        difficulty: 3,
        elapsedDays: 1,
        scheduledDays: 2,
        reps: 2,
        lapses: 1,
        state: 2,
        lastReview: new Date(),
        isDifficult: false,
      });

      const store = useStudyStore();
      store.mistakeWordIds = ['w_graduate'];

      // 錯題複習答對
      await store.recordWordReview('w_graduate', 3, true);

      // 應自 mistakes 表移除並從 store.mistakeWordIds 移除
      const mistakeInDb = await db.mistakes.get('w_graduate');
      expect(mistakeInDb).toBeUndefined();
      expect(store.mistakeWordIds).not.toContain('w_graduate');
    });

    it('getWordProgress 與 getMistakeList 應回傳正確進度資料', async () => {
      await db.progress.put({
        wordId: 'w_lookup',
        due: new Date(),
        stability: 4,
        difficulty: 3,
        elapsedDays: 2,
        scheduledDays: 4,
        reps: 3,
        lapses: 0,
        state: 2,
        lastReview: new Date(),
        isDifficult: false,
      });

      await db.mistakes.put({
        wordId: 'w_lookup',
        streakMistakes: 2,
        stage: 2,
        nextTrackDate: '2026-11-12',
      });

      const store = useStudyStore();
      const prog = await store.getWordProgress('w_lookup');
      expect(prog?.wordId).toBe('w_lookup');
      expect(prog?.stability).toBe(4);

      const missing = await store.getWordProgress('w_not_exist');
      expect(missing).toBeUndefined();

      const mistakes = await store.getMistakeList();
      expect(mistakes.some((m) => m.wordId === 'w_lookup')).toBe(true);
    });
  });
});

