import type {
  PracticeAnswerResult,
  PracticeItem,
  PracticeMode,
  PracticeRating,
  PracticeStats,
} from '../types/practice';

export interface PracticeSessionOptions {
  mode?: PracticeMode;
  autoAdvance?: boolean;
  fixedOffset?: number;
  offsetGenerator?: (min: number, max: number) => number;
}

/**
 * 練習核心引擎 Session
 * 管理當前卡片隊列、答錯動態插回 3~5 題、錯題清空輪與統計數據計算
 */
export class PracticeSession {
  public mode: PracticeMode;
  public currentIndex: number = 0;
  public isClearedRound: boolean = false;
  public isCompleted: boolean = false;
  public history: PracticeAnswerResult[] = [];
  public lastResult: PracticeAnswerResult | null = null;

  private initialItems: PracticeItem[] = [];
  private queue: PracticeItem[] = [];
  private wrongItemsMap: Map<string, PracticeItem> = new Map();
  private firstPassAttempted: Set<string> = new Set();
  private firstPassCorrect: Set<string> = new Set();
  private startTime: number = Date.now();
  private endTime?: number;
  private options: PracticeSessionOptions;

  constructor(items: PracticeItem[], options: PracticeSessionOptions = {}) {
    this.options = options;
    this.mode = options.mode || 'flashcard';
    this.initialItems = items.map((item) => ({ ...item }));
    this.queue = items.map((item) => ({ ...item }));
    this.startTime = Date.now();

    if (this.queue.length === 0) {
      this.isCompleted = true;
      this.endTime = this.startTime;
    }
  }

  /**
   * 當前卡片隊列總數
   */
  public get totalCount(): number {
    return this.queue.length;
  }

