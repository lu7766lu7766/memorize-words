/**
 * 詞庫資料型別定義 (Vocabulary Type Definitions)
 * 遵循 TASK-02 規範
 */

export type WordCategory = 'gsat' | 'toeic';
export type ToeicTier = 'entry' | 'intermediate' | 'advanced';

export interface WordExample {
  en: string;
  zh: string;
}

export interface WordItem {
  /** 唯一且跨版本固定之識別碼，如 w_abandon 或 w_manage，確保詞庫更新不破壞學習進度 */
  id: string;
  /** 英文單字，統一小寫與清理空白 */
  word: string;
  /** KK 或 IPA 音標 */
  phonetic?: string;
  /** 詞性陣列，例如 ['v.', 'n.'] */
  pos: string[];
  /** 繁體中文釋義，採用台灣常用翻譯語境 */
  definition: string;
  /** 實用例句及中譯（至少 1 組） */
  examples: WordExample[];
  /** 詞庫類別：學測、多益，或兩者兼具 */
  category: WordCategory[];
  /** 學測對應 Level 1~6；多益對應 1=入門、2=中階、3=進階 */
  level: number;
  /** 多益級別：entry(入門) | intermediate(中階) | advanced(進階) */
  toeicTier?: ToeicTier;
  /** 標籤清單，如 ["學測Level 1", "多益入門"] */
  tags: string[];
}

export interface DictVersion {
  /** 詞庫版本號，如 1.0.0 */
  version: string;
  /** 更新時間戳記 (ISO 8601) */
  updatedAt: string;
  /** 單字總數 */
  wordCount: number;
  /** 內容雜湊值 (SHA-256) */
  checksum?: string;
}

export interface DictFilter {
  category?: WordCategory;
  level?: number;
  toeicTier?: ToeicTier;
  search?: string;
  tag?: string;
}
