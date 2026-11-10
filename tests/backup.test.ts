import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  exportToJson,
  importFromJson,
  validateBackup,
  triggerDownload,
  shouldRemindBackup,
  computeChecksum,
  canonicalJsonStringify,
  getDb,
  setDb,
  YiziBulouDatabase,
} from '../src/services/backupService';
import type { BackupWordProgress, BackupPayload, BackupPayloadData } from '../src/types/backup';

describe('Backup Service (TASK-05)', () => {
  let testDb: YiziBulouDatabase;

  beforeEach(async () => {
    // 每個測試使用獨立且隨機名稱的資料庫，避免狀態污染
    testDb = new YiziBulouDatabase(`test_db_${Math.random().toString(36).slice(2)}`);
    setDb(testDb);

    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  afterEach(async () => {
    if (testDb) {
      await testDb.delete();
    }
    setDb(null);
    vi.restoreAllMocks();
  });

  const sampleProgressA: BackupWordProgress = {
    wordId: 'w_abandon_001',
    due: '2026-11-12T00:00:00.000Z',
    stability: 2.5,
    difficulty: 3.0,
    elapsedDays: 1,
    scheduledDays: 3,
    reps: 1,
    lapses: 0,
    state: 1,
    lastReview: '2026-11-10T00:00:00.000Z',
    isDifficult: false,
  };

  const sampleProgressB: BackupWordProgress = {
    wordId: 'w_ability_002',
    due: '2026-11-15T00:00:00.000Z',
    stability: 5.0,
    difficulty: 2.0,
    elapsedDays: 4,
    scheduledDays: 7,
    reps: 3,
    lapses: 1,
    state: 2,
    lastReview: '2026-11-08T00:00:00.000Z',
    isDifficult: false,
  };

  describe('canonicalJsonStringify & computeChecksum', () => {
    it('不論物件鍵宣告順序為何，計算出的 Checksum 應完全一致', () => {
      const obj1 = { b: 2, a: 1, nested: { y: 20, x: 10 } };
      const obj2 = { a: 1, b: 2, nested: { x: 10, y: 20 } };

      expect(canonicalJsonStringify(obj1)).toBe(canonicalJsonStringify(obj2));
      expect(computeChecksum(obj1)).toBe(computeChecksum(obj2));
    });

    it('payload 內容一旦遭竄改，Checksum 必定不一致', () => {
      const payload1: BackupPayloadData = {
        progress: [sampleProgressA],
      };
      const payload2: BackupPayloadData = {
        progress: [{ ...sampleProgressA, reps: 999 }],
      };

      expect(computeChecksum(payload1)).not.toBe(computeChecksum(payload2));
    });
  });

  describe('validateBackup', () => {
    it('合法備份 JSON 應通過驗證並回傳解析後的資料', async () => {
      const payloadData: BackupPayloadData = {
        progress: [sampleProgressA, sampleProgressB],
        settings: { dailyNewWords: 30 },
      };
      const backup: BackupPayload = {
        app: 'yizi-bulou',
        version: '1.0.0',
        exportedAt: '2026-11-10T12:00:00.000Z',
        payload: payloadData,
        checksum: computeChecksum(payloadData),
      };

      const result = validateBackup(JSON.stringify(backup));
      expect(result.valid).toBe(true);
      expect(result.data?.app).toBe('yizi-bulou');
      expect(result.data?.payload.progress.length).toBe(2);
    });

    it('空字串或空白字串應驗證失敗', () => {
      expect(validateBackup('').valid).toBe(false);
      expect(validateBackup('   ').valid).toBe(false);
    });

    it('非法 JSON 語法應優雅失敗並回傳清楚訊息', () => {
      const result = validateBackup('{ invalid json');
      expect(result.valid).toBe(false);
      expect(result.message).toContain('JSON 格式無效');
    });

    it('非本 App (app 不符) 備份應優雅拒絕', () => {
      const invalidApp = {
        app: 'other-app',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        payload: { progress: [] },
        checksum: '12345678',
      };
      const result = validateBackup(JSON.stringify(invalidApp));
      expect(result.valid).toBe(false);
      expect(result.message).toContain('非本應用程式 (yizi-bulou)');
    });

    it('版本號不支援時應優雅拒絕', () => {
      const invalidVer = {
        app: 'yizi-bulou',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        payload: { progress: [] },
        checksum: '12345678',
      };
      const result = validateBackup(JSON.stringify(invalidVer));
      expect(result.valid).toBe(false);
      expect(result.message).toContain('不支援的備份版本');
    });

    it('缺少 progress 陣列時應優雅拒絕', () => {
      const noProgress = {
        app: 'yizi-bulou',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        payload: {},
        checksum: '12345678',
      };
      const result = validateBackup(JSON.stringify(noProgress));
      expect(result.valid).toBe(false);
      expect(result.message).toContain('缺少 progress');
    });

    it('progress 中存在缺少 wordId 的損毀項目應優雅拒絕', () => {
      const payload: BackupPayloadData = {
        progress: [{ reps: 1 } as unknown as BackupWordProgress],
      };
      const corruptItem = {
        app: 'yizi-bulou',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        payload,
        checksum: computeChecksum(payload),
      };
      const result = validateBackup(JSON.stringify(corruptItem));
      expect(result.valid).toBe(false);
      expect(result.message).toContain('缺少有效 wordId');
    });

    it('校驗碼 checksum 遭竄改或不符時應優雅拒絕', () => {
      const payload: BackupPayloadData = {
        progress: [sampleProgressA],
      };
      const tampered = {
        app: 'yizi-bulou',
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        payload,
        checksum: '00000000', // 假造不符之 Checksum
      };
      const result = validateBackup(JSON.stringify(tampered));
      expect(result.valid).toBe(false);
      expect(result.message).toContain('校驗碼 (checksum) 不符');
    });
  });

  describe('exportToJson & Round-trip Restore (overwrite)', () => {
    it('完整還原測試 (Round-trip)：匯出之 JSON 經 importFromJson 還原後，進度完全一致', async () => {
      // 1. 寫入初始資料庫紀錄
      await testDb.table('progress').bulkAdd([sampleProgressA, sampleProgressB]);
      await testDb.table('mistakes').add({
        wordId: 'w_abandon_001',
        streakMistakes: 3,
        stage: 4,
        nextTrackDate: '2026-11-11T00:00:00.000Z',
      });
      await testDb.table('dailyStats').add({
        date: '2026-11-10',
        newWordsCount: 20,
        reviewsCount: 35,
        streakDays: 5,
        completed: true,
      });

      // 2. 匯出備份 JSON
      const exportedJson = await exportToJson();
      expect(typeof exportedJson).toBe('string');

      // 3. 驗證匯出檔案合法性
      const validation = validateBackup(exportedJson);
      expect(validation.valid).toBe(true);

      // 4. 清空既有資料庫模擬資料遺失
      await testDb.table('progress').clear();
      await testDb.table('mistakes').clear();
      await testDb.table('dailyStats').clear();

      expect(await testDb.table('progress').count()).toBe(0);

      // 5. 使用 overwrite 模式還原
      const restoreResult = await importFromJson(exportedJson, 'overwrite');
      expect(restoreResult.success).toBe(true);
      expect(restoreResult.importedCount).toBe(2);

      // 6. 比對還原後資料是否完全一致
      const restoredProgress = await testDb.table('progress').toArray();
      expect(restoredProgress.length).toBe(2);
      expect(restoredProgress).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ wordId: 'w_abandon_001', reps: 1 }),
          expect.objectContaining({ wordId: 'w_ability_002', reps: 3 }),
        ])
      );

      const restoredMistakes = await testDb.table('mistakes').toArray();
      expect(restoredMistakes.length).toBe(1);
      expect(restoredMistakes[0].stage).toBe(4);

      const restoredStats = await testDb.table('dailyStats').toArray();
      expect(restoredStats.length).toBe(1);
      expect(restoredStats[0].streakDays).toBe(5);
    });

    it('匯入非法格式時優雅拒絕，且不破壞既有資料', async () => {
      await testDb.table('progress').add(sampleProgressA);
      expect(await testDb.table('progress').count()).toBe(1);

      const result = await importFromJson('broken json string', 'overwrite');
      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.message).toBeTruthy();

      // 確認既有資料未被清空或破壞
      expect(await testDb.table('progress').count()).toBe(1);
      const item = await testDb.table('progress').get('w_abandon_001');
      expect(item?.wordId).toBe('w_abandon_001');
    });
  });

  describe('importFromJson (merge 模式)', () => {
    it('merge 模式下，兩邊皆有紀錄時應以 lastReview 較新者優先保留，單邊則補齊', async () => {
      // 本機既有資料：
      // - w_abandon_001: lastReview 為 2026-11-01 (較舊)
      // - w_ability_002: lastReview 為 2026-11-08 (較新)
      await testDb.table('progress').bulkAdd([
        {
          ...sampleProgressA,
          wordId: 'w_abandon_001',
          lastReview: '2026-11-01T00:00:00.000Z',
          reps: 2,
        },
        {
          ...sampleProgressB,
          wordId: 'w_ability_002',
          lastReview: '2026-11-08T00:00:00.000Z',
          reps: 10,
        },
      ]);

      // 備份匯入資料：
      // - w_abandon_001: lastReview 為 2026-11-05 (比本機新 -> 應更新本機)
      // - w_ability_002: lastReview 為 2026-11-03 (比本機舊 -> 應保留本機 reps: 10)
      // - w_academic_003: 本機沒有的新單字 -> 應新增
      const incomingProgress: BackupWordProgress[] = [
        {
          ...sampleProgressA,
          wordId: 'w_abandon_001',
          lastReview: '2026-11-05T00:00:00.000Z',
          reps: 5,
        },
        {
          ...sampleProgressB,
          wordId: 'w_ability_002',
          lastReview: '2026-11-03T00:00:00.000Z',
          reps: 3,
        },
        {
          ...sampleProgressA,
          wordId: 'w_academic_003',
          lastReview: '2026-11-04T00:00:00.000Z',
          reps: 1,
        },
      ];

      const payloadData: BackupPayloadData = {
        progress: incomingProgress,
      };
      const backup: BackupPayload = {
        app: 'yizi-bulou',
        version: '1.0.0',
        exportedAt: '2026-11-10T00:00:00.000Z',
        payload: payloadData,
        checksum: computeChecksum(payloadData),
      };

      const result = await importFromJson(JSON.stringify(backup), 'merge');
      expect(result.success).toBe(true);
      // w_abandon_001 (更新) + w_academic_003 (新增) = 2 筆
      expect(result.importedCount).toBe(2);

      // 驗證最終資料庫狀態
      const finalItems = await testDb.table('progress').toArray();
      expect(finalItems.length).toBe(3);

      const abandon = await testDb.table('progress').get('w_abandon_001');
      expect(abandon?.reps).toBe(5); // 更新為較新的 5

      const ability = await testDb.table('progress').get('w_ability_002');
      expect(ability?.reps).toBe(10); // 維持本機較新的 10

      const academic = await testDb.table('progress').get('w_academic_003');
      expect(academic?.reps).toBe(1); // 成功補齊新增項目
    });
  });

  describe('triggerDownload', () => {
    it('應正確呼叫 URL.createObjectURL、觸發 a 標籤點擊與 URL.revokeObjectURL', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:http://localhost/test-uuid');
      const revokeObjectURLMock = vi.fn();
      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      });

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      triggerDownload('{"dummy": true}', 'custom-backup.json');

      expect(createObjectURLMock).toHaveBeenCalledOnce();
      expect(clickSpy).toHaveBeenCalledOnce();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:http://localhost/test-uuid');
    });

    it('未傳入自訂檔名時應自動生成含西元年月日的預設檔名', () => {
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob:mock'),
        revokeObjectURL: vi.fn(),
      });

      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      triggerDownload('{"test": 1}');

      expect(appendChildSpy).toHaveBeenCalled();
      const addedNode = appendChildSpy.mock.calls[0][0] as HTMLAnchorElement;
      expect(addedNode.download).toMatch(/^yizi-bulou-backup-\d{8}\.json$/);
    });
  });

  describe('shouldRemindBackup', () => {
    it('從未備份 (null 或空字串) 應回傳 true 觸發備份提醒', () => {
      expect(shouldRemindBackup(null)).toBe(true);
      expect(shouldRemindBackup('')).toBe(true);
      expect(shouldRemindBackup('invalid-date')).toBe(true);
    });

    it('上次備份在 3 天前 (<= 7 天) 應回傳 false 不提醒', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldRemindBackup(threeDaysAgo)).toBe(false);
    });

    it('上次備份剛好在 7 天前 (<= 7 天) 應回傳 false 不提醒', () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldRemindBackup(sevenDaysAgo)).toBe(false);
    });

    it('上次備份在 8 天前 (> 7 天) 應回傳 true 觸發提醒', () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldRemindBackup(eightDaysAgo)).toBe(true);
    });

    it('上次備份在 30 天前 (> 7 天) 應回傳 true 觸發提醒', () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      expect(shouldRemindBackup(thirtyDaysAgo)).toBe(true);
    });
  });
});
