/**
 * Web Speech API 發音服務模組
 * 提供單字朗讀、語速調整、英美音偏好設定與離線/不支援環境優雅降級
 */

export type VoiceAccent = 'en-US' | 'en-GB';

export interface SpeakOptions {
  rate?: number; // 預設 1.0，慢速 0.75
  accent?: VoiceAccent; // 偏好英音或美音
  lang?: string;
  pitch?: number;
  volume?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * 檢查當前瀏覽器環境是否支援 Web Speech API
 */
export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const hasSynth =
    'speechSynthesis' in window &&
    Boolean(window.speechSynthesis) &&
    typeof window.speechSynthesis.speak === 'function';
  const hasUtterance =
    typeof (window as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance !== 'undefined';
  return hasSynth && hasUtterance;
}

/**
 * 檢查語音套件可用性（包含非同步載入 voiceschanged 處理）
 */
export function checkVoiceAvailability(timeoutMs: number = 1000): Promise<boolean> {
  if (!isSpeechSupported()) {
    return Promise.resolve(false);
  }

  const synth = window.speechSynthesis;
  const existingVoices = synth.getVoices();
  if (existingVoices && existingVoices.length > 0) {
    return Promise.resolve(true);
  }

  return new Promise<boolean>((resolve) => {
    let finished = false;

    const cleanup = () => {
      synth.removeEventListener('voiceschanged', handleVoicesChanged);
      if (timer) {
        clearTimeout(timer);
      }
    };

    const done = (result: boolean) => {
      if (!finished) {
        finished = true;
        cleanup();
        resolve(result);
      }
    };

    const handleVoicesChanged = () => {
      const voices = synth.getVoices();
      done(voices && voices.length > 0);
    };

    synth.addEventListener('voiceschanged', handleVoicesChanged);

    const timer = setTimeout(() => {
      const voices = synth.getVoices();
      done(voices && voices.length > 0);
    }, timeoutMs);
  });
}

/**
 * 取消當前所有朗讀
 */
export function stop(): void {
  if (!isSpeechSupported()) {
    return;
  }
  try {
    window.speechSynthesis.cancel();
  } catch {
    // 優雅忽略錯誤
  }
}

/**
 * 依據偏好口音挑選最佳語音物件
 */
export function selectVoice(accent: VoiceAccent = 'en-US'): SpeechSynthesisVoice | null {
  if (!isSpeechSupported()) {
    return null;
  }
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) {
    return null;
  }

  const targetLang = accent.toLowerCase().replace('_', '-');

  // 1. 完全比對 (例如 en-US, en-GB)
  const exact = voices.find((v) => v.lang.toLowerCase().replace('_', '-') === targetLang);
  if (exact) {
    return exact;
  }

  // 2. 比對語言前綴 (例如 en)
  const prefix = targetLang.slice(0, 2);
  const matchedPrefix = voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix));
  if (matchedPrefix) {
    return matchedPrefix;
  }

  // 3. 回退第一個可用語音
  return voices[0] || null;
}

export class SpeechService {
  private defaultAccent: VoiceAccent = 'en-US';
  private defaultRate: number = 1.0;

  public isSupported(): boolean {
    return isSpeechSupported();
  }

  public async checkAvailability(timeoutMs?: number): Promise<boolean> {
    return checkVoiceAvailability(timeoutMs);
  }

  public setAccent(accent: VoiceAccent): void {
    this.defaultAccent = accent;
  }

  public getAccent(): VoiceAccent {
    return this.defaultAccent;
  }

  public setRate(rate: number): void {
    this.defaultRate = rate;
  }

  public getRate(): number {
    return this.defaultRate;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!isSpeechSupported()) {
      return [];
    }
    return window.speechSynthesis.getVoices() || [];
  }

  public stop(): void {
    stop();
  }

  public speakSlow(text: string, options?: Omit<SpeakOptions, 'rate'>): Promise<boolean> {
    return this.speak(text, { ...options, rate: 0.75 });
  }

  public speak(text: string, options?: SpeakOptions): Promise<boolean> {
    if (!this.isSupported() || !text || text.trim() === '') {
      return Promise.resolve(false);
    }

    this.stop();

    const accent = options?.accent || this.defaultAccent;
    const rate = options?.rate ?? this.defaultRate;
    const pitch = options?.pitch ?? 1.0;
    const volume = options?.volume ?? 1.0;

    return new Promise<boolean>((resolve) => {
      try {
        const UtteranceConstructor = window.SpeechSynthesisUtterance;
        const utterance = new UtteranceConstructor(text);

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        const voice = selectVoice(accent);
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = options?.lang || accent;
        }

        utterance.onstart = () => {
          options?.onStart?.();
        };

        utterance.onend = () => {
          options?.onEnd?.();
          resolve(true);
        };

        utterance.onerror = (event) => {
          options?.onError?.(event);
          resolve(false);
        };

        window.speechSynthesis.speak(utterance);
      } catch (error) {
        options?.onError?.(error);
        resolve(false);
      }
    });
  }
}

export const speechService = new SpeechService();

export function speak(text: string, options?: SpeakOptions): Promise<boolean> {
  return speechService.speak(text, options);
}

export function speakSlow(text: string, options?: Omit<SpeakOptions, 'rate'>): Promise<boolean> {
  return speechService.speakSlow(text, options);
}

