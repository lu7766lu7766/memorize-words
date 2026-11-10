import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import NotebookView from '../../src/views/NotebookView.vue';
import type { MistakeItem } from '../../src/components/notebook/MistakeCard.vue';

// Mock speech service
vi.mock('../../src/services/speech', () => ({
  speak: vi.fn().mockResolvedValue(true),
}));

describe('NotebookView.vue', () => {
  const sampleItems: MistakeItem[] = [
    {
      id: 'w_apple',
      word: 'apple',
      phonetic: '/ˈæpl/',
      definition: '蘋果',
      incorrectCount: 2,
      isLeech: false,
      category: ['gsat'],
      level: 1,
      lastWrongAt: '2026-05-01T10:00:00Z',
    },
    {
      id: 'w_banana',
      word: 'banana',
      phonetic: '/bəˈnænə/',
      definition: '香蕉',
      incorrectCount: 5,
      isLeech: true,
      category: ['gsat'],
      level: 2,
      lastWrongAt: '2026-05-03T10:00:00Z',
    },
    {
      id: 'w_cherry',
      word: 'cherry',
      phonetic: '/ˈtʃeri/',
      definition: '櫻桃',
      incorrectCount: 1,
      isLeech: false,
      category: ['toeic'],
      level: 1,
      toeicTier: 'entry',
      lastWrongAt: '2026-05-02T10:00:00Z',
    },
    {
      id: 'w_date',
      word: 'date',
      phonetic: '/deɪt/',
      definition: '約會；棗子',
      incorrectCount: 4,
      isLeech: true,
      category: ['toeic', 'gsat'],
      level: 3,
      toeicTier: 'intermediate',
      lastWrongAt: '2026-05-04T10:00:00Z',
    },
  ];

  function getRenderedWords(wrapper: any): string[] {
    return wrapper.findAll('[data-testid="word-title"]').map((w: any) => w.text());
  }

  describe('統計看板與快速切換', () => {
    it('correctly calculates total mistakes, leech count, and overcome count', () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
          initialOvercomeCount: 3,
        },
      });

      expect(wrapper.find('[data-testid="stat-total-value"]').text()).toBe('4');
      // banana (5) & date (4) are leeches
      expect(wrapper.find('[data-testid="stat-leech-value"]').text()).toBe('2');
      expect(wrapper.find('[data-testid="stat-overcome-value"]').text()).toBe('3');
    });

    it('toggles between All Mistakes and Only Leech using tab buttons', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      expect(getRenderedWords(wrapper).length).toBe(4);

      // Switch to Leech tab
      const leechTab = wrapper.find('[data-testid="tab-leech"]');
      await leechTab.trigger('click');

      const leechWords = getRenderedWords(wrapper);
      expect(leechWords.length).toBe(2);
      expect(leechWords).toEqual(['banana', 'date']);

      // Switch back to All tab
      const allTab = wrapper.find('[data-testid="tab-all"]');
      await allTab.trigger('click');

      expect(getRenderedWords(wrapper).length).toBe(4);
    });
  });

  describe('列表排序功能 (Sort by mistakes-desc, alphabetical, recent)', () => {
    it('defaults to sorting by mistake count descending', () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      // banana (5) > date (4) > apple (2) > cherry (1)
      expect(getRenderedWords(wrapper)).toEqual(['banana', 'date', 'apple', 'cherry']);
    });

    it('sorts alphabetically when alphabetical option is selected', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const sortSelect = wrapper.find('[data-testid="sort-select"]');
      await sortSelect.setValue('alphabetical');

      expect(getRenderedWords(wrapper)).toEqual(['apple', 'banana', 'cherry', 'date']);
    });

    it('sorts by most recent wrong time when recent option is selected', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const sortSelect = wrapper.find('[data-testid="sort-select"]');
      await sortSelect.setValue('recent');

      // May 4 (date) > May 3 (banana) > May 2 (cherry) > May 1 (apple)
      expect(getRenderedWords(wrapper)).toEqual(['date', 'banana', 'cherry', 'apple']);
    });
  });

  describe('關鍵字搜尋與詞庫過濾 (Keyword & Category Filter)', () => {
    it('filters cards in real-time by English word keyword', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const searchInput = wrapper.find('[data-testid="search-input"]');
      await searchInput.setValue('cher');

      expect(getRenderedWords(wrapper)).toEqual(['cherry']);
    });

    it('filters cards by Chinese definition keyword', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const searchInput = wrapper.find('[data-testid="search-input"]');
      await searchInput.setValue('香蕉');

      expect(getRenderedWords(wrapper)).toEqual(['banana']);
    });

    it('renders empty state when search finds no matches', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const searchInput = wrapper.find('[data-testid="search-input"]');
      await searchInput.setValue('nonexistent_word_xyz');

      expect(wrapper.find('[data-testid="empty-state"]').exists()).toBe(true);
      expect(getRenderedWords(wrapper).length).toBe(0);
    });

    it('filters cards by GSAT category', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const categorySelect = wrapper.find('[data-testid="category-select"]');
      await categorySelect.setValue('gsat');

      // apple, banana, date
      expect(getRenderedWords(wrapper)).toEqual(['banana', 'date', 'apple']);
    });

    it('filters cards by specific GSAT Level (e.g. gsat-1)', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const categorySelect = wrapper.find('[data-testid="category-select"]');
      await categorySelect.setValue('gsat-1');

      expect(getRenderedWords(wrapper)).toEqual(['apple']);
    });

    it('filters cards by TOEIC category and tier', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const categorySelect = wrapper.find('[data-testid="category-select"]');
      await categorySelect.setValue('toeic');

      // date (4) > cherry (1)
      expect(getRenderedWords(wrapper)).toEqual(['date', 'cherry']);

      await categorySelect.setValue('toeic-intermediate');
      expect(getRenderedWords(wrapper)).toEqual(['date']);
    });
  });

  describe('「只練錯題」一鍵開始與練習跳轉 (Start Practice)', () => {
    it('aggregates currently filtered words and emits start-practice event', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      const startPracticeBtn = wrapper.find('[data-testid="start-practice-btn"]');
      expect(startPracticeBtn.exists()).toBe(true);
      expect(startPracticeBtn.text()).toContain('只練錯題 (4)');

      await startPracticeBtn.trigger('click');

      expect(wrapper.emitted('start-practice')).toBeTruthy();
      const emittedPayload = wrapper.emitted('start-practice')![0][0] as MistakeItem[];
      expect(emittedPayload.length).toBe(4);
      expect(emittedPayload.map((item) => item.word)).toEqual([
        'banana',
        'date',
        'apple',
        'cherry',
      ]);
    });

    it('starts practice with only filtered items and allows selecting mode in modal', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
        },
      });

      // Filter only leeches
      await wrapper.find('[data-testid="tab-leech"]').trigger('click');

      const startBtn = wrapper.find('[data-testid="start-practice-btn"]');
      expect(startBtn.text()).toContain('只練錯題 (2)');
      await startBtn.trigger('click');

      // Practice mode selection modal appears
      expect(wrapper.find('[data-testid="practice-modal"]').exists()).toBe(true);

      // Select quiz mode
      const quizBtn = wrapper.find('[data-testid="mode-quiz-btn"]');
      await quizBtn.trigger('click');

      const emittedEvents = wrapper.emitted('start-practice')!;
      // Second emit has mode argument
      const lastCall = emittedEvents[emittedEvents.length - 1];
      expect((lastCall[0] as MistakeItem[]).map((i) => i.word)).toEqual(['banana', 'date']);
      expect(lastCall[1]).toBe('quiz');
    });
  });

  describe('已克服與錯題移除功能', () => {
    it('removes item from list, updates stats, and increments overcome count', async () => {
      const wrapper = mount(NotebookView, {
        props: {
          initialItems: sampleItems,
          initialOvercomeCount: 0,
        },
      });

      expect(wrapper.find('[data-testid="stat-total-value"]').text()).toBe('4');
      expect(wrapper.find('[data-testid="stat-overcome-value"]').text()).toBe('0');

      // Find first card's remove button
      const firstRemoveBtn = wrapper.findAll('[data-testid="remove-btn"]')[0];
      await firstRemoveBtn.trigger('click');

      // Banana was removed
      expect(wrapper.find('[data-testid="stat-total-value"]').text()).toBe('3');
      expect(wrapper.find('[data-testid="stat-overcome-value"]').text()).toBe('1');
      expect(getRenderedWords(wrapper)).toEqual(['date', 'apple', 'cherry']);
      expect(wrapper.emitted('remove-mistake')).toBeTruthy();
    });
  });
});
