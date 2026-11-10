import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import QuizMode from '@/components/practice/QuizMode.vue'
import type { PracticeItem } from '@/types/practice'
import { speechService } from '@/services/speech'

describe('QuizMode.vue', () => {
  const mockItem: PracticeItem = {
    id: 'w_test_001',
    word: 'capacity',
    phonetic: '/kəˈpæsəti/',
    definition: '容量；能力',
    example: 'The hall was filled to capacity.',
    pos: ['n.'],
    level: 4,
    incorrectCount: 0,
    isLeech: false,
  }

  const explicitDistractors = ['放棄；遺棄', '精確的；準確的', '有效率的；能勝任的']

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders question word and exactly 4 options', () => {
    const wrapper = mount(QuizMode, {
      props: {
        item: mockItem,
        distractors: explicitDistractors,
      },
    })

    expect(wrapper.find('[data-testid="question-word"]').text()).toBe('capacity')
    const optionBtns = wrapper.findAll('[data-testid="quiz-option"]')
    expect(optionBtns.length).toBe(4)

    const texts = optionBtns.map((b) => b.text())
    expect(texts.some((t) => t.includes('容量；能力'))).toBe(true)
  })

  it('handles selecting correct option with feedback and event emit', async () => {
    const speakSpy = vi.spyOn(speechService, 'speak').mockResolvedValue(true)
    const wrapper = mount(QuizMode, {
      props: {
        item: mockItem,
        distractors: explicitDistractors,
      },
    })

    const optionBtns = wrapper.findAll('[data-testid="quiz-option"]')
    const correctBtn = optionBtns.find((b) => b.text().includes('容量；能力'))
    expect(correctBtn).toBeDefined()

    await correctBtn!.trigger('click')

    expect(correctBtn!.classes()).toContain('option-correct')
    expect(wrapper.emitted('answer')).toBeTruthy()
    expect(wrapper.emitted('answer')![0]).toEqual([true, '容量；能力'])
    expect(speakSpy).toHaveBeenCalledWith('capacity')

    const banner = wrapper.find('[data-testid="feedback-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('答對了')
  })

  it('handles selecting wrong option with feedback and reveals correct answer', async () => {
    const wrapper = mount(QuizMode, {
      props: {
        item: mockItem,
        distractors: explicitDistractors,
      },
    })

    const optionBtns = wrapper.findAll('[data-testid="quiz-option"]')
    const wrongBtn = optionBtns.find((b) => !b.text().includes('容量；能力'))
    expect(wrongBtn).toBeDefined()

    await wrongBtn!.trigger('click')

    expect(wrongBtn!.classes()).toContain('option-wrong')
    expect(wrapper.emitted('answer')).toBeTruthy()
    expect(wrapper.emitted('answer')![0][0]).toBe(false)

    const banner = wrapper.find('[data-testid="feedback-banner"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('答錯了')
    expect(banner.text()).toContain('容量；能力')
  })

  it('emits next event when clicking next button', async () => {
    const wrapper = mount(QuizMode, {
      props: {
        item: mockItem,
        distractors: explicitDistractors,
      },
    })

    const optionBtns = wrapper.findAll('[data-testid="quiz-option"]')
    await optionBtns[0].trigger('click')

    const nextBtn = wrapper.find('[data-testid="quiz-next-btn"]')
    expect(nextBtn.exists()).toBe(true)
    await nextBtn.trigger('click')

    expect(wrapper.emitted('next')).toBeTruthy()
  })
})
