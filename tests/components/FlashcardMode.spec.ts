import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import FlashcardMode from '@/components/practice/FlashcardMode.vue'
import type { PracticeItem } from '@/types/practice'
import { speechService } from '@/services/speech'

describe('FlashcardMode.vue', () => {
  const mockItem: PracticeItem = {
    id: 'w_test_001',
    word: 'abandon',
    phonetic: '/əˈbændən/',
    definition: '放棄；遺棄',
    example: 'They had to abandon the plan.',
    exampleTranslation: '他們不得不放棄這項計畫。',
    pos: ['v.'],
    level: 3,
    incorrectCount: 0,
    isLeech: false,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders front face with word and phonetic by default', () => {
    const wrapper = mount(FlashcardMode, {
      props: { item: mockItem },
    })

    expect(wrapper.find('[data-testid="word-text"]').text()).toBe('abandon')
    expect(wrapper.find('[data-testid="phonetic-text"]').text()).toBe('/əˈbændən/')
    expect(wrapper.find('[data-testid="flashcard"]').classes()).not.toContain('is-flipped')
  })

  it('flips the card upon clicking and emits flip event', async () => {
    const wrapper = mount(FlashcardMode, {
      props: { item: mockItem },
    })

    const card = wrapper.find('[data-testid="flashcard"]')
    await card.trigger('click')

    expect(card.classes()).toContain('is-flipped')
    expect(wrapper.emitted('flip')).toBeTruthy()
    expect(wrapper.emitted('flip')![0]).toEqual([true])

    // Flip back
    await card.trigger('click')
    expect(card.classes()).not.toContain('is-flipped')
    expect(wrapper.emitted('flip')![1]).toEqual([false])
  })

  it('triggers speechService.speak when clicking play audio button', async () => {
    const speakSpy = vi.spyOn(speechService, 'speak').mockResolvedValue(true)
    const wrapper = mount(FlashcardMode, {
      props: { item: mockItem },
    })

    const audioBtn = wrapper.find('[data-testid="play-audio-btn"]')
    await audioBtn.trigger('click')

    expect(speakSpy).toHaveBeenCalledWith('abandon')
  })

  it('emits rate event with again rating and isCorrect=false on again button click', async () => {
    const wrapper = mount(FlashcardMode, {
      props: { item: mockItem },
    })

    const againBtn = wrapper.find('[data-testid="rate-again-btn"]')
    await againBtn.trigger('click')

    expect(wrapper.emitted('rate')).toBeTruthy()
    expect(wrapper.emitted('rate')![0]).toEqual(['again', false])
  })

  it('emits rate event with hard/good/easy rating on corresponding button clicks', async () => {
    const wrapper = mount(FlashcardMode, {
      props: { item: mockItem },
    })

    await wrapper.find('[data-testid="rate-hard-btn"]').trigger('click')
    expect(wrapper.emitted('rate')![0]).toEqual(['hard', true])

    await wrapper.find('[data-testid="rate-good-btn"]').trigger('click')
    expect(wrapper.emitted('rate')![1]).toEqual(['good', true])

    await wrapper.find('[data-testid="rate-easy-btn"]').trigger('click')
    expect(wrapper.emitted('rate')![2]).toEqual(['easy', true])
  })
})
