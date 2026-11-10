import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SpellingMode from '@/components/practice/SpellingMode.vue'
import type { PracticeItem } from '@/types/practice'
import { speechService } from '@/services/speech'

describe('SpellingMode.vue', () => {
  const mockItem: PracticeItem = {
    id: 'w_test_001',
    word: 'abandon',
    phonetic: '/əˈbændən/',
    definition: '放棄；遺棄',
    example: 'Never abandon your dreams.',
    pos: ['v.'],
    level: 3,
    incorrectCount: 0,
    isLeech: false,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders definition and pos badges', () => {
    const wrapper = mount(SpellingMode, {
      props: { item: mockItem },
    })

    expect(wrapper.find('[data-testid="spelling-definition"]').text()).toBe('放棄；遺棄')
    expect(wrapper.find('.pos-badge').text()).toBe('v.')
    expect(wrapper.find('[data-testid="hint-display"]').exists()).toBe(false)
  })

  it('toggles hint display with initial letter and blank pattern', async () => {
    const wrapper = mount(SpellingMode, {
      props: { item: mockItem },
    })

    const hintBtn = wrapper.find('[data-testid="hint-toggle-btn"]')
    await hintBtn.trigger('click')

    const hintDisplay = wrapper.find('[data-testid="hint-display"]')
    expect(hintDisplay.exists()).toBe(true)
    expect(hintDisplay.text()).toContain('a')
    expect(hintDisplay.text()).toContain('共 7 個字母')
  })

  it('validates correct answer regardless of casing and whitespace', async () => {
    const speakSpy = vi.spyOn(speechService, 'speak').mockResolvedValue(true)
    const wrapper = mount(SpellingMode, {
      props: { item: mockItem },
    })

    const input = wrapper.find('[data-testid="spelling-input"]')
    await input.setValue('  AbAnDoN  ')

    const form = wrapper.find('.input-form')
    await form.trigger('submit.prevent')

    expect(input.classes()).toContain('input-correct')
    expect(wrapper.emitted('answer')).toBeTruthy()
    expect(wrapper.emitted('answer')![0]).toEqual([true, 'AbAnDoN'])
    expect(speakSpy).toHaveBeenCalledWith('abandon')

    const fb = wrapper.find('[data-testid="spelling-feedback"]')
    expect(fb.exists()).toBe(true)
    expect(fb.text()).toContain('拼寫正確')
  })

  it('reveals correct answer when spelling is incorrect', async () => {
    const speakSpy = vi.spyOn(speechService, 'speak').mockResolvedValue(true)
    const wrapper = mount(SpellingMode, {
      props: { item: mockItem },
    })

    const input = wrapper.find('[data-testid="spelling-input"]')
    await input.setValue('abandn')

    const form = wrapper.find('.input-form')
    await form.trigger('submit.prevent')

    expect(input.classes()).toContain('input-wrong')
    expect(wrapper.emitted('answer')).toBeTruthy()
    expect(wrapper.emitted('answer')![0]).toEqual([false, 'abandn'])
    expect(speakSpy).toHaveBeenCalledWith('abandon')

    const fb = wrapper.find('[data-testid="spelling-feedback"]')
    expect(fb.exists()).toBe(true)
    expect(fb.find('[data-testid="correct-word-reveal"]').text()).toBe('abandon')
  })

  it('emits next event on next button click', async () => {
    const wrapper = mount(SpellingMode, {
      props: { item: mockItem },
    })

    await wrapper.find('[data-testid="spelling-input"]').setValue('abandon')
    await wrapper.find('.input-form').trigger('submit.prevent')

    const nextBtn = wrapper.find('[data-testid="spelling-next-btn"]')
    await nextBtn.trigger('click')

    expect(wrapper.emitted('next')).toBeTruthy()
  })
})
