import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { YiziBulouDatabase } from '../src/db';
import type { WordProgress, ReviewLog, MistakeRecord, DailyStat } from '../src/db/types';

describe('Dexie.js 本機資料庫 (YiziBulouDatabase)', () => {
  let db: YiziBulouDatabase;

  beforeEach(async () => {
    // 每個測試建立獨立名稱的記憶體資料庫實例以求隔離
    db = new YiziBulouDatabase(`test_db_${Date.now()}_${Math.random().toString(36).substring(7)}`);
    await db.open();
  });

  afterEach(async () => {
    if (db && db.isOpen()) {
      await db.delete();
    }
  });

  describe('資料表定義與架構驗證', () => {
    it('資料庫應正確包含 progress, reviewLogs, mistakes, dailyStats 四張表', () => {
      expect(db.tables.map((t) => t.name)).toEqual(
        expect.arrayContaining(['progress', 'reviewLogs', 'mistakes', 'dailyStats'])
      );
    });

    it('progress 資料表主鍵應為 wordId', () => {
      expect(db.progress.schema.primKey.name).toBe('wordId');
    });

    it('reviewLogs 資料表應具備自增主鍵 id', () => {
      expect(db.reviewLogs.schema.primKey.name).toBe('id');
      expect(db.reviewLogs.schema.primKey.auto).toBe(true);
    });

    it('mistakes 資料表主鍵應為 wordId', () => {
      expect(db.mistakes.schema.primKey.name).toBe('wordId');
    });

    it('dailyStats 資料表主鍵應為 date', () => {
      expect(db.dailyStats.schema.primKey.name).toBe('date');
    });
  });

  describe('progress 單字學習進度 CRUD 與索引查詢', () => {
    const mockProgress: WordProgress = {
      wordId: 'w_abandon',
      due: new Date('2026-11-10T08:00:00Z'),
      stability: 2.5,
      difficulty: 4.8,
      elapsedDays: 1,
      scheduledDays: 3,
      reps: 2,
      lapses: 0,
      state: 1,
      lastReview: new Date('2026-11-09T08:00:00Z'),
      isDifficult: false,
    };

    it('應能新增並讀取單字進度', async () => {
      await db.saveWordProgress(mockProgress);
      const retrieved = await db.getWordProgress('w_abandon');

      expect(retrieved).toBeDefined();
      expect(retrieved?.wordId).toBe('w_abandon');
      expect(retrieved?.stability).toBe(2.5);
      expect(retrieved?.isDifficult).toBe(false);
    });

    it('更新相同 wordId 時應覆寫進度（Primary Key 唯一性）', async () => {
      await db.saveWordProgress(mockProgress);
      await db.saveWordProgress({
        ...mockProgress,
        reps: 3,
        stability: 5.2,
      });

      const count = await db.progress.count();
      expect(count).toBe(1);

      const updated = await db.getWordProgress('w_abandon');
      expect(updated?.reps).toBe(3);
      expect(updated?.stability).toBe(5.2);
    });

    it('應支援依 due 索引查詢待複習清單 (due <= 指定時間)', async () => {
      const past = new Date('2026-11-09T00:00:00Z');
      const current = new Date('2026-11-10T12:00:00Z');
      const future = new Date('2026-11-12T00:00:00Z');

      await db.progress.bulkAdd([
        { ...mockProgress, wordId: 'w_due_1', due: past },
        { ...mockProgress, wordId: 'w_due_2', due: current },
        { ...mockProgress, wordId: 'w_due_3', due: future },
      ]);

      const dueWords = await db.getDueWords(current);
      const dueIds = dueWords.map((w) => w.wordId);

      expect(dueIds).toContain('w_due_1');
      expect(dueIds).toContain('w_due_2');
      expect(dueIds).not.toContain('w_due_3');
    });

    it('應支援依 isDifficult 查詢頑固字', async () => {
      await db.progress.bulkAdd([
        { ...mockProgress, wordId: 'w_normal_1', isDifficult: false },
        { ...mockProgress, wordId: 'w_leech_1', isDifficult: true, lapses: 3 },
        { ...mockProgress, wordId: 'w_leech_2', isDifficult: true, lapses: 4 },
      ]);

      const difficultWords = await db.getDifficultWords();
      const difficultIds = difficultWords.map((w) => w.wordId);

      expect(difficultIds).toHaveLength(2);
      expect(difficultIds).toContain('w_leech_1');
      expect(difficultIds).toContain('w_leech_2');
      expect(difficultIds).not.toContain('w_normal_1');

      // 驗證讀出物件的 isDifficult 屬性還原為 boolean
      const leech = await db.getWordProgress('w_leech_1');
      expect(leech?.isDifficult).toBe(true);
      expect(typeof leech?.isDifficult).toBe('boolean');
    });

    it('應支援依 state 與 lapses 條件篩選', async () => {
      await db.progress.bulkAdd([
        { ...mockProgress, wordId: 'w_new', state: 0, lapses: 0 },
        { ...mockProgress, wordId: 'w_review', state: 2, lapses: 1 },
        { ...mockProgress, wordId: 'w_relearn', state: 3, lapses: 3 },
      ]);

      const newWords = await db.progress.where('state').equals(0).toArray();
      expect(newWords.map((w) => w.wordId)).toEqual(['w_new']);

      const lapsedWords = await db.progress.where('lapses').aboveOrEqual(3).toArray();
      expect(lapsedWords.map((w) => w.wordId)).toEqual(['w_relearn']);
    });
  });

  describe('reviewLogs 複習歷史紀錄', () => {
    it('新增複習紀錄應自動生成自增 id 並支援依 wordId 查詢', async () => {
      const now = new Date();
      const log1: Omit<ReviewLog, 'id'> = {
        wordId: 'w_apple',
        rating: 3,
        state: 1,
        due: new Date(now.getTime() + 86400000),
        stability: 2.1,
        difficulty: 4.5,
        reviewedAt: now,
      };

      const id1 = await db.recordReviewLog(log1);
      expect(id1).toBeGreaterThan(0);

      const log2: Omit<ReviewLog, 'id'> = {
        wordId: 'w_apple',
        rating: 4,
        state: 2,
        due: new Date(now.getTime() + 3 * 86400000),
        stability: 4.5,
        difficulty: 4.2,
        reviewedAt: new Date(now.getTime() + 86400000),
      };
      const id2 = await db.recordReviewLog(log2);
      expect(id2).toBeGreaterThan(id1);

      const logs = await db.reviewLogs.where('wordId').equals('w_apple').toArray();
      expect(logs).toHaveLength(2);
      expect(logs[0].rating).toBe(3);
      expect(logs[1].rating).toBe(4);
    });
  });

  describe('mistakes 答錯專屬計畫追蹤表', () => {
    it('新增、更新與刪除錯題紀錄', async () => {
      const mistake: MistakeRecord = {
        wordId: 'w_difficult',
        streakMistakes: 1,
        stage: 1,
        nextTrackDate: '2026-11-11',
      };

      await db.saveMistakeRecord(mistake);
      let found = await db.getMistakeRecord('w_difficult');
      expect(found).toBeDefined();
      expect(found?.streakMistakes).toBe(1);

      // 更新階段
      await db.saveMistakeRecord({
        ...mistake,
        streakMistakes: 2,
        stage: 2,
        nextTrackDate: '2026-11-13',
      });
      found = await db.getMistakeRecord('w_difficult');
      expect(found?.streakMistakes).toBe(2);
      expect(found?.stage).toBe(2);

      // 移除錯題
      await db.removeMistakeRecord('w_difficult');
      found = await db.getMistakeRecord('w_difficult');
      expect(found).toBeUndefined();
    });

    it('依 stage 與 nextTrackDate 進行索引查詢', async () => {
      await db.mistakes.bulkAdd([
        { wordId: 'w1', streakMistakes: 1, stage: 1, nextTrackDate: '2026-11-10' },
        { wordId: 'w2', streakMistakes: 2, stage: 2, nextTrackDate: '2026-11-11' },
        { wordId: 'w3', streakMistakes: 3, stage: 4, nextTrackDate: '2026-11-10' },
      ]);

      const stage4List = await db.mistakes.where('stage').equals(4).toArray();
      expect(stage4List.map((m) => m.wordId)).toEqual(['w3']);

      const track10List = await db.mistakes.where('nextTrackDate').equals('2026-11-10').toArray();
      expect(track10List.map((m) => m.wordId)).toEqual(expect.arrayContaining(['w1', 'w3']));
    });
  });

  describe('dailyStats 每日統計', () => {
    it('紀錄每日學習統計並更新連續打卡', async () => {
      const statToday: DailyStat = {
        date: '2026-11-10',
        newWordsCount: 20,
        reviewsCount: 35,
        streakDays: 5,
        completed: true,
      };

      await db.saveDailyStat(statToday);
      const retrieved = await db.getDailyStat('2026-11-10');

      expect(retrieved).toBeDefined();
      expect(retrieved?.newWordsCount).toBe(20);
      expect(retrieved?.reviewsCount).toBe(35);
      expect(retrieved?.streakDays).toBe(5);
      expect(retrieved?.completed).toBe(true);
    });
  });

  describe('clearAllTables 清空功能', () => {
    it('清空所有表應移除所有紀錄', async () => {
      await db.progress.add({
        wordId: 'w_test',
        due: new Date(),
        stability: 1,
        difficulty: 1,
        elapsedDays: 0,
        scheduledDays: 1,
        reps: 1,
        lapses: 0,
        state: 1,
        lastReview: new Date(),
        isDifficult: false,
      });

      await db.mistakes.add({
        wordId: 'w_test',
        streakMistakes: 1,
        stage: 1,
        nextTrackDate: '2026-11-10',
      });

      await db.clearAllTables();

      expect(await db.progress.count()).toBe(0);
      expect(await db.reviewLogs.count()).toBe(0);
      expect(await db.mistakes.count()).toBe(0);
      expect(await db.dailyStats.count()).toBe(0);
    });
  });
});

