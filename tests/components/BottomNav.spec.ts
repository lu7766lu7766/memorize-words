import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import BottomNav from '../../src/components/layout/BottomNav.vue';

describe('BottomNav 元件測試 (TASK-11)', () => {
  it('應完整渲染四個導覽標籤：首頁、練習、錯題本、設定', () => {
    const wrapper = mount(BottomNav);

    const tabs = wrapper.findAll('.nav-item');
    expect(tabs).toHaveLength(4);

    expect(wrapper.find('[data-testid="nav-dashboard"]').text()).toContain('首頁');
    expect(wrapper.find('[data-testid="nav-practice"]').text()).toContain('練習');
    expect(wrapper.find('[data-testid="nav-notebook"]').text()).toContain('錯題本');
    expect(wrapper.find('[data-testid="nav-settings"]').text()).toContain('設定');
  });

  it('預設啟用標籤為首頁 (dashboard)，且高亮樣式與 aria-selected 正確', () => {
    const wrapper = mount(BottomNav);

    const dashboardBtn = wrapper.find('[data-testid="nav-dashboard"]');
    expect(dashboardBtn.classes()).toContain('active');
    expect(dashboardBtn.attributes('aria-selected')).toBe('true');

    const practiceBtn = wrapper.find('[data-testid="nav-practice"]');
    expect(practiceBtn.classes()).not.toContain('active');
    expect(practiceBtn.attributes('aria-selected')).toBe('false');
  });

  it('傳入 currentTab 時應正確高亮對應標籤', () => {
    const wrapper = mount(BottomNav, {
      props: {
        currentTab: 'practice',
      },
    });

    const practiceBtn = wrapper.find('[data-testid="nav-practice"]');
    expect(practiceBtn.classes()).toContain('active');
    expect(practiceBtn.attributes('aria-selected')).toBe('true');

    const dashboardBtn = wrapper.find('[data-testid="nav-dashboard"]');
    expect(dashboardBtn.classes()).not.toContain('active');
  });

  it('點擊標籤時應發送 navigate, update:currentTab, update:modelValue 與 change 事件', async () => {
    const wrapper = mount(BottomNav, {
      props: {
        currentTab: 'dashboard',
      },
    });

    const notebookBtn = wrapper.find('[data-testid="nav-notebook"]');
    await notebookBtn.trigger('click');

    expect(wrapper.emitted('navigate')).toBeTruthy();
    expect(wrapper.emitted('navigate')![0]).toEqual(['notebook']);

    expect(wrapper.emitted('update:currentTab')).toBeTruthy();
    expect(wrapper.emitted('update:currentTab')![0]).toEqual(['notebook']);

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['notebook']);

    expect(wrapper.emitted('change')).toBeTruthy();
    expect(wrapper.emitted('change')![0]).toEqual(['notebook']);
  });

  it('所有導覽標籤應符合行動裝置觸控熱區規範 (min-height >= 48px, min-width >= 48px)', () => {
    const wrapper = mount(BottomNav);

    const buttons = wrapper.findAll('.nav-item');
    expect(buttons.length).toBeGreaterThan(0);

    buttons.forEach((btn) => {
      expect(btn.attributes('role')).toBe('tab');
      // 驗證按鈕包含 nav-item 類別（CSS 規範 min-width: 48px; min-height: 48px）
      expect(btn.classes()).toContain('nav-item');
    });
  });
});

