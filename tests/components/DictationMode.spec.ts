import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DictationMode from '@/components/practice/DictationMode.vue'
import type { PracticeItem } from '@/types/practice'
import * as speechModule from '@/services/speech'

describe('DictationMode.vue', () => {
  const mockItem: PracticeItem = {
    id: 'w_test_001',
    word: 'efficient',
    phonetic: '/ɪˈfɪʃnt/',
    definition: '有效率的；能勝任的',
    example: 'She is an efficient secretary.',
    pos: ['adj.'],
    level: 4,
    incorrectCount: 0,
    isLeech: false,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('triggers speechService on play normal and play slow buttons', async () => {
    const speakSpy = vi.spyOn(speechModule.speechService, 'speak').mockResolvedValue(true)
    const speakSlowSpy = vi.spyOn(speechModule.speechService, 'speakSlow').mockResolvedValue(true)

    const wrapper = mount(DictationMode, {
      props: {
        item: mockItem,
        autoPlay: false,
      },
    })

    const normalBtn = wrapper.find('[data-testid="play-normal-btn"]')
    await normalBtn.trigger('click')
    expect(speakSpy).toHaveBeenCalledWith('efficient', { rate: 1.0 })

    const slowBtn = wrapper.find('[data-testid="play-slow-btn"]')
    await slowBtn.trigger('click')
    expect(speakSlowSpy).toHaveBeenCalledWith('efficient')
  })

  it('validates correct dictation answer and reveals definition and phonetic', async () => {
    vi.spyOn(speechModule.speechService, 'speak').mockResolvedValue(true)

    const wrapper = mount(DictationMode, {
      props: {
        item: mockItem,
        autoPlay: false,
      },
    })

    const input = wrapper.find('[data-testid="dictation-input"]')
    await input.setValue('efficient')

    const form = wrapper.find('.input-form')
    await form.trigger('submit.prevent')

    expect(input.classes()).toContain('input-correct')
    expect(wrapper.emitted('answer')).toBeTruthy()
    expect(wrapper.emitted('answer')![0]).toEqual([true, 'efficient'])

    const fb = wrapper.find('[data-testid="dictation-feedback"]')
    expect(fb.exists()).toBe(true)
    expect(fb.find('[data-testid="revealed-word"]').text()).toBe('efficient')
    expect(fb.text()).toContain('有效率的；能勝任的')
  })

  it('validates incorrect dictation answer and emits answer with false', async () => {
    vi.spyOn(speechModule.speechService, 'speak').mockResolvedValue(true)

    const wrapper = mount(DictationMode, {
      props: {
        item: mockItem,
        autoPlay: false,
      },
    })

    const input = wrapper.find('[data-testid="dictation-input"]')
    await input.setValue('eficient')

    const form = wrapper.find('.input-form')
    await form.trigger('submit.prevent')

    expect(input.classes()).toContain('input-wrong')
    expect(wrapper.emitted('answer')).toBeTruthy()
    expect(wrapper.emitted('answer')![0]).toEqual([false, 'eficient'])
  })

  it('shows voice warning fallback when speech is not supported', async () => {
    vi.spyOn(speechModule, 'isSpeechSupported').mockReturnValue(false)

    const wrapper = mount(DictationMode, {
      props: {
        item: mockItem,
        autoPlay: false,
      },
    })

    // Wait for async voice check
    await wrapper.vm.$nextTick()

    const warning = wrapper.find('[data-testid="voice-warning"]')
    expect(warning.exists()).toBe(true)
    expect(warning.text()).toContain('未偵測到發音語音支援')
  })

  it('emits next event on next button click', async () => {
    vi.spyOn(speechModule.speechService, 'speak').mockResolvedValue(true)

    const wrapper = mount(DictationMode, {
      props: {
        item: mockItem,
        autoPlay: false,
      },
    })

    await wrapper.find('[data-testid="dictation-input"]').setValue('efficient')
    await wrapper.find('.input-form').trigger('submit.prevent')

    const nextBtn = wrapper.find('[data-testid="dictation-next-btn"]')
    await nextBtn.trigger('click')

    expect(wrapper.emitted('next')).toBeTruthy()
  })
})
