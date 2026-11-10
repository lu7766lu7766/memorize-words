import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { db } from '../db';
import type { MistakeRecord } from '../db/types';
import {
  formatDate,
  recordCorrectAnswerPlan,
  recordWrongAnswerPlan,
  resetWrongRecordPlan,
} from '../services/wrongReviewPlan';
import type { LastAnswerStatus, ShortIntervalStage, WrongRecord } from '../types/wrongReview';

export interface StoredMistakeItem {
  wordId: string;
  streakMistakes: number;
  stage: number;
  nextTrackDate: string;
  firstWrongAt?: string;
  incorrectCount?: number;
  wrongStage?: ShortIntervalStage;
  isLeech?: boolean;
  lastAnswerStatus?: LastAnswerStatus;
  lastReviewedAt?: string;
}

export const useWrongReviewStore = defineStore('wrongReview', () => {
  // 核心錯題字典，以 wordId 為鍵
  const records = ref<Record<string, WrongRecord>>({});
  const isLoaded = ref<boolean>(false);

  /**
   * 所有錯題紀錄清單
   */
  const allWrongItems = computed<WrongRecord[]>(() => {
    return Object.values(records.value);
  });

  /**
   * 累積錯題總數
   */
  const wrongCount = computed<number>(() => {
    return allWrongItems.value.length;
  });

  /**
   * 今日待追蹤之 Day 1 / Day 3 錯題清單
   * 排除已畢業項目，且到期日小於等於今日
   */
  const todayFollowUpList = computed<WrongRecord[]>(() => {
    const today = formatDate();
    return allWrongItems.value.filter(
      (r) => r.stage !== 'graduated' && Boolean(r.nextReviewDate) && r.nextReviewDate <= today
    );
  });

  /**
   * 所有頑固字清單 (isLeech === true)
   */
  const leechList = computed<WrongRecord[]>(() => {
    return allWrongItems.value.filter((r) => r.isLeech);
  });

  /**
   * 從 IndexedDB 載入錯題清單
   */
  const loadFromDb = async (): Promise<void> => {
    try {
      if (db && db.mistakes) {
        const dbItems = (await db.mistakes.toArray()) as StoredMistakeItem[];
        const map: Record<string, WrongRecord> = {};

        for (const item of dbItems) {
          const stageStr: ShortIntervalStage =
            item.wrongStage ||
            (item.stage === 1 ? 'day1' : item.stage === 2 ? 'day3' : item.stage === 3 ? 'graduated' : 'day1');

          const isLeechVal: boolean =
            item.isLeech !== undefined
              ? item.isLeech
              : item.stage === 4
              ? true
              : (item.streakMistakes ?? 0) >= 3;

          map[item.wordId] = {
            wordId: item.wordId,
            firstWrongAt: item.firstWrongAt || new Date().toISOString(),
            incorrectCount: item.incorrectCount ?? item.streakMistakes ?? 1,
            stage: stageStr,
            nextReviewDate: item.nextTrackDate || formatDate(),
            isLeech: isLeechVal,
            lastAnswerStatus: item.lastAnswerStatus || 'incorrect',
            lastReviewedAt: item.lastReviewedAt,
          };
        }
        records.value = map;
      }
    } catch {
      // 容錯防禦：若資料庫尚未建立或不可用時回退
    } finally {
      isLoaded.value = true;
    }
  };

  /**
   * 紀錄答錯單字
   */
  const recordWrongAnswer = async (wordId: string, date?: Date): Promise<WrongRecord> => {
    const current = records.value[wordId];
    const updated = recordWrongAnswerPlan(current, wordId, date);

    records.value = {
      ...records.value,
      [wordId]: updated,
    };

    // 同步持久化至 Dexie IndexedDB
    try {
      if (db && db.mistakes) {
        const dbStage = updated.isLeech ? 4 : updated.stage === 'day1' ? 1 : 2;
        const mistakeData: StoredMistakeItem = {
          wordId: updated.wordId,
          streakMistakes: updated.incorrectCount,
          stage: dbStage,
          nextTrackDate: updated.nextReviewDate,
          firstWrongAt: updated.firstWrongAt,
          incorrectCount: updated.incorrectCount,
          wrongStage: updated.stage,
          isLeech: updated.isLeech,
          lastAnswerStatus: updated.lastAnswerStatus,
          lastReviewedAt: updated.lastReviewedAt,
        };
        await db.mistakes.put(mistakeData as MistakeRecord);
      }
    } catch {
      // IndexedDB 寫入容錯
    }

    return updated;
  };

  /**
   * 紀錄答對單字並推進階段
   */
  const recordCorrectAnswer = async (wordId: string, date?: Date): Promise<WrongRecord | undefined> => {
    const current = records.value[wordId];
    if (!current) {
      return undefined;
    }

    const updated = recordCorrectAnswerPlan(current, date);

    records.value = {
      ...records.value,
      [wordId]: updated,
    };

    try {
      if (db && db.mistakes) {
        const dbStage = updated.isLeech
          ? 4
          : updated.stage === 'day1'
          ? 1
          : updated.stage === 'day3'
          ? 2
          : 3;
        const mistakeData: StoredMistakeItem = {
          wordId: updated.wordId,
          streakMistakes: updated.incorrectCount,
          stage: dbStage,
          nextTrackDate: updated.nextReviewDate,
          firstWrongAt: updated.firstWrongAt,
          incorrectCount: updated.incorrectCount,
          wrongStage: updated.stage,
          isLeech: updated.isLeech,
          lastAnswerStatus: updated.lastAnswerStatus,
          lastReviewedAt: updated.lastReviewedAt,
        };
        await db.mistakes.put(mistakeData as MistakeRecord);
      }
    } catch {
      // IndexedDB 寫入容錯
    }

    return updated;
  };

  /**
   * 移除錯題紀錄
   */
  const removeWrongRecord = async (wordId: string): Promise<void> => {
    const newRecords = { ...records.value };
    delete newRecords[wordId];
    records.value = newRecords;

    try {
      if (db && db.mistakes) {
        await db.mistakes.delete(wordId);
      }
    } catch {
      // 容錯防禦
    }
  };

  /**
   * 重設指定錯題紀錄
   */
  const resetWrongRecord = async (wordId: string): Promise<void> => {
    const current = records.value[wordId];
    if (!current) {
      return;
    }

    const reset = resetWrongRecordPlan(current);
    records.value = {
      ...records.value,
      [wordId]: reset,
    };

    try {
      if (db && db.mistakes) {
        const resetItem: StoredMistakeItem = {
          wordId: reset.wordId,
          streakMistakes: 0,
          stage: 3,
          nextTrackDate: '',
          firstWrongAt: reset.firstWrongAt,
          incorrectCount: 0,
          wrongStage: 'graduated',
          isLeech: false,
          lastAnswerStatus: 'correct',
          lastReviewedAt: reset.lastReviewedAt,
        };
        await db.mistakes.put(resetItem as MistakeRecord);
      }
    } catch {
      // 容錯防禦
    }
  };

  /**
   * 清空所有錯題（測試清理用）
   */
  const clearAll = async (): Promise<void> => {
    records.value = {};
    try {
      if (db && db.mistakes) {
        await db.mistakes.clear();
      }
    } catch {
      // 容錯防禦
    }
  };

  return {
    records,
    isLoaded,
    allWrongItems,
    wrongCount,
    todayFollowUpList,
    leechList,
    loadFromDb,
    recordWrongAnswer,
    recordCorrectAnswer,
    removeWrongRecord,
    resetWrongRecord,
    clearAll,
  };
});


