import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PracticeContainer from '@/components/practice/PracticeContainer.vue'
import { PracticeSession } from '@/services/practiceEngine'
import type { PracticeItem } from '@/types/practice'

describe('PracticeContainer.vue', () => {
  const sampleItems: PracticeItem[] = [
    {
      id: 'w_001',
      word: 'abandon',
      phonetic: '/əˈbændən/',
      definition: '放棄；遺棄',
      pos: ['v.'],
      level: 3,
      incorrectCount: 0,
      isLeech: false,
    },
    {
      id: 'w_002',
      word: 'capacity',
      phonetic: '/kəˈpæsəti/',
      definition: '容量；能力',
      pos: ['n.'],
      level: 4,
      incorrectCount: 0,
      isLeech: false,
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders progress bar, question counter and current mode component', () => {
    const session = new PracticeSession(sampleItems, { mode: 'flashcard' })
    const wrapper = mount(PracticeContainer, {
      props: { session },
    })

    expect(wrapper.find('[data-testid="question-counter"]').text()).toContain('第 1 題 / 共 2 題')
    expect(wrapper.find('[data-testid="mode-badge"]').text()).toBe('翻卡模式')
    expect(wrapper.find('[data-testid="flashcard"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="completion-panel"]').exists()).toBe(false)
  })

  it('advances question and updates progress bar upon answering', async () => {
    const session = new PracticeSession(sampleItems, { mode: 'flashcard' })
    const wrapper = mount(PracticeContainer, {
      props: { session },
    })

    // Rate Good
    const goodBtn = wrapper.find('[data-testid="rate-good-btn"]')
    await goodBtn.trigger('click')

    // Advanced to question 2
    expect(wrapper.find('[data-testid="question-counter"]').text()).toContain('第 2 題 / 共 2 題')
    expect(wrapper.find('[data-testid="word-text"]').text()).toBe('capacity')
  })

  it('switches modes via mode switcher buttons', async () => {
    const session = new PracticeSession(sampleItems, { mode: 'flashcard' })
    const wrapper = mount(PracticeContainer, {
      props: { session },
    })

    const buttons = wrapper.findAll('.mode-tab-btn')
    // Click '選擇' (quiz)
    const quizTab = buttons.find((b) => b.text().includes('選擇'))
    await quizTab!.trigger('click')

    expect(wrapper.find('[data-testid="mode-badge"]').text()).toBe('四選一測驗')
    expect(wrapper.find('[data-testid="options-grid"]').exists()).toBe(true)

    // Click '拼字' (spelling)
    const spellingTab = buttons.find((b) => b.text().includes('拼字'))
    await spellingTab!.trigger('click')

    expect(wrapper.find('[data-testid="mode-badge"]').text()).toBe('拼字測驗')
    expect(wrapper.find('[data-testid="spelling-input"]').exists()).toBe(true)
  })

  it('displays completion summary panel when all questions are answered', async () => {
    const session = new PracticeSession([sampleItems[0]], { mode: 'flashcard' })
    const wrapper = mount(PracticeContainer, {
      props: { session },
    })

    // Rate Good to finish
    await wrapper.find('[data-testid="rate-good-btn"]').trigger('click')

    const completion = wrapper.find('[data-testid="completion-panel"]')
    expect(completion.exists()).toBe(true)
    expect(completion.find('.completion-title').text()).toBe('練習完成！')
    expect(wrapper.find('[data-testid="stat-accuracy"]').text()).toBe('100%')
    expect(wrapper.find('[data-testid="perfect-hint"]').exists()).toBe(true)
    expect(wrapper.emitted('complete')).toBeTruthy()
  })

  it('shows mistake summary and handles retry mistakes button when there are incorrect items', async () => {
    const session = new PracticeSession([sampleItems[0]], { mode: 'flashcard' })
    const wrapper = mount(PracticeContainer, {
      props: { session },
    })

    // Answer again (wrong) on question 1: item is re-inserted into main queue
    await wrapper.find('[data-testid="rate-again-btn"]').trigger('click')

    // Answer the re-inserted item in main queue
    await wrapper.find('[data-testid="rate-good-btn"]').trigger('click')

    // Main queue finished with mistakes -> enters cleared round
    expect(session.isClearedRound).toBe(true)

    // Answer correctly in cleared round to completely finish session
    await wrapper.find('[data-testid="rate-good-btn"]').trigger('click')
    expect(session.isCompleted).toBe(true)

    const completion = wrapper.find('[data-testid="completion-panel"]')
    expect(completion.exists()).toBe(true)

    const mistakesSummary = wrapper.find('[data-testid="mistakes-summary"]')
    expect(mistakesSummary.exists()).toBe(true)
    expect(mistakesSummary.text()).toContain('abandon')

    const retryBtn = wrapper.find('[data-testid="retry-mistakes-btn"]')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')

    expect(wrapper.emitted('retry-mistakes')).toBeTruthy()
    expect(wrapper.emitted('retry-mistakes')![0][0]).toEqual(session.incorrectItems)

    const exitBtn = wrapper.find('[data-testid="exit-btn"]')
    await exitBtn.trigger('click')
    expect(wrapper.emitted('exit')).toBeTruthy()
  })
})

describe('PracticeView.vue', () => {
  it('renders PracticeView with default container and handles exit event', async () => {
    const { default: PracticeView } = await import('@/views/PracticeView.vue')
    const wrapper = mount(PracticeView)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.view-title').text()).toBe('單字練習')
    expect(wrapper.find('[data-testid="progress-section"]').exists()).toBe(true)

    const backBtn = wrapper.find('[data-testid="back-btn"]')
    await backBtn.trigger('click')

    expect(wrapper.emitted('exit')).toBeTruthy()
  })
})
