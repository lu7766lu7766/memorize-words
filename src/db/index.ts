/**
 * Dexie.js 本機資料庫 (IndexedDB)
 * 遵循 TASK-03 規格
 */
import { Dexie, type Table, type DexieOptions } from 'dexie';
import type { WordProgress, ReviewLog, MistakeRecord, DailyStat } from './types';

export class YiziBulouDatabase extends Dexie {
  progress!: Table<WordProgress, string>;
  reviewLogs!: Table<ReviewLog, number>;
  mistakes!: Table<MistakeRecord, string>;
  dailyStats!: Table<DailyStat, string>;

  constructor(dbName = 'yizi_bulou_db', options?: DexieOptions) {
    super(dbName, options);

    // DBCore 中介軟體：透明轉換 boolean 查詢，使 where('isDifficult').equals(true) 能無縫運作於 IndexedDB
    this.use({
      stack: 'dbcore',
      name: 'BooleanIndexMiddleware',
      create(downlevelDatabase) {
        return {
          ...downlevelDatabase,
          table(tableName) {
            const table = downlevelDatabase.table(tableName);
            return {
              ...table,
              query(req) {
                if (req.query.index && req.query.index.name === 'isDifficult') {
                  const range = req.query.range;
                  if (range) {
                    const newRange = { ...range };
                    if (typeof newRange.lower === 'boolean') {
                      (newRange as { lower: number | boolean }).lower = newRange.lower ? 1 : 0;
                    }
                    if (typeof newRange.upper === 'boolean') {
                      (newRange as { upper: number | boolean }).upper = newRange.upper ? 1 : 0;
                    }
                    return table.query({
                      ...req,
                      query: {
                        ...req.query,
                        range: newRange,
                      },
                    });
                  }
                }
                return table.query(req);
              },
            };
          },
        };
      },
    });

    this.version(1).stores({
      progress: '&wordId, due, state, lapses, isDifficult, lastReview',
      reviewLogs: '++id, wordId, reviewedAt, rating',
      mistakes: '&wordId, stage, nextTrackDate',
      dailyStats: 'date, streakDays, completed',
    });

    // 透過 Hook 將 boolean 轉為 0/1 存入以利 IndexedDB 索引，讀出時還原為 boolean
    this.progress.hook('creating', (_primKey, obj) => {
      if (!obj) return;
      const item = obj as unknown as { isDifficult?: boolean | number };
      if (typeof item.isDifficult === 'boolean') {
        item.isDifficult = item.isDifficult ? 1 : 0;
      }
    });

    this.progress.hook('updating', (modifications) => {
      if (!modifications) return undefined;
      const mods = modifications as Record<string, unknown>;
      if (typeof mods.isDifficult === 'boolean') {
        return {
          ...mods,
          isDifficult: mods.isDifficult ? 1 : 0,
        };
      }
      return undefined;
    });

    this.progress.hook('reading', (obj) => {
      if (!obj) return obj;
      const item = obj as unknown as { isDifficult?: boolean | number };
      if (typeof item.isDifficult === 'number') {
        item.isDifficult = Boolean(item.isDifficult);
      }
      return obj as WordProgress;
    });
  }

  /**
   * 查詢待複習單字（排定時間小於等於指定時間者）
   */
  async getDueWords(beforeDate: Date = new Date()): Promise<WordProgress[]> {
    return await this.progress.where('due').belowOrEqual(beforeDate).toArray();
  }

  /**
   * 查詢頑固字（isDifficult 為 true 者）
   */
  async getDifficultWords(): Promise<WordProgress[]> {
    return await this.progress.where('isDifficult').equals(1).toArray();
  }

  /**
   * 取得指定單字的學習進度
   */
  async getWordProgress(wordId: string): Promise<WordProgress | undefined> {
    return await this.progress.get(wordId);
  }

  /**
   * 儲存或更新單字進度
   */
  async saveWordProgress(progress: WordProgress): Promise<string> {
    return await this.progress.put(progress);
  }

  /**
   * 記錄單次複習紀錄
   */
  async recordReviewLog(log: Omit<ReviewLog, 'id'>): Promise<number> {
    return (await this.reviewLogs.add(log as ReviewLog)) as number;
  }

  /**
   * 取得所有錯題紀錄
   */
  async getMistakeList(): Promise<MistakeRecord[]> {
    return await this.mistakes.toArray();
  }

  /**
   * 取得單字錯題紀錄
   */
  async getMistakeRecord(wordId: string): Promise<MistakeRecord | undefined> {
    return await this.mistakes.get(wordId);
  }

  /**
   * 儲存或更新錯題紀錄
   */
  async saveMistakeRecord(mistake: MistakeRecord): Promise<string> {
    return await this.mistakes.put(mistake);
  }

  /**
   * 移除錯題紀錄
   */
  async removeMistakeRecord(wordId: string): Promise<void> {
    await this.mistakes.delete(wordId);
  }

  /**
   * 取得每日學習統計
   */
  async getDailyStat(date: string): Promise<DailyStat | undefined> {
    return await this.dailyStats.get(date);
  }

  /**
   * 儲存每日學習統計
   */
  async saveDailyStat(stat: DailyStat): Promise<string> {
    return await this.dailyStats.put(stat);
  }

  /**
   * 清空所有資料表（用於測試清理或重設）
   */
  async clearAllTables(): Promise<void> {
    await this.transaction('rw', [this.progress, this.reviewLogs, this.mistakes, this.dailyStats], async () => {
      await this.progress.clear();
      await this.reviewLogs.clear();
      await this.mistakes.clear();
      await this.dailyStats.clear();
    });
  }
}

export const db = new YiziBulouDatabase();
export default db;
export * from './types';

