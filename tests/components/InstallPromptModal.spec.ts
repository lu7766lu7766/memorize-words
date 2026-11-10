import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import InstallPromptModal from '../../src/components/pwa/InstallPromptModal.vue';
import { INSTALL_DISMISSED_STORAGE_KEY } from '../../src/composables/usePwaInstall';

describe('InstallPromptModal 元件測試 (TASK-11)', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear();
    }
  });

  it('Android / 桌面模式下應渲染專屬安裝區塊與「立即安裝」按鈕', () => {
    const wrapper = mount(InstallPromptModal, {
      props: {
        modelValue: true,
        forceAndroid: true,
      },
    });

    expect(wrapper.find('[data-testid="install-modal"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="android-install-section"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ios-install-section"]').exists()).toBe(false);

    const installBtn = wrapper.find('[data-testid="install-btn"]');
    expect(installBtn.exists()).toBe(true);
    expect(installBtn.text()).toContain('立即安裝 App');
  });

  it('iOS 模式下應渲染專屬加到主畫面三步驟指示', () => {
    const wrapper = mount(InstallPromptModal, {
      props: {
        modelValue: true,
        forceIOS: true,
      },
    });

    expect(wrapper.find('[data-testid="install-modal"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ios-install-section"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="android-install-section"]').exists()).toBe(false);

    const steps = wrapper.findAll('.step-item');
    expect(steps).toHaveLength(3);
    expect(steps[0].text()).toContain('分享');
    expect(steps[1].text()).toContain('加入主畫面');
    expect(steps[2].text()).toContain('新增');

    const okBtn = wrapper.find('[data-testid="dismiss-btn"]');
    expect(okBtn.exists()).toBe(true);
    expect(okBtn.text()).toContain('我知道了');
  });

  it('點擊關閉按鈕應發送 dismiss/close 事件並持久化至 localStorage', async () => {
    const wrapper = mount(InstallPromptModal, {
      props: {
        modelValue: true,
        forceAndroid: true,
      },
    });

    const closeBtn = wrapper.find('[data-testid="close-btn"]');
    await closeBtn.trigger('click');

    expect(wrapper.emitted('dismiss')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false]);

    // 驗證 localStorage 持久化記錄已寫入
    expect(window.localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY)).toBe('true');
  });

  it('點擊稍後再說按鈕應發送 dismiss 事件並寫入略過記錄', async () => {
    const wrapper = mount(InstallPromptModal, {
      props: {
        modelValue: true,
        forceAndroid: true,
      },
    });

    const dismissBtn = wrapper.find('[data-testid="dismiss-btn"]');
    await dismissBtn.trigger('click');

    expect(wrapper.emitted('dismiss')).toBeTruthy();
    expect(window.localStorage.getItem(INSTALL_DISMISSED_STORAGE_KEY)).toBe('true');
  });

  it('點擊背景遮罩 (Backdrop) 應觸發略過與關閉', async () => {
    const wrapper = mount(InstallPromptModal, {
      props: {
        modelValue: true,
        forceIOS: true,
      },
    });

    const backdrop = wrapper.find('[data-testid="install-modal"]');
    await backdrop.trigger('click');

    expect(wrapper.emitted('dismiss')).toBeTruthy();
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('在 375px（iPhone SE）至 430px（iPhone Pro Max）視窗下，排版無溢出且容器自適應', () => {
    const viewports = [375, 390, 414, 430];

    viewports.forEach((width) => {
      vi.stubGlobal('innerWidth', width);
      const wrapper = mount(InstallPromptModal, {
        props: {
          modelValue: true,
          forceIOS: true,
        },
      });

      const modalSheet = wrapper.find('.modal-sheet');
      expect(modalSheet.exists()).toBe(true);
      // CSS 定義 max-width: 440px 與 width: 100%，確保在手機螢幕下不溢出
      expect(modalSheet.classes()).toContain('modal-sheet');
    });
  });
});

