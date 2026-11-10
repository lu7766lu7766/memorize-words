/**
 * 首頁儀表板狀態 Store (Pinia)
 * 遵循 TASK-10 規格
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const DASHBOARD_STORAGE_KEY = 'yizi_bulou_dashboard';

export interface DashboardState {
  todayReviewedCount: number;
  todayDueCount: number;
  todayNewLearnedCount: number;
  dailyNewLimit: number;
  backlogThreshold: number;
  streakDays: number;
  lastStudyDate: string | null; // YYYY-MM-DD
}

export const DEFAULT_DASHBOARD_STATE: DashboardState = {
  todayReviewedCount: 0,
  todayDueCount: 0,
  todayNewLearnedCount: 0,
  dailyNewLimit: 20,
  backlogThreshold: 50,
  streakDays: 0,
  lastStudyDate: null,
};

/**
 * 取得今日 YYYY-MM-DD 字串（依本機日期）
 */
export function getLocalDateString(d = new Date()): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 計算兩個 YYYY-MM-DD 日期相差的日曆天數 (d2 - d1)
 */
export function diffInCalendarDays(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1 + 'T00:00:00Z');
  const d2 = new Date(dateStr2 + 'T00:00:00Z');
  const diffMs = d2.getTime() - d1.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export const useDashboardStore = defineStore('dashboard', () => {
  // 載入初始值
  const loadInitialState = (): DashboardState => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(DASHBOARD_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...DEFAULT_DASHBOARD_STATE,
            ...parsed,
          };
        }
      } catch (err) {
        console.warn('Failed to parse dashboard state from localStorage', err);
      }
    }
    return { ...DEFAULT_DASHBOARD_STATE };
  };

  const initial = loadInitialState();

  // 響應式狀態
  const todayReviewedCount = ref<number>(initial.todayReviewedCount);
  const todayDueCount = ref<number>(initial.todayDueCount);
  const todayNewLearnedCount = ref<number>(initial.todayNewLearnedCount);
  const dailyNewLimit = ref<number>(initial.dailyNewLimit);
  const backlogThreshold = ref<number>(initial.backlogThreshold);
  const streakDays = ref<number>(initial.streakDays);
  const lastStudyDate = ref<string | null>(initial.lastStudyDate);
  const isLoaded = ref<boolean>(false);

  // 防積壓狀態評估：當待複習數大於閾值（預設 50 個）時，標記為 true
  const isBacklogged = computed(() => todayDueCount.value > backlogThreshold.value);

  // 複習進度百分比
  const reviewProgressPercent = computed(() => {
    const total = todayReviewedCount.value + todayDueCount.value;
    if (total === 0) return 100;
    return Math.min(100, Math.round((todayReviewedCount.value / total) * 100));
  });

  // 新字進度百分比
  const newWordsProgressPercent = computed(() => {
    if (dailyNewLimit.value <= 0) return 100;
    return Math.min(100, Math.round((todayNewLearnedCount.value / dailyNewLimit.value) * 100));
  });

  // 持久化狀態至 localStorage
  const saveToStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const data: DashboardState = {
          todayReviewedCount: todayReviewedCount.value,
          todayDueCount: todayDueCount.value,
          todayNewLearnedCount: todayNewLearnedCount.value,
          dailyNewLimit: dailyNewLimit.value,
          backlogThreshold: backlogThreshold.value,
          streakDays: streakDays.value,
          lastStudyDate: lastStudyDate.value,
        };
        window.localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(data));
      } catch (err) {
        console.warn('Failed to save dashboard state to localStorage', err);
      }
    }
  };

  /**
   * 連續學習天數 (Streak) 計算邏輯：
   * 檢查最後學習日期：
   * - 若從未學習過 (null)，streak 設為 1
   * - 若同日再次學習，streak 保持不變
   * - 若相隔剛好 1 天 (昨天)，streak 累加 1
   * - 若相隔超過 1 天未學習，則重設為 1
   */
  const updateStreak = (studyDate = getLocalDateString()) => {
    if (!lastStudyDate.value) {
      streakDays.value = 1;
    } else {
      const diff = diffInCalendarDays(lastStudyDate.value, studyDate);
      if (diff === 0) {
        // 同日學習，維持當前 streak
        if (streakDays.value === 0) {
          streakDays.value = 1;
        }
      } else if (diff === 1) {
        // 連續隔天學習
        streakDays.value += 1;
      } else if (diff > 1) {
        // 相隔超過 1 天未學習，中斷重設為 1
        streakDays.value = 1;
      }
      // diff < 0 代表未來的時間或時區回退，保持不變
    }
    lastStudyDate.value = studyDate;
    saveToStorage();
  };

  /**
   * 調整每日新字上限
   */
  const setDailyNewLimit = (limit: number) => {
    dailyNewLimit.value = Math.max(0, limit);
    saveToStorage();
  };

  /**
   * 暫停今日新字（將今日新字上限臨時設定為 0）
   */
  const pauseTodayNewWords = () => {
    dailyNewLimit.value = 0;
    saveToStorage();
  };

  /**
   * 記錄學習行為（複習或新學單字）
   */
  const recordStudyEvent = (type: 'review' | 'new', date = getLocalDateString()) => {
    updateStreak(date);

    if (type === 'review') {
      todayReviewedCount.value += 1;
      if (todayDueCount.value > 0) {
        todayDueCount.value -= 1;
      }
    } else if (type === 'new') {
      todayNewLearnedCount.value += 1;
    }

    saveToStorage();
  };

  /**
   * 載入儀表板資料（可整合 Dexie 資料庫）
   */
  const loadDashboardData = async () => {
    const today = getLocalDateString();

    // 檢查日期跨日重設今日計數
    if (lastStudyDate.value && lastStudyDate.value !== today) {
      const diff = diffInCalendarDays(lastStudyDate.value, today);
      if (diff > 1) {
        // 超過 1 天未學習，下次學習時會被重設，但在此若未學則 streak 暫時保留最後紀錄
      }
      todayReviewedCount.value = 0;
      todayNewLearnedCount.value = 0;
    }

    try {
      const { db } = await import('../db');
      if (db && db.progress) {
        const now = new Date();
        const dueWords = await db.progress
          .where('due')
          .belowOrEqual(now)
          .filter((p) => p.state !== 0)
          .count();
        todayDueCount.value = dueWords;
      }
    } catch {
      // 離線或測試未載入 Dexie 時安全忽略
    }

    isLoaded.value = true;
    saveToStorage();
  };

  /**
   * 重設狀態（單元測試時使用）
   */
  const resetDashboard = () => {
    todayReviewedCount.value = DEFAULT_DASHBOARD_STATE.todayReviewedCount;
    todayDueCount.value = DEFAULT_DASHBOARD_STATE.todayDueCount;
    todayNewLearnedCount.value = DEFAULT_DASHBOARD_STATE.todayNewLearnedCount;
    dailyNewLimit.value = DEFAULT_DASHBOARD_STATE.dailyNewLimit;
    backlogThreshold.value = DEFAULT_DASHBOARD_STATE.backlogThreshold;
    streakDays.value = DEFAULT_DASHBOARD_STATE.streakDays;
    lastStudyDate.value = DEFAULT_DASHBOARD_STATE.lastStudyDate;
    isLoaded.value = false;
    saveToStorage();
  };

  return {
    todayReviewedCount,
    todayDueCount,
    todayNewLearnedCount,
    dailyNewLimit,
    backlogThreshold,
    streakDays,
    lastStudyDate,
    isLoaded,
    isBacklogged,
    reviewProgressPercent,
    newWordsProgressPercent,
    updateStreak,
    setDailyNewLimit,
    pauseTodayNewWords,
    recordStudyEvent,
    loadDashboardData,
    resetDashboard,
  };
});