  /**
   * 當前題目的 PracticeItem，若結束則為 null
   */
  public get currentItem(): PracticeItem | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.queue.length) {
      return null;
    }
    return this.queue[this.currentIndex] || null;
  }

  /**
   * 本次練習所有曾答錯過的項目清單
   */
  public get incorrectItems(): PracticeItem[] {
    return Array.from(this.wrongItemsMap.values());
  }

  /**
   * 當前進度（0.0 ~ 1.0）
   */
  public get progress(): number {
    if (this.isCompleted || this.queue.length === 0) {
      return 1.0;
    }
    return Number(Math.min(1, Math.max(0, this.currentIndex / this.queue.length)).toFixed(4));
  }

  /**
   * 當前進度百分比（0 ~ 100）
   */
  public get progressPercent(): number {
    return Math.round(this.progress * 100);
  }

  /**
   * 剩餘未作答題目數（包含當前題）
   */
  public get remainingCount(): number {
    if (this.isCompleted) {
      return 0;
    }
    return Math.max(0, this.queue.length - this.currentIndex);
  }

  /**
   * 統計數據快照
   */
  public get stats(): PracticeStats {
    return this.getStats();
  }

  /**
   * 取得內部隊列複本（供測試或除錯檢視）
   */
  public getQueue(): PracticeItem[] {
    return [...this.queue];
  }

  /**
   * 處理答對情境
   */
  public handleCorrect(
    item?: PracticeItem,
    options?: { rating?: PracticeRating; userAnswer?: string; autoAdvance?: boolean }
  ): PracticeAnswerResult {
    const targetItem = item || this.currentItem;
    if (!targetItem) {
      throw new Error('No active question in practice session');
    }

    // 紀錄首次作答狀態（用於首輪答對率）
    if (!this.firstPassAttempted.has(targetItem.id)) {
      this.firstPassAttempted.add(targetItem.id);
      this.firstPassCorrect.add(targetItem.id);
    }

    const result: PracticeAnswerResult = {
      itemId: targetItem.id,
      word: targetItem.word,
      isCorrect: true,
      rating: options?.rating ?? 'good',
      userAnswer: options?.userAnswer,
      round: this.isClearedRound ? 'cleared' : 'main',
      timestamp: Date.now(),
    };

    this.history.push(result);
    this.lastResult = result;

    const shouldAdvance = options?.autoAdvance ?? this.options.autoAdvance ?? true;
    if (shouldAdvance) {
      this.advance();
    }

    return result;
  }

  /**
   * 處理答錯情境
   * 將該題目動態插入當前題目隊列後方 3~5 張卡片處（若剩餘題目不足 3 張，則直接排入隊尾）
   */
  public handleIncorrect(
    item?: PracticeItem,
    options?: { offset?: number; rating?: PracticeRating; userAnswer?: string; autoAdvance?: boolean }
  ): PracticeAnswerResult {
    const targetItem = item || this.currentItem;
    if (!targetItem) {
      throw new Error('No active question in practice session');
    }

    // 增加累計錯誤計數與頑固字判定 (>= 3 次)
    targetItem.incorrectCount = (targetItem.incorrectCount || 0) + 1;
    if (targetItem.incorrectCount >= 3) {
      targetItem.isLeech = true;
    }

    // 記錄至錯題集合中
    this.wrongItemsMap.set(targetItem.id, { ...targetItem });

    // 紀錄首次作答狀態
    if (!this.firstPassAttempted.has(targetItem.id)) {
      this.firstPassAttempted.add(targetItem.id);
    }

    const result: PracticeAnswerResult = {
      itemId: targetItem.id,
      word: targetItem.word,
      isCorrect: false,
      rating: options?.rating ?? 'again',
      userAnswer: options?.userAnswer,
      round: this.isClearedRound ? 'cleared' : 'main',
      timestamp: Date.now(),
    };

    this.history.push(result);
    this.lastResult = result;

    // 動態插入隊列演算法：
    // 檢查目前位置之後剩餘的題目數量
    const remainingAfterCurrent = this.queue.length - 1 - this.currentIndex;

    const clonedItem: PracticeItem = { ...targetItem };

    if (remainingAfterCurrent < 3) {
      // 若剩餘題目不足 3 張，直接排入隊尾
      this.queue.push(clonedItem);
    } else {
      // 剩餘題目 >= 3 張，插入後方 3~5 張處
      const minOffset = 3;
      const maxOffset = Math.min(5, remainingAfterCurrent);
      let offset: number;

      if (options?.offset !== undefined) {
        offset = options.offset;
      } else if (this.options.fixedOffset !== undefined) {
        offset = this.options.fixedOffset;
      } else if (this.options.offsetGenerator) {
        offset = this.options.offsetGenerator(minOffset, maxOffset);
      } else {
        offset = Math.floor(Math.random() * (maxOffset - minOffset + 1)) + minOffset;
      }

      // targetIndex = 當前索引 + 間隔題數 + 1
      const targetIndex = this.currentIndex + offset + 1;
      if (targetIndex >= this.queue.length) {
        this.queue.push(clonedItem);
      } else {
        this.queue.splice(targetIndex, 0, clonedItem);
      }
    }

    const shouldAdvance = options?.autoAdvance ?? this.options.autoAdvance ?? true;
    if (shouldAdvance) {
      this.advance();
    }

    return result;
  }

  /**
   * 通用提交作答入口
   */
  public submitAnswer(params: {
    isCorrect: boolean;
    rating?: PracticeRating;
    userAnswer?: string;
    offset?: number;
    autoAdvance?: boolean;
  }): PracticeAnswerResult {
    if (params.isCorrect) {
      return this.handleCorrect(undefined, {
        rating: params.rating,
        userAnswer: params.userAnswer,
        autoAdvance: params.autoAdvance,
      });
    } else {
      return this.handleIncorrect(undefined, {
        offset: params.offset,
        rating: params.rating,
        userAnswer: params.userAnswer,
        autoAdvance: params.autoAdvance,
      });
    }
  }

  /**
   * 手動推進至下一題（當 autoAdvance 為 false 時使用）
   */
  public nextQuestion(): PracticeItem | null {
    this.advance();
    return this.currentItem;
  }

  /**
   * 推進隊列與輪次切換邏輯
   */
  private advance(): void {
    if (this.isCompleted) {
      return;
    }

    this.currentIndex++;

    // 檢查當前隊列是否已到底
    if (this.currentIndex >= this.queue.length) {
      if (!this.isClearedRound) {
        // 主佇列完成，檢查是否有答錯項目
        if (this.wrongItemsMap.size > 0) {
          // 啟動「錯題清空輪」
          this.startClearedRound();
        } else {
          // 主佇列全對，練習正式完成
          this.completeSession();
        }
      } else {
        // 錯題清空輪已走完全部題目（且在此輪答對無再被重插），宣告完成
        this.completeSession();
      }
    }
  }

  /**
   * 啟動錯題清空輪
   */
  private startClearedRound(): void {
    this.isClearedRound = true;
    // 將所有曾答錯的題目作為新隊列
    this.queue = Array.from(this.wrongItemsMap.values()).map((item) => ({ ...item }));
    this.currentIndex = 0;
  }

  /**
   * 標記練習完成
   */
  private completeSession(): void {
    this.isCompleted = true;
    this.endTime = Date.now();
  }

  /**
   * 計算統計數據
   */
  public getStats(): PracticeStats {
    const durationMs = (this.endTime || Date.now()) - this.startTime;
    const uniqueWordsCount = this.initialItems.length;
    const incorrectItems = Array.from(this.wrongItemsMap.values());
    const totalAttempts = this.history.length;
    const correctAttempts = this.history.filter((h) => h.isCorrect).length;
    const incorrectAttempts = this.history.filter((h) => !h.isCorrect).length;
    const firstPassTotalCount = this.firstPassAttempted.size;
    const firstPassCorrectCount = this.firstPassCorrect.size;
    const firstPassCorrectRate =
      firstPassTotalCount === 0
        ? 1
        : Number((firstPassCorrectCount / firstPassTotalCount).toFixed(4));

    return {
      durationMs,
      totalQuestions: uniqueWordsCount,
      uniqueWordsCount,
      totalAttempts,
      correctAttempts,
      incorrectAttempts,
      firstPassCorrectRate,
      firstPassCorrectCount,
      firstPassTotalCount,
      incorrectItems,
      completedAt: this.endTime,
    };
  }

  /**
   * 重設 Session
   */
  public reset(): void {
    this.currentIndex = 0;
    this.isClearedRound = false;
    this.isCompleted = false;
    this.history = [];
    this.lastResult = null;
    this.wrongItemsMap.clear();
    this.firstPassAttempted.clear();
    this.firstPassCorrect.clear();
    this.queue = this.initialItems.map((item) => ({ ...item }));
    this.startTime = Date.now();
    this.endTime = undefined;
  }
}

