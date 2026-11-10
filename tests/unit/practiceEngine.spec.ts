import { describe, expect, it } from 'vitest';
import { PracticeSession } from '../../src/services/practiceEngine';
import type { PracticeItem } from '../../src/types/practice';

function createMockItem(id: string, word: string, partial?: Partial<PracticeItem>): PracticeItem {
  return {
    id,
    word,
    phonetic: `/ˈ${word}/`,
    pos: ['n.'],
    definition: `${word} 的繁體中文釋義`,
    examples: [
      {
        en: `This is a sample sentence with ${word}.`,
        zh: `這是含有 ${word} 的範例句子。`,
      },
    ],
    example: `This is a sample sentence with ${word}.`,
    exampleTranslation: `這是含有 ${word} 的範例句子。`,
    level: 1,
    tags: ['學測Level 1'],
    category: ['gsat'],
    incorrectCount: 0,
    isLeech: false,
    ...partial,
  };
}

describe('PracticeSession 練習引擎核心模組', () => {
  describe('1. 一次全對流程', () => {
    it('全對時順利推進題號、更新進度並在主隊列結束後宣告練習完成', () => {
      const items = [
        createMockItem('w1', 'apple'),
        createMockItem('w2', 'banana'),
        createMockItem('w3', 'cherry'),
      ];

      const session = new PracticeSession(items, { mode: 'quiz' });

      expect(session.currentIndex).toBe(0);
      expect(session.totalCount).toBe(3);
      expect(session.currentItem?.id).toBe('w1');
      expect(session.progress).toBe(0);
      expect(session.isCompleted).toBe(false);
      expect(session.isClearedRound).toBe(false);

      // 答對第 1 題
      const res1 = session.handleCorrect();
      expect(res1.isCorrect).toBe(true);
      expect(res1.itemId).toBe('w1');
      expect(session.currentIndex).toBe(1);
      expect(session.currentItem?.id).toBe('w2');
      expect(session.progress).toBeCloseTo(1 / 3, 2);

      // 答對第 2 題
      session.handleCorrect();
      expect(session.currentIndex).toBe(2);
      expect(session.currentItem?.id).toBe('w3');

      // 答對第 3 題（最後一題）
      session.handleCorrect();
      expect(session.currentIndex).toBe(3);
      expect(session.currentItem).toBeNull();
      expect(session.isCompleted).toBe(true);
      expect(session.isClearedRound).toBe(false);
      expect(session.progress).toBe(1);
      expect(session.progressPercent).toBe(100);
      expect(session.remainingCount).toBe(0);
      expect(session.incorrectItems).toHaveLength(0);

      // 統計數據驗證
      const stats = session.getStats();
      expect(stats.totalQuestions).toBe(3);
      expect(stats.uniqueWordsCount).toBe(3);
      expect(stats.totalAttempts).toBe(3);
      expect(stats.correctAttempts).toBe(3);
      expect(stats.incorrectAttempts).toBe(0);
      expect(stats.firstPassCorrectRate).toBe(1.0);
      expect(stats.firstPassCorrectCount).toBe(3);
      expect(stats.firstPassTotalCount).toBe(3);
      expect(stats.incorrectItems).toEqual([]);
    });
  });

  describe('2. 答錯動態插回後方 3~5 題演算法', () => {
    it('當剩餘題目 >= 3 張時，答錯項目動態插入後方 3~5 張處（指定 offset = 3）', () => {
      // 隊列: [0: A, 1: B, 2: C, 3: D, 4: E, 5: F, 6: G] (長度 7)
      const items = [
        createMockItem('A', 'abandon'),
        createMockItem('B', 'benefit'),
        createMockItem('C', 'candidate'),
        createMockItem('D', 'decade'),
        createMockItem('E', 'efficient'),
        createMockItem('F', 'faculty'),
        createMockItem('G', 'gallery'),
      ];

      const session = new PracticeSession(items, { fixedOffset: 3 });

      // 在索引 0 答錯 A
      // remainingAfterCurrent = 7 - 1 - 0 = 6 (>= 3)
      // targetIndex = 0 + 3 + 1 = 4
      const result = session.handleIncorrect();
      expect(result.isCorrect).toBe(false);
      expect(result.itemId).toBe('A');

      // 新隊列長度應為 8，插在索引 4：[A, B, C, D, A(clone), E, F, G]
      const queue = session.getQueue();
      expect(queue.length).toBe(8);
      expect(queue[4].id).toBe('A');

      // 當前應已前進至索引 1 (B)
      expect(session.currentIndex).toBe(1);
      expect(session.currentItem?.id).toBe('B');

      // 依序答對 B, C, D
      session.handleCorrect(); // index 1 -> 2 (C)
      session.handleCorrect(); // index 2 -> 3 (D)
      session.handleCorrect(); // index 3 -> 4 (A 再次抽出作答！)

      expect(session.currentIndex).toBe(4);
      expect(session.currentItem?.id).toBe('A');
    });

    it('未指定 fixedOffset 時，動態插回 offset 在 3 到 5 範圍內', () => {
      const items = [
        createMockItem('A', 'apple'),
        createMockItem('B', 'banana'),
        createMockItem('C', 'cherry'),
        createMockItem('D', 'date'),
        createMockItem('E', 'elderberry'),
        createMockItem('F', 'fig'),
        createMockItem('G', 'grape'),
        createMockItem('H', 'honeydew'),
      ];

      const session = new PracticeSession(items);
      session.handleIncorrect(); // index 0 答錯 A

      const queue = session.getQueue();
      // targetIndex 應落在 0 + [3..5] + 1 = 4..6
      const cloneIndex = queue.findIndex((item, idx) => idx > 0 && item.id === 'A');
      expect(cloneIndex).toBeGreaterThanOrEqual(4);
      expect(cloneIndex).toBeLessThanOrEqual(6);
    });

    it('當剩餘題目不足 3 張時，直接排入隊尾', () => {
      // 隊列只有 3 張卡片，索引 0 時剩餘 2 張 (< 3)
      const items = [
        createMockItem('A', 'apple'),
        createMockItem('B', 'banana'),
        createMockItem('C', 'cherry'),
      ];

      const session = new PracticeSession(items);

      // 在索引 0 (A) 答錯，剩餘後方卡片只有 B、C（共 2 張 < 3）
      session.handleIncorrect();

      const queue = session.getQueue();
      // 隊列應變為 [A, B, C, A]，A 被直接 push 至隊尾（索引 3）
      expect(queue.length).toBe(4);
      expect(queue[3].id).toBe('A');
    });
  });

  describe('3. 主隊列結束後自動切入「錯題清空輪」（Clear-the-deck）', () => {
    it('主隊列結束時若有錯題，自動進入錯題清空輪，直到錯題全數答對才完成', () => {
      const items = [
        createMockItem('A', 'apple'),
        createMockItem('B', 'banana'),
      ];

      const session = new PracticeSession(items);

      // 第 0 題 A 答錯，直接排入隊尾（隊列變為 [A, B, A]）
      session.handleIncorrect();
      expect(session.isClearedRound).toBe(false);
      expect(session.isCompleted).toBe(false);

      // 第 1 題 B 答對
      session.handleCorrect();
      expect(session.currentIndex).toBe(2);
      expect(session.currentItem?.id).toBe('A');

      // 主隊列中第 2 題 A 答對
      session.handleCorrect();

      // 主隊列結束！因為 A 曾答錯過，自動觸發「錯題清空輪」
      expect(session.isClearedRound).toBe(true);
      expect(session.isCompleted).toBe(false);
      expect(session.currentIndex).toBe(0);
      expect(session.currentItem?.id).toBe('A');

      // 在錯題清空輪中，若 A 再錯一次：
      session.handleIncorrect();
      expect(session.isCompleted).toBe(false);
      expect(session.isClearedRound).toBe(true);
      // A 被再插到清空輪隊尾
      expect(session.currentItem?.id).toBe('A');

      // 清空輪中再次作答 A：答對！
      session.handleCorrect();

      // 錯題清空輪全部通過，練習正式完成
      expect(session.isCompleted).toBe(true);
      expect(session.currentItem).toBeNull();
      expect(session.progress).toBe(1.0);
    });

    it('多道題目答錯時，錯題清空輪隊列涵蓋所有錯題並依序清空', () => {
      const items = [
        createMockItem('A', 'apple'),
        createMockItem('B', 'banana'),
        createMockItem('C', 'cherry'),
      ];

      const session = new PracticeSession(items);

      // A 答錯 -> 隊尾排 A
      session.handleIncorrect();
      // B 答錯 -> 隊尾排 B
      session.handleIncorrect();
      // C 答對
      session.handleCorrect();
      // 主隊列中的重試 A 答對
      session.handleCorrect();
      // 主隊列中的重試 B 答對
      session.handleCorrect();

      // 主隊列結束，切入錯題清空輪
      expect(session.isClearedRound).toBe(true);
      expect(session.isCompleted).toBe(false);
      expect(session.totalCount).toBe(2); // 清空輪包含 A 與 B
      expect(session.currentItem?.id).toBe('A');

      // 清空輪答對 A
      session.handleCorrect();
      expect(session.currentItem?.id).toBe('B');

      // 清空輪答對 B
      session.handleCorrect();
      expect(session.isCompleted).toBe(true);
    });
  });

  describe('4. 統計數據與首輪答對率計算', () => {
    it('精準計算耗時、總題數、首輪答對率與錯題清單', async () => {
      const items = [
        createMockItem('A', 'apple'),
        createMockItem('B', 'banana'),
        createMockItem('C', 'cherry'),
        createMockItem('D', 'date'),
      ];

      const session = new PracticeSession(items);

      // 首輪作答：
      // A: 正確
      session.handleCorrect();
      // B: 錯誤
      session.handleIncorrect();
      // C: 正確
      session.handleCorrect();
      // D: 正確
      session.handleCorrect();

      // 隊列後續重測 B: 正確
      session.handleCorrect();

      // 清空輪重測 B: 正確
      session.handleCorrect();

      expect(session.isCompleted).toBe(true);

      const stats = session.getStats();
      expect(stats.durationMs).toBeGreaterThanOrEqual(0);
      expect(stats.totalQuestions).toBe(4);
      expect(stats.uniqueWordsCount).toBe(4);
      // 首輪 4 題中有 3 題對 (A, C, D)，1 題錯 (B) => 3/4 = 0.75
      expect(stats.firstPassCorrectRate).toBe(0.75);
      expect(stats.firstPassCorrectCount).toBe(3);
      expect(stats.firstPassTotalCount).toBe(4);

      // 曾答錯清單應恰好包含 B
      expect(stats.incorrectItems).toHaveLength(1);
      expect(stats.incorrectItems[0].id).toBe('B');
    });
  });

  describe('5. 頑固字 (Leech) 判定與作答介面互動', () => {
    it('單字答錯累積達 3 次自動標記為 isLeech = true', () => {
      const items = [createMockItem('X', 'xenon')];
      const session = new PracticeSession(items);

      expect(session.currentItem?.isLeech).toBe(false);
      expect(session.currentItem?.incorrectCount).toBe(0);

      // 錯第 1 次
      session.handleIncorrect();
      expect(session.incorrectItems[0].incorrectCount).toBe(1);
      expect(session.incorrectItems[0].isLeech).toBe(false);

      // 主隊列重試第 2 次錯
      session.handleIncorrect();
      expect(session.incorrectItems[0].incorrectCount).toBe(2);
      expect(session.incorrectItems[0].isLeech).toBe(false);

      // 清空輪或重試第 3 次錯
      session.handleIncorrect();
      expect(session.incorrectItems[0].incorrectCount).toBe(3);
      expect(session.incorrectItems[0].isLeech).toBe(true);
    });

    it('支援 submitAnswer 統一介面與非自動推進模式 (autoAdvance: false)', () => {
      const items = [createMockItem('M', 'mango'), createMockItem('O', 'orange')];
      const session = new PracticeSession(items, { autoAdvance: false });

      // 使用 submitAnswer 答題，但因為 autoAdvance: false，索引不自動跳轉
      const res = session.submitAnswer({
        isCorrect: true,
        rating: 'easy',
        userAnswer: 'mango',
      });

      expect(res.isCorrect).toBe(true);
      expect(res.rating).toBe('easy');
      expect(session.currentIndex).toBe(0); // 題號未動
      expect(session.currentItem?.id).toBe('M');
      expect(session.lastResult?.itemId).toBe('M');

      // 手動推進下一題
      const nextItem = session.nextQuestion();
      expect(nextItem?.id).toBe('O');
      expect(session.currentIndex).toBe(1);
    });

    it('reset 功能可完全重置練習至初始狀態', () => {
      const items = [createMockItem('A', 'apple')];
      const session = new PracticeSession(items);

      session.handleIncorrect();
      session.handleCorrect();
      session.handleCorrect();
      expect(session.isCompleted).toBe(true);

      session.reset();
      expect(session.currentIndex).toBe(0);
      expect(session.isCompleted).toBe(false);
      expect(session.isClearedRound).toBe(false);
      expect(session.incorrectItems).toHaveLength(0);
      expect(session.currentItem?.id).toBe('A');
    });

    it('空隊列邊界處理：初始化即標記為完成', () => {
      const session = new PracticeSession([]);
      expect(session.isCompleted).toBe(true);
      expect(session.currentItem).toBeNull();
      expect(session.progress).toBe(1.0);
      expect(session.getStats().totalQuestions).toBe(0);
    });
  });
});

