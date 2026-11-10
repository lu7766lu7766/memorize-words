/**
 * 學習進度與排程狀態 Store (Pinia)
 * 遵循 TASK-03 規格
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { fsrs, createEmptyCard, Rating, type State } from 'ts-fsrs';
import { db } from '../db';
import type { WordProgress, DailyStat, StudySessionFilter } from '../db/types';

export const useStudyStore = defineStore('study', () => {
  // 響應式狀態
  const todayDueWordIds = ref<string[]>([]);
  const todayNewWordIds = ref<string[]>([]);
  const mistakeWordIds = ref<string[]>([]);
  const isLoaded = ref<boolean>(false);

  /**
   * 載入當日學習與複習單元
   */
  const loadStudySession = async (filter: StudySessionFilter): Promise<void> => {
    isLoaded.value = false;
    const now = new Date();

    // 1. 取得今日待複習單字 (due <= now 且非新字)
    const dueRecords = await db.progress
      .where('due')
      .belowOrEqual(now)
      .filter((p) => p.state !== 0)
      .limit(filter.reviewLimit)
      .toArray();
    todayDueWordIds.value = dueRecords.map((r) => r.wordId);

    // 2. 取得錯題追蹤單字
    const mistakes = await db.mistakes.toArray();
    mistakeWordIds.value = mistakes.map((m) => m.wordId);

    // 3. 取得今日新字
    const newWordIds: string[] = [];

    // 先取得已在 db.progress 中尚未開始學習的新字 (state === 0)
    const unlearned = await db.progress
      .where('state')
      .equals(0)
      .limit(filter.newLimit)
      .toArray();
    for (const u of unlearned) {
      if (!newWordIds.includes(u.wordId)) {
        newWordIds.push(u.wordId);
      }
    }

    // 若尚未達到 newLimit，再從詞庫模組動態補齊
    if (newWordIds.length < filter.newLimit) {
      try {
        const dictModule = (await import('../services/dictService').catch(() => null)) as unknown as {
          loadVocabulary?: () => Promise<Array<{ id: string; category?: string[]; level?: number }>>;
        } | null;
        if (dictModule && typeof dictModule.loadVocabulary === 'function') {
          const vocab = await dictModule.loadVocabulary();
          if (Array.isArray(vocab) && vocab.length > 0) {
            const filtered = vocab.filter((item) => {
              const matchCat =
                !filter.category ||
                (item.category && item.category.includes(filter.category));
              const matchLevel = !filter.level || item.level === filter.level;
              return matchCat && matchLevel;
            });

            const existingKeys = new Set(await db.progress.toCollection().primaryKeys());
            for (const item of filtered) {
              if (!existingKeys.has(item.id) && !newWordIds.includes(item.id)) {
                newWordIds.push(item.id);
                if (newWordIds.length >= filter.newLimit) break;
              }
            }
          }
        }
      } catch {
        // 降級容錯
      }
    }

    todayNewWordIds.value = newWordIds;
    isLoaded.value = true;
  };

  /**
   * 記錄單字複習結果並以 FSRS 演算法計算下次排程
   */
  const recordWordReview = async (
    wordId: string,
    rating: number,
    isMistakeReview = false
  ): Promise<void> => {
    const now = new Date();
    const existingProgress = await db.progress.get(wordId);

    const f = fsrs();
    const cardInput = existingProgress
      ? {
          due: existingProgress.due,
          stability: existingProgress.stability,
          difficulty: existingProgress.difficulty,
          elapsed_days: existingProgress.elapsedDays,
          scheduled_days: existingProgress.scheduledDays,
          reps: existingProgress.reps,
          lapses: existingProgress.lapses,
          state: existingProgress.state as State,
          last_review: existingProgress.lastReview ?? undefined,
        }
      : createEmptyCard(now);

    const fsrsRating = (rating as Rating) || Rating.Good;
    const scheduled = f.next(cardInput, now, fsrsRating);
    const nextCard = scheduled.card;

    // lapses 為答錯次數：當評分為 Again 時累加 1
    const newLapses = (existingProgress?.lapses ?? 0) + (fsrsRating === Rating.Again ? 1 : 0);
    const isDifficult = newLapses >= 3 || (existingProgress?.isDifficult ?? false);

    // 1. 更新 progress 表
    const updatedProgress: WordProgress = {
      wordId,
      due: nextCard.due,
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      elapsedDays: nextCard.elapsed_days,
      scheduledDays: nextCard.scheduled_days,
      reps: nextCard.reps,
      lapses: newLapses,
      state: nextCard.state,
      lastReview: now,
      isDifficult,
    };
    await db.progress.put(updatedProgress);

    // 2. 寫入複習歷史 reviewLogs
    await db.reviewLogs.add({
      wordId,
      rating: fsrsRating,
      state: nextCard.state,
      due: nextCard.due,
      stability: nextCard.stability,
      difficulty: nextCard.difficulty,
      reviewedAt: now,
    });

    // 3. 答錯專屬計畫追蹤更新
    const todayStr = now.toISOString().slice(0, 10);
    const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

    if (rating === Rating.Again) {
      // 答錯：累加連續錯誤並排定隔天
      const existingMistake = await db.mistakes.get(wordId);
      const streak = (existingMistake?.streakMistakes ?? 0) + 1;
      const stage = isDifficult ? 4 : (existingMistake ? Math.min(existingMistake.stage + 1, 3) : 1);

      await db.mistakes.put({
        wordId,
        streakMistakes: streak,
        stage,
        nextTrackDate: tomorrowStr,
      });

      if (!mistakeWordIds.value.includes(wordId)) {
        mistakeWordIds.value.push(wordId);
      }
    } else if (rating >= Rating.Good && isMistakeReview) {
      // 錯題複習答對
      const existingMistake = await db.mistakes.get(wordId);
      if (existingMistake) {
        if (existingMistake.stage >= 3 && !isDifficult) {
          // 畢業：自錯題表移除
          await db.mistakes.delete(wordId);
          mistakeWordIds.value = mistakeWordIds.value.filter((id) => id !== wordId);
        } else {
          // 推進至第 3 天 (Stage 3)
          const in3DaysStr = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);
          await db.mistakes.put({
            ...existingMistake,
            stage: existingMistake.stage + 1,
            nextTrackDate: in3DaysStr,
          });
        }
      }
    }

    // 4. 更新每日學習統計 dailyStats
    const existingStat = await db.dailyStats.get(todayStr);
    const stat: DailyStat = existingStat ?? {
      date: todayStr,
      newWordsCount: 0,
      reviewsCount: 0,
      streakDays: 1,
      completed: false,
    };
    stat.reviewsCount += 1;
    if (!existingProgress || existingProgress.state === 0) {
      stat.newWordsCount += 1;
    }
    await db.dailyStats.put(stat);

    // 5. 響應式狀態移除已完成單字
    todayDueWordIds.value = todayDueWordIds.value.filter((id) => id !== wordId);
    todayNewWordIds.value = todayNewWordIds.value.filter((id) => id !== wordId);
  };

  /**
   * 查詢單字學習進度
   */
  const getWordProgress = async (wordId: string): Promise<WordProgress | undefined> => {
    return await db.progress.get(wordId);
  };

  /**
   * 取得錯題清單（包含 mistakes 與 isDifficult 頑固字）
   */
  const getMistakeList = async (): Promise<WordProgress[]> => {
    const mistakeRecords = await db.mistakes.toArray();
    const mistakeIdSet = new Set(mistakeRecords.map((m) => m.wordId));

    // 同步包含 isDifficult 為 true 的單字
    const difficultProgress = await db.progress.where('isDifficult').equals(1).toArray();
    for (const dp of difficultProgress) {
      mistakeIdSet.add(dp.wordId);
    }

    const results: WordProgress[] = [];
    for (const id of mistakeIdSet) {
      const prog = await db.progress.get(id);
      if (prog) {
        results.push(prog);
      } else {
        const mRecord = mistakeRecords.find((m) => m.wordId === id);
        results.push({
          wordId: id,
          due: new Date(),
          stability: 0,
          difficulty: 0,
          elapsedDays: 0,
          scheduledDays: 0,
          reps: 0,
          lapses: 1,
          state: 1,
          lastReview: new Date(),
          isDifficult: mRecord?.stage === 4,
        });
      }
    }
    return results;
  };

  return {
    todayDueWordIds,
    todayNewWordIds,
    mistakeWordIds,
    isLoaded,
    loadStudySession,
    recordWordReview,
    getWordProgress,
    getMistakeList,
  };
});

