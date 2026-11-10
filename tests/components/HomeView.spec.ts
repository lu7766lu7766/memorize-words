import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HomeView from '../../src/views/HomeView.vue';
import { useDashboardStore } from '../../src/stores/dashboardStore';

describe('HomeView.vue (TASK-10)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('應整合 StreakMilestone、ReviewCounter 與三大入口按鈕', () => {
    const store = useDashboardStore();
    store.todayDueCount = 15;
    store.todayReviewedCount = 10;
    store.dailyNewLimit = 20;

    const wrapper = mount(HomeView);

    expect(wrapper.find('[data-testid="streak-milestone-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="review-counter-card"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="start-review-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="start-new-words-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="start-mistakes-btn"]').exists()).toBe(true);
  });

  it('當待複習單字 > 50 時應於首頁呈現防積壓警示', () => {
    const store = useDashboardStore();
    store.todayDueCount = 55;

    const wrapper = mount(HomeView);
    expect(wrapper.find('[data-testid="backlog-alert"]').exists()).toBe(true);
  });

  it('點擊「開始今日複習」按鈕能正常發射 start-review 與導覽事件', async () => {
    const onStartReview = vi.fn();
    const wrapper = mount(HomeView, {
      props: {
        onStartReview,
      },
    });

    const btn = wrapper.find('[data-testid="start-review-btn"]');
    await btn.trigger('click');

    expect(wrapper.emitted('start-review')).toBeTruthy();
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['review']);
    expect(onStartReview).toHaveBeenCalledOnce();
  });

  it('點擊「學習今日新字」按鈕能正常發射 start-new-words 與導覽事件', async () => {
    const onStartNewWords = vi.fn();
    const wrapper = mount(HomeView, {
      props: {
        onStartNewWords,
      },
    });

    const btn = wrapper.find('[data-testid="start-new-words-btn"]');
    await btn.trigger('click');

    expect(wrapper.emitted('start-new-words')).toBeTruthy();
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['new-words']);
    expect(onStartNewWords).toHaveBeenCalledOnce();
  });

  it('點擊「錯題快速複習」按鈕能正常發射 start-mistakes 與導覽事件', async () => {
    const onStartMistakes = vi.fn();
    const wrapper = mount(HomeView, {
      props: {
        onStartMistakes,
      },
    });

    const btn = wrapper.find('[data-testid="start-mistakes-btn"]');
    await btn.trigger('click');

    expect(wrapper.emitted('start-mistakes')).toBeTruthy();
    expect(wrapper.emitted('navigate')?.[0]).toEqual(['mistakes']);
    expect(onStartMistakes).toHaveBeenCalledOnce();
  });

  describe('ReviewCounter.vue 整合與進度顯示', () => {
    it('應展示今日複習進度、新字進度與不占額度提示', () => {
      const store = useDashboardStore();
      store.todayReviewedCount = 12;
      store.todayDueCount = 8;
      store.todayNewLearnedCount = 5;
      store.dailyNewLimit = 20;

      const wrapper = mount(HomeView);

      expect(wrapper.find('[data-testid="review-values-text"]').text()).toContain('已完成 12 / 待複習 8');
      expect(wrapper.find('[data-testid="new-values-text"]').text()).toContain('已學習 5 / 上限 20 個');
      expect(wrapper.find('[data-testid="mistake-quota-tip"]').text()).toContain('錯題複習不占新字額度');
    });
  });

  describe('dashboardStore 業務邏輯驗證', () => {
    it('連續打卡 streak 計算：同日不重複累加、次日累加、間隔超過 1 天重設為 1', () => {
      const store = useDashboardStore();
      store.resetDashboard();

      // 初次學習
      store.updateStreak('2026-11-01');
      expect(store.streakDays).toBe(1);

      // 同日再次學習
      store.updateStreak('2026-11-01');
      expect(store.streakDays).toBe(1);

      // 隔天 (Day+1) 學習
      store.updateStreak('2026-11-02');
      expect(store.streakDays).toBe(2);

      // 再隔天 (Day+2) 學習
      store.updateStreak('2026-11-03');
      expect(store.streakDays).toBe(3);

      // 間隔超過 1 天未學習 (跳到 11-05)
      store.updateStreak('2026-11-05');
      expect(store.streakDays).toBe(1);
    });

    it('防積壓狀態與暫停新字功能', () => {
      const store = useDashboardStore();
      store.resetDashboard();

      store.todayDueCount = 50;
      expect(store.isBacklogged).toBe(false);

      store.todayDueCount = 51;
      expect(store.isBacklogged).toBe(true);

      store.pauseTodayNewWords();
      expect(store.dailyNewLimit).toBe(0);
    });

    it('記錄學習事件 recordStudyEvent 能正確推進數據', () => {
      const store = useDashboardStore();
      store.resetDashboard();
      store.todayDueCount = 10;

      store.recordStudyEvent('review', '2026-11-10');
      expect(store.todayReviewedCount).toBe(1);
      expect(store.todayDueCount).toBe(9);
      expect(store.streakDays).toBe(1);

      store.recordStudyEvent('new', '2026-11-10');
      expect(store.todayNewLearnedCount).toBe(1);
    });
  });
});
