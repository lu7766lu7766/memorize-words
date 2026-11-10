/**
 * 使用者偏好設定 Store (Pinia)
 * 遵循 TASK-03 規格，結合 localStorage 自動持久化
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface SettingsState {
  dailyNewWords: number;
  dailyReviewLimit: number;
  ttsRate: number;
  activeCategory: 'gsat' | 'toeic';
  activeLevel: number;
  lastBackupDate: string | null;
}

export const SETTINGS_STORAGE_KEY = 'yizi_bulou_settings';

export const DEFAULT_SETTINGS: SettingsState = {
  dailyNewWords: 20,
  dailyReviewLimit: 100,
  ttsRate: 1.0,
  activeCategory: 'gsat',
  activeLevel: 1,
  lastBackupDate: null,
};

export const useSettingsStore = defineStore('settings', () => {
  const loadInitialSettings = (): SettingsState => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            ...DEFAULT_SETTINGS,
            ...parsed,
          };
        }
      } catch (e) {
        console.warn('Failed to parse settings from localStorage', e);
      }
    }
    return { ...DEFAULT_SETTINGS };
  };

  const initial = loadInitialSettings();

  // 響應式狀態
  const dailyNewWords = ref<number>(initial.dailyNewWords);
  const dailyReviewLimit = ref<number>(initial.dailyReviewLimit);
  const ttsRate = ref<number>(initial.ttsRate);
  const activeCategory = ref<'gsat' | 'toeic'>(initial.activeCategory);
  const activeLevel = ref<number>(initial.activeLevel);
  const lastBackupDate = ref<string | null>(initial.lastBackupDate);

  // 持久化至 localStorage
  const saveToStorage = () => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const state: SettingsState = {
        dailyNewWords: dailyNewWords.value,
        dailyReviewLimit: dailyReviewLimit.value,
        ttsRate: ttsRate.value,
        activeCategory: activeCategory.value,
        activeLevel: activeLevel.value,
        lastBackupDate: lastBackupDate.value,
      };
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(state));
    }
  };

  // Actions
  const setDailyNewWords = (count: number) => {
    dailyNewWords.value = count;
    saveToStorage();
  };

  const setDailyReviewLimit = (limit: number) => {
    dailyReviewLimit.value = limit;
    saveToStorage();
  };

  const setTtsRate = (rate: number) => {
    ttsRate.value = rate;
    saveToStorage();
  };

  const setActiveCategory = (category: 'gsat' | 'toeic') => {
    activeCategory.value = category;
    saveToStorage();
  };

  const setActiveLevel = (level: number) => {
    activeLevel.value = level;
    saveToStorage();
  };

  const setLastBackupDate = (date: string | null) => {
    lastBackupDate.value = date;
    saveToStorage();
  };

  const updateSettings = (patch: Partial<SettingsState>) => {
    if (patch.dailyNewWords !== undefined) dailyNewWords.value = patch.dailyNewWords;
    if (patch.dailyReviewLimit !== undefined) dailyReviewLimit.value = patch.dailyReviewLimit;
    if (patch.ttsRate !== undefined) ttsRate.value = patch.ttsRate;
    if (patch.activeCategory !== undefined) activeCategory.value = patch.activeCategory;
    if (patch.activeLevel !== undefined) activeLevel.value = patch.activeLevel;
    if (patch.lastBackupDate !== undefined) lastBackupDate.value = patch.lastBackupDate;
    saveToStorage();
  };

  const resetSettings = () => {
    dailyNewWords.value = DEFAULT_SETTINGS.dailyNewWords;
    dailyReviewLimit.value = DEFAULT_SETTINGS.dailyReviewLimit;
    ttsRate.value = DEFAULT_SETTINGS.ttsRate;
    activeCategory.value = DEFAULT_SETTINGS.activeCategory;
    activeLevel.value = DEFAULT_SETTINGS.activeLevel;
    lastBackupDate.value = DEFAULT_SETTINGS.lastBackupDate;
    saveToStorage();
  };

  return {
    dailyNewWords,
    dailyReviewLimit,
    ttsRate,
    activeCategory,
    activeLevel,
    lastBackupDate,
    setDailyNewWords,
    setDailyReviewLimit,
    setTtsRate,
    setActiveCategory,
    setActiveLevel,
    setLastBackupDate,
    updateSettings,
    resetSettings,
    saveToStorage,
  };
});

