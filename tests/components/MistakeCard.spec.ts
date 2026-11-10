import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MistakeCard, { type MistakeItem } from '../../src/components/notebook/MistakeCard.vue';

// Mock speech service
vi.mock('../../src/services/speech', () => ({
  speak: vi.fn().mockResolvedValue(true),
}));

describe('MistakeCard.vue', () => {
  const sampleLeechItem: MistakeItem = {
    id: 'w_persist_001',
    word: 'persistent',
    phonetic: '/pərˈsɪstənt/',
    pos: ['adj.'],
    definition: '堅持不懈的；執著的',
    examples: [
      {
        en: 'She was persistent and finally reached her goal.',
        zh: '她堅持不懈，終於達成了目標。',
      },
    ],
    incorrectCount: 3,
    isLeech: true,
    category: ['gsat', 'toeic'],
    level: 4,
    toeicTier: 'intermediate',
  };

  const sampleNormalItem: MistakeItem = {
    id: 'w_simple_002',
    word: 'simple',
    phonetic: '/ˈsɪmpl/',
    pos: ['adj.'],
    definition: '簡單的；純樸的',
    examples: [
      {
        en: 'The solution is quite simple.',
        zh: '這個解決辦法相當簡單。',
      },
    ],
    incorrectCount: 1,
    isLeech: false,
    category: ['gsat'],
    level: 1,
  };

  describe('頑固字徽章與錯誤計數渲染', () => {
    it('renders leech badge and correct mistake count when incorrectCount >= 3', () => {
      const wrapper = mount(MistakeCard, {
        props: {
          item: sampleLeechItem,
        },
      });

      const leechBadge = wrapper.find('[data-testid="leech-badge"]');
      expect(leechBadge.exists()).toBe(true);
      expect(leechBadge.text()).toContain('頑固字');

      const mistakeCountBadge = wrapper.find('[data-testid="mistake-count"]');
      expect(mistakeCountBadge.exists()).toBe(true);
      expect(mistakeCountBadge.text()).toContain('3');
    });

    it('does NOT render leech badge when incorrectCount < 3 and isLeech is false', () => {
      const wrapper = mount(MistakeCard, {
        props: {
          item: sampleNormalItem,
        },
      });

      const leechBadge = wrapper.find('[data-testid="leech-badge"]');
      expect(leechBadge.exists()).toBe(false);

      const mistakeCountBadge = wrapper.find('[data-testid="mistake-count"]');
      expect(mistakeCountBadge.exists()).toBe(true);
      expect(mistakeCountBadge.text()).toContain('1');
    });

    it('renders basic word information (word, phonetic, pos, definition)', () => {
      const wrapper = mount(MistakeCard, {
        props: {
          item: sampleLeechItem,
        },
      });

      expect(wrapper.find('[data-testid="word-title"]').text()).toBe('persistent');
      expect(wrapper.find('[data-testid="word-phonetic"]').text()).toContain('/pərˈsɪstənt/');
      expect(wrapper.find('[data-testid="word-pos"]').text()).toBe('adj.');
      expect(wrapper.find('[data-testid="word-definition"]').text()).toBe('堅持不懈的；執著的');
    });
  });

  describe('發音按鈕互動', () => {
    it('triggers speech and emits speak event on click', async () => {
      const wrapper = mount(MistakeCard, {
        props: {
          item: sampleLeechItem,
        },
      });

      const speakBtn = wrapper.find('[data-testid="speak-btn"]');
      expect(speakBtn.exists()).toBe(true);

      await speakBtn.trigger('click');

      expect(wrapper.emitted('speak')).toBeTruthy();
      expect(wrapper.emitted('speak')![0]).toEqual(['persistent']);
    });
  });

  describe('展開與折疊例句互動', () => {
    it('toggles example section expansion upon button click', async () => {
      const wrapper = mount(MistakeCard, {
        props: {
          item: sampleLeechItem,
        },
      });

      // Initially closed
      expect(wrapper.find('[data-testid="examples-section"]').exists()).toBe(false);

      const toggleBtn = wrapper.find('[data-testid="toggle-examples-btn"]');
      expect(toggleBtn.text()).toContain('查看例句');

      // Click to expand
      await toggleBtn.trigger('click');
      expect(wrapper.find('[data-testid="examples-section"]').exists()).toBe(true);
      expect(wrapper.find('.example-en').text()).toContain('She was persistent');
      expect(wrapper.find('.example-zh').text()).toContain('她堅持不懈');
      expect(toggleBtn.text()).toContain('收合例句');
      expect(wrapper.emitted('toggleExpand')![0]).toEqual([true]);

      // Click again to collapse
      await toggleBtn.trigger('click');
      expect(wrapper.find('[data-testid="examples-section"]').exists()).toBe(false);
      expect(toggleBtn.text()).toContain('查看例句');
      expect(wrapper.emitted('toggleExpand')![1]).toEqual([false]);
    });
  });

  describe('移除/已克服按鈕互動', () => {
    it('emits remove event with item when clicked', async () => {
      const wrapper = mount(MistakeCard, {
        props: {
          item: sampleLeechItem,
        },
      });

      const removeBtn = wrapper.find('[data-testid="remove-btn"]');
      expect(removeBtn.exists()).toBe(true);

      await removeBtn.trigger('click');

      expect(wrapper.emitted('remove')).toBeTruthy();
      expect(wrapper.emitted('remove')![0]).toEqual([sampleLeechItem]);
    });
  });
});
