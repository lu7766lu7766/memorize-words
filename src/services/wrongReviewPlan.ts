import type { PracticeMode } from '../types/practice';
import type { LeechStrategy, WrongRecord } from '../types/wrongReview';

/** 頑固字錯誤次數門檻 */
export const LEECH_THRESHOLD = 3;

/**
 * 格式化日期為 YYYY-MM-DD
 */
export function formatDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 日期位移指定天數
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 判斷是否已到期或逾期 (<= 指定日期)
 */
export function isDue(nextReviewDateStr: string, currentDate: Date = new Date()): boolean {
  if (!nextReviewDateStr) {
    return false;
  }
  return formatDate(currentDate) >= nextReviewDateStr;
}

/**
 * 判定是否達到頑固字門檻 (累積答錯 >= 3 次)
 */
export function isLeech(incorrectCount: number): boolean {
  return incorrectCount >= LEECH_THRESHOLD;
}

export const isLeechWord = isLeech;

/**
 * 取得頑固字專屬策略設定
 * 推薦題型限定為拼字與聽寫，並強制開啟完整例句
 */
export function getLeechStrategy(): LeechStrategy {
  return {
    recommendedModes: ['spelling', 'dictation'],
    showFullSentence: true,
  };
}

/**
 * 依據是否為頑固字提供推薦練習題型
 */
export function getRecommendedModes(isLeechWordStatus: boolean): PracticeMode[] {
  if (isLeechWordStatus) {
    return ['spelling', 'dictation'];
  }
  return ['flashcard', 'quiz', 'spelling', 'dictation'];
}

/**
 * 建立全新錯題紀錄 (初次答錯排定明天 Day+1)
 */
export function createWrongRecord(wordId: string, baseDate: Date = new Date()): WrongRecord {
  const nowIso = baseDate.toISOString();
  const nextDate = formatDate(addDays(baseDate, 1)); // 隔天 (Day+1)

  return {
    wordId,
    firstWrongAt: nowIso,
    incorrectCount: 1,
    stage: 'day1',
    nextReviewDate: nextDate,
    isLeech: false,
    lastAnswerStatus: 'incorrect',
    lastReviewedAt: nowIso,
  };
}

/**
 * 處理答錯排程邏輯：
 * 1. 初次答錯：排定明天 (Day+1)
 * 2. 累積錯誤次數累加，達到 3 次自動升級為頑固字 (isLeech = true)
 * 3. 若在任一階段 (包含 Day 3) 再次答錯，重置短間隔流程回 Day 1 (次日再考)
 */
export function recordWrongAnswerPlan(
  existingRecord: WrongRecord | undefined,
  wordId: string,
  currentDate: Date = new Date()
): WrongRecord {
  const nowIso = currentDate.toISOString();
  const nextDate = formatDate(addDays(currentDate, 1)); // 隔天 (Day+1)

  if (!existingRecord) {
    return {
      wordId,
      firstWrongAt: nowIso,
      incorrectCount: 1,
      stage: 'day1',
      nextReviewDate: nextDate,
      isLeech: false,
      lastAnswerStatus: 'incorrect',
      lastReviewedAt: nowIso,
    };
  }

  const nextCount = existingRecord.incorrectCount + 1;
  const isLeechNow = isLeech(nextCount);

  return {
    ...existingRecord,
    incorrectCount: nextCount,
    isLeech: isLeechNow,
    stage: 'day1', // 重置短間隔流程至 Day+1
    nextReviewDate: nextDate,
    lastAnswerStatus: 'incorrect',
    lastReviewedAt: nowIso,
  };
}

export const processWrongAnswer = recordWrongAnswerPlan;

/**
 * 處理答對排程推進邏輯：
 * 1. Day+1 答對：推進至 Day+3 (間隔 +2 天)
 * 2. Day+3 答對：自短間隔中畢業 (graduated)
 * 3. 已畢業狀態答對保持 graduated
 */
export function recordCorrectAnswerPlan(
  record: WrongRecord,
  currentDate: Date = new Date()
): WrongRecord {
  const nowIso = currentDate.toISOString();

  if (record.stage === 'day1') {
    // 隔天複習答對，排定至第 3 天 (Day+3，相對於本次複習 +2 天)
    const nextDate = formatDate(addDays(currentDate, 2));
    return {
      ...record,
      stage: 'day3',
      nextReviewDate: nextDate,
      lastAnswerStatus: 'correct',
      lastReviewedAt: nowIso,
    };
  }

  if (record.stage === 'day3') {
    // 第 3 天複習亦答對，狀態轉為畢業 (graduated)
    return {
      ...record,
      stage: 'graduated',
      nextReviewDate: '',
      lastAnswerStatus: 'correct',
      lastReviewedAt: nowIso,
    };
  }

  // graduated 狀態保持
  return {
    ...record,
    lastAnswerStatus: 'correct',
    lastReviewedAt: nowIso,
  };
}

export const processCorrectAnswer = recordCorrectAnswerPlan;

/**
 * 重設錯題紀錄
 */
export function resetWrongRecordPlan(record: WrongRecord, currentDate: Date = new Date()): WrongRecord {
  return {
    ...record,
    incorrectCount: 0,
    isLeech: false,
    stage: 'graduated',
    nextReviewDate: '',
    lastAnswerStatus: 'correct',
    lastReviewedAt: currentDate.toISOString(),
  };
}

