import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import BacklogAlert from '../../src/components/dashboard/BacklogAlert.vue';
import { useDashboardStore } from '../../src/stores/dashboardStore';

describe('BacklogAlert.vue (TASK-10)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('待複習字數 <= 50 (例如 50) 時不顯示警示橫幅', () => {
    const store = useDashboardStore();
    store.todayDueCount = 50;
    store.backlogThreshold = 50;

    const wrapper = mount(BacklogAlert);
    expect(wrapper.find('[data-testid="backlog-alert"]').exists()).toBe(false);
  });

  it('待複習字數為 0 時不顯示警示橫幅', () => {
    const wrapper = mount(BacklogAlert, {
      props: {
        dueCount: 0,
      },
    });
    expect(wrapper.find('[data-testid="backlog-alert"]').exists()).toBe(false);
  });

  it('待複習字數 > 50 (例如 51) 時應顯示防積壓警示橫幅與警示文案', () => {
    const store = useDashboardStore();
    store.todayDueCount = 51;
    store.backlogThreshold = 50;

    const wrapper = mount(BacklogAlert);
    const alert = wrapper.find('[data-testid="backlog-alert"]');
    expect(alert.exists()).toBe(true);
    expect(wrapper.find('[data-testid="alert-message"]').text()).toContain(
      '今日待複習單字較多，建議先暫停新字，專注清空複習，避免積壓！'
    );
  });

  it('點擊「暫停今日新字」按鈕能正確調用 store 動作將新字上限調整為 0', async () => {
    const store = useDashboardStore();
    store.todayDueCount = 65;
    store.dailyNewLimit = 20;

    const wrapper = mount(BacklogAlert);
    const pauseBtn = wrapper.find('[data-testid="pause-new-words-btn"]');
    expect(pauseBtn.exists()).toBe(true);

    await pauseBtn.trigger('click');

    expect(store.dailyNewLimit).toBe(0);
    expect(wrapper.emitted('pause-new-words')).toBeTruthy();
  });
});
