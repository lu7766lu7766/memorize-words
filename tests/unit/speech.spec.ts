import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkVoiceAvailability,
  isSpeechSupported,
  selectVoice,
  speak,
  speakSlow,
  SpeechService,
  speechService,
  stop,
} from '../../src/services/speech';

// 模擬 MockSpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  public text: string;
  public rate: number = 1.0;
  public pitch: number = 1.0;
  public volume: number = 1.0;
  public lang: string = 'en-US';
  public voice: SpeechSynthesisVoice | null = null;
  public onstart: (() => void) | null = null;
  public onend: (() => void) | null = null;
  public onerror: ((event: unknown) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

// 模擬 MockSpeechSynthesis
class MockSpeechSynthesis {
  public voices: SpeechSynthesisVoice[] = [];
  public speaking: boolean = false;
  public lastUtterance: MockSpeechSynthesisUtterance | null = null;
  public cancelCalled: boolean = false;
  public speakThrows: boolean = false;
  public fireError: boolean = false;
  private listeners: Record<string, Array<() => void>> = {};

  public getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  public speak(utterance: MockSpeechSynthesisUtterance): void {
    if (this.speakThrows) {
      throw new Error('Native speechSynthesis speak failed');
    }

    this.speaking = true;
    this.lastUtterance = utterance;

    setTimeout(() => {
      utterance.onstart?.();
      setTimeout(() => {
        this.speaking = false;
        if (this.fireError) {
          utterance.onerror?.(new Event('error'));
        } else {
          utterance.onend?.();
        }
      }, 5);
    }, 5);
  }

  public cancel(): void {
    this.speaking = false;
    this.cancelCalled = true;
  }

  public addEventListener(type: string, listener: () => void): void {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  public removeEventListener(type: string, listener: () => void): void {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  public trigger(type: string): void {
    if (this.listeners[type]) {
      for (const listener of this.listeners[type]) {
        listener();
      }
    }
  }
}

describe('SpeechService Web Speech API 發音服務模組', () => {
  let mockSynth: MockSpeechSynthesis;
  const originalSpeechSynthesis = window.speechSynthesis;
  const originalUtterance = (window as unknown as { SpeechSynthesisUtterance?: unknown })
    .SpeechSynthesisUtterance;

  beforeEach(() => {
    mockSynth = new MockSpeechSynthesis();
    Object.defineProperty(window, 'speechSynthesis', {
      value: mockSynth,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: MockSpeechSynthesisUtterance,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      value: originalSpeechSynthesis,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      value: originalUtterance,
      writable: true,
      configurable: true,
    });
    vi.restoreAllMocks();
  });

  describe('1. 語音朗讀與參數傳遞', () => {
    it('正確傳遞單字、標準語速 1.0x、語言與口音設定', async () => {
      const usVoice = {
        name: 'Alex',
        lang: 'en-US',
        default: true,
        localService: true,
        voiceURI: 'alex-us',
      } as SpeechSynthesisVoice;

      mockSynth.voices = [usVoice];

      const success = await speechService.speak('sophisticated', {
        rate: 1.0,
        accent: 'en-US',
      });

      expect(success).toBe(true);
      expect(mockSynth.lastUtterance).not.toBeNull();
      expect(mockSynth.lastUtterance?.text).toBe('sophisticated');
      expect(mockSynth.lastUtterance?.rate).toBe(1.0);
      expect(mockSynth.lastUtterance?.lang).toBe('en-US');
      expect(mockSynth.lastUtterance?.voice).toEqual(usVoice);
    });

    it('speakSlow 應將語速自動設定為慢速 0.75x', async () => {
      const success = await speakSlow('extraordinary');

      expect(success).toBe(true);
      expect(mockSynth.lastUtterance?.text).toBe('extraordinary');
      expect(mockSynth.lastUtterance?.rate).toBe(0.75);
    });

    it('優先選擇英音 en-GB 語音', async () => {
      const usVoice = { name: 'Samantha', lang: 'en-US' } as SpeechSynthesisVoice;
      const gbVoice = { name: 'Daniel', lang: 'en-GB' } as SpeechSynthesisVoice;

      mockSynth.voices = [usVoice, gbVoice];

      const chosenVoice = selectVoice('en-GB');
      expect(chosenVoice?.name).toBe('Daniel');

      await speak('colour', { accent: 'en-GB' });
      expect(mockSynth.lastUtterance?.lang).toBe('en-GB');
      expect(mockSynth.lastUtterance?.voice).toEqual(gbVoice);
    });

    it('支援 SpeechService 實例的偏好設定 setAccent 與 setRate', async () => {
      const customService = new SpeechService();
      customService.setAccent('en-GB');
      customService.setRate(0.85);

      expect(customService.getAccent()).toBe('en-GB');
      expect(customService.getRate()).toBe(0.85);

      await customService.speak('vocabulary');
      expect(mockSynth.lastUtterance?.rate).toBe(0.85);
      expect(mockSynth.lastUtterance?.lang).toBe('en-GB');
    });

    it('朗讀空字串時直接回傳 false 且不觸發 speak', async () => {
      const res = await speak('   ');
      expect(res).toBe(false);
      expect(mockSynth.lastUtterance).toBeNull();
    });

    it('stop() 調用 window.speechSynthesis.cancel() 取消朗讀', () => {
      mockSynth.speaking = true;
      stop();
      expect(mockSynth.cancelCalled).toBe(true);
      expect(mockSynth.speaking).toBe(false);
    });
  });

  describe('2. 語音可用性偵測與非同步載入', () => {
    it('若已有語音套件，checkVoiceAvailability 立即回傳 true', async () => {
      mockSynth.voices = [{ name: 'Voice 1', lang: 'en-US' } as SpeechSynthesisVoice];
      const available = await checkVoiceAvailability();
      expect(available).toBe(true);
    });

    it('語音尚未載入時，能透過 voiceschanged 非同步事件解析', async () => {
      mockSynth.voices = []; // 初始無語音

      const checkPromise = checkVoiceAvailability(500);

      // 模擬非同步載入完成
      setTimeout(() => {
        mockSynth.voices = [{ name: 'Loaded Voice', lang: 'en-US' } as SpeechSynthesisVoice];
        mockSynth.trigger('voiceschanged');
      }, 50);

      const available = await checkPromise;
      expect(available).toBe(true);
    });

    it('若逾時仍無語音套件，安全回傳 false', async () => {
      mockSynth.voices = [];
      const available = await checkVoiceAvailability(50);
      expect(available).toBe(false);
    });
  });

  describe('3. 無語音支援與錯誤優雅降級', () => {
    it('在無 speechSynthesis 環境中安全降級，偵測函式回傳 false', async () => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isSpeechSupported()).toBe(false);

      const available = await checkVoiceAvailability();
      expect(available).toBe(false);

      // 朗讀安全回傳 false，不拋出例外
      const res = await speak('hello');
      expect(res).toBe(false);

      // stop 亦不崩潰
      expect(() => stop()).not.toThrow();
    });

    it('在無 SpeechSynthesisUtterance 建構子環境中安全降級', () => {
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      expect(isSpeechSupported()).toBe(false);
    });

    it('原生 speak 拋出異常時優雅捕獲，不崩潰並回傳 false', async () => {
      mockSynth.speakThrows = true;
      const onErrorSpy = vi.fn();

      const success = await speak('error-test', { onError: onErrorSpy });
      expect(success).toBe(false);
      expect(onErrorSpy).toHaveBeenCalled();
    });

    it('原生 utterance onerror 事件觸發時回傳 false 並回呼 onError', async () => {
      mockSynth.fireError = true;
      const onErrorSpy = vi.fn();

      const success = await speak('failure', { onError: onErrorSpy });
      expect(success).toBe(false);
      expect(onErrorSpy).toHaveBeenCalled();
    });
  });
});

