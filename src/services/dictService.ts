/**
 * 詞庫存取服務 (Vocabulary Dictionary Service)
 * 遵循 TASK-02 規範
 * 
 * 提供：
 * 1. 非同步載入與記憶體快取 (loadVocabulary / getDictVersion)
 * 2. 多條件單字查詢 (getWordById, getWordsByCategory, getWordsByLevel, getWordsByFilter)
 * 3. 關鍵字搜尋 (searchWords)
 * 4. 支援瀏覽器 fetch 與測試/Node 環境降級載入
 */

import type { WordItem, DictVersion, DictFilter, WordCategory } from '../types/word';

let cachedWords: WordItem[] | null = null;
let cachedVersion: DictVersion | null = null;

const isVitest = typeof process !== 'undefined' && !!process.env?.VITEST;

/**
 * 載入完整詞庫單字清單 (內建記憶體快取)
 * @param forceRefresh 是否強制重新載入
 */
export async function loadVocabulary(forceRefresh = false): Promise<WordItem[]> {
  if (cachedWords && !forceRefresh) {
    return cachedWords;
  }

  // 1. Vitest 測試環境或 Node 環境優先直接自本機讀取
  if (isVitest || (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node)) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'public/data/vocabulary.json');
    const content = await fs.readFile(filePath, 'utf8');
    cachedWords = JSON.parse(content) as WordItem[];
    return cachedWords;
  }

  // 2. 瀏覽器環境優先使用 fetch
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const response = await window.fetch('/data/vocabulary.json');
      if (response.ok) {
        cachedWords = (await response.json()) as WordItem[];
        return cachedWords;
      }
    } catch {
      // 在測試環境或離線未啟動 http server 時降級至 Node 檔案系統讀取
    }
  }

  // 3. 一般 Node.js 降級
  if (typeof process !== 'undefined' && process.versions?.node) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'public/data/vocabulary.json');
    const content = await fs.readFile(filePath, 'utf8');
    cachedWords = JSON.parse(content) as WordItem[];
    return cachedWords;
  }

  throw new Error('無法載入詞庫：當前環境不支援 fetch 亦非 Node.js 環境');
}

/**
 * 取得詞庫版本與更新時間資訊
 */
export async function getDictVersion(forceRefresh = false): Promise<DictVersion> {
  if (cachedVersion && !forceRefresh) {
    return cachedVersion;
  }

  // 1. Vitest 測試環境
  if (isVitest || (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node)) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'public/data/version.json');
    const content = await fs.readFile(filePath, 'utf8');
    cachedVersion = JSON.parse(content) as DictVersion;
    return cachedVersion;
  }

  // 2. 瀏覽器環境
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    try {
      const response = await window.fetch('/data/version.json');
      if (response.ok) {
        cachedVersion = (await response.json()) as DictVersion;
        return cachedVersion;
      }
    } catch {
      // 降級
    }
  }

  // 3. Node.js 環境
  if (typeof process !== 'undefined' && process.versions?.node) {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.resolve(process.cwd(), 'public/data/version.json');
    const content = await fs.readFile(filePath, 'utf8');
    cachedVersion = JSON.parse(content) as DictVersion;
    return cachedVersion;
  }

  throw new Error('無法載入詞庫版本資訊：當前環境不支援');
}

/**
 * 依據固定單字 ID 取得單字項目
 */
export async function getWordById(id: string): Promise<WordItem | undefined> {
  if (!id) return undefined;
  const words = await loadVocabulary();
  return words.find(w => w.id === id);
}

/**
 * 依據分類 (gsat / toeic) 篩選單字
 */
export async function getWordsByCategory(category: WordCategory): Promise<WordItem[]> {
  const words = await loadVocabulary();
  return words.filter(w => w.category.includes(category));
}

/**
 * 依據分類與等級篩選單字
 * @param category 'gsat' | 'toeic'
 * @param level 學測 1~6；多益 1=入門、2=中階、3=進階
 */
export async function getWordsByLevel(category: WordCategory, level: number): Promise<WordItem[]> {
  const words = await loadVocabulary();
  return words.filter(w => w.category.includes(category) && w.level === level);
}

/**
 * 關鍵字搜尋單字（支援英文單字前綴/內含與繁體中文釋義搜尋）
 */
export async function searchWords(query: string): Promise<WordItem[]> {
  if (!query || !query.trim()) return [];
  const q = query.trim().toLowerCase();
  const words = await loadVocabulary();
  return words.filter(w =>
    w.word.toLowerCase().includes(q) ||
    w.definition.includes(query.trim())
  );
}

/**
 * 複合條件篩選單字
 */
export async function getWordsByFilter(filter: DictFilter): Promise<WordItem[]> {
  let words = await loadVocabulary();

  if (filter.category) {
    words = words.filter(w => w.category.includes(filter.category!));
  }

  if (typeof filter.level === 'number') {
    words = words.filter(w => w.level === filter.level);
  }

  if (filter.toeicTier) {
    words = words.filter(w => w.toeicTier === filter.toeicTier);
  }

  if (filter.tag) {
    words = words.filter(w => w.tags.includes(filter.tag!));
  }

  if (filter.search && filter.search.trim()) {
    const q = filter.search.trim().toLowerCase();
    const rawSearch = filter.search.trim();
    words = words.filter(w =>
      w.word.toLowerCase().includes(q) ||
      w.definition.includes(rawSearch)
    );
  }

  return words;
}

/**
 * 清除記憶體快取 (用於熱更新或測試重設)
 */
export function clearDictCache(): void {
  cachedWords = null;
  cachedVersion = null;
}

/**
 * 設定/模擬記憶體快取資料 (測試專用)
 */
export function setVocabularyCache(words: WordItem[], version?: DictVersion): void {
  cachedWords = [...words];
  if (version) {
    cachedVersion = { ...version };
  }
}
