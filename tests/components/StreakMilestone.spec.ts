import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import StreakMilestone from '../../src/components/dashboard/StreakMilestone.vue';
import { useDashboardStore } from '../../src/stores/dashboardStore';

describe('StreakMilestone.vue (TASK-10)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('應正確渲染連續打卡天數（例如 5 天）', () => {
    const store = useDashboardStore();
    store.streakDays = 5;

    const wrapper = mount(StreakMilestone);
    expect(wrapper.find('[data-testid="streak-days-text"]').text()).toContain('5 天');
  });

  it('連續天數未滿 10 天時不顯示里程碑勳章，並提示距離 10 天的剩餘天數', () => {
    const store = useDashboardStore();
    store.streakDays = 4;

    const wrapper = mount(StreakMilestone);
    expect(wrapper.find('[data-testid="milestone-badge"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="streak-encourage"]').text()).toContain('還差 6 天');
  });

  it('連續天數達到 10 天時應顯示 10 天里程碑勳章與激勵文案', () => {
    const store = useDashboardStore();
    store.streakDays = 10;

    const wrapper = mount(StreakMilestone);
    const badge = wrapper.find('[data-testid="milestone-badge"]');
    expect(badge.exists()).toBe(true);
    expect(wrapper.find('[data-testid="milestone-title"]').text()).toContain('10 天勳章');
    expect(wrapper.find('[data-testid="milestone-congrats"]').text()).toContain('恭喜達成 10 天連續學習里程碑！');
  });

  it('連續天數達到 23 天時應顯示 20 天里程碑勳章與文案', () => {
    const store = useDashboardStore();
    store.streakDays = 23;

    const wrapper = mount(StreakMilestone);
    const badge = wrapper.find('[data-testid="milestone-badge"]');
    expect(badge.exists()).toBe(true);
    expect(wrapper.find('[data-testid="milestone-title"]').text()).toContain('20 天勳章');
    expect(wrapper.find('[data-testid="milestone-congrats"]').text()).toContain('恭喜達成 20 天連續學習里程碑！');
  });

  it('連續天數達到 30 天時應解鎖 30 天里程碑', () => {
    const wrapper = mount(StreakMilestone, {
      props: {
        streak: 30,
      },
    });

    expect(wrapper.find('[data-testid="streak-days-text"]').text()).toContain('30 天');
    expect(wrapper.find('[data-testid="milestone-title"]').text()).toContain('30 天勳章');
    expect(wrapper.find('[data-testid="milestone-congrats"]').text()).toContain('恭喜達成 30 天連續學習里程碑！');
  });
});
