import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
// @ts-ignore
import {
  expandWordVariants,
  convertToTraditionalTW,
  generateWordId,
  mergeWordEntries,
  processVocabulary
} from '../scripts/generate-dict.js';
import {
  loadVocabulary,
  getDictVersion,
  getWordById,
  getWordsByCategory,
  getWordsByLevel,
  getWordsByFilter,
  searchWords,
  clearDictCache
} from '../src/services/dictService';
import type { WordItem } from '../src/types/word';

describe('TASK-02: 詞庫生成處理腳本與詞庫資料規格驗證', () => {

  describe('1. 括號與斜線變體拆分 (expandWordVariants)', () => {
    it('應正確拆分後綴括號，如 agree(ment) -> agree, agreement', () => {
      const variants = expandWordVariants('agree(ment)');
      expect(variants).toContain('agree');
      expect(variants).toContain('agreement');
      expect(variants.length).toBe(2);
    });

    it('應正確拆分斜線同義詞，如 bicycle/bike -> bicycle, bike', () => {
      const variants = expandWordVariants('bicycle/bike');
      expect(variants).toContain('bicycle');
      expect(variants).toContain('bike');
      expect(variants.length).toBe(2);
    });

    it('應正確拆分前綴括號，如 (a)round -> round, around', () => {
      const variants = expandWordVariants('(a)round');
      expect(variants).toContain('round');
      expect(variants).toContain('around');
      expect(variants.length).toBe(2);
    });

    it('應正確拆分後綴名詞括號，如 photo(graph) 與 collect(ion)', () => {
      const photoVariants = expandWordVariants('photo(graph)');
      expect(photoVariants).toEqual(expect.arrayContaining(['photo', 'photograph']));

      const collectVariants = expandWordVariants('collect(ion)');
      expect(collectVariants).toEqual(expect.arrayContaining(['collect', 'collection']));
    });

    it('一般無特殊符號之單字應保持單一元素', () => {
      const variants = expandWordVariants('abandon');
      expect(variants).toEqual(['abandon']);
    });

    it('空字串或非字串輸入應優雅回傳空陣列', () => {
      expect(expandWordVariants('')).toEqual([]);
      expect(expandWordVariants('   ')).toEqual([]);
      expect((expandWordVariants as (arg: unknown) => string[])(null)).toEqual([]);
    });
  });

  describe('2. 簡體轉繁體與台灣語境轉換 (convertToTraditionalTW)', () => {
    it('應將常見大陸電腦科技用語轉換為台灣在地慣用語', () => {
      expect(convertToTraditionalTW('計算機軟件程序')).toBe('電腦軟體程式');
      expect(convertToTraditionalTW('網絡服務器設備')).toBe('網路伺服器設備');
      expect(convertToTraditionalTW('電腦屏幕與顯示屏')).toBe('電腦螢幕與螢幕');
      expect(convertToTraditionalTW('項目計劃')).toBe('專案計畫');
      expect(convertToTraditionalTW('信息與資料數據')).toBe('資訊與資料資料');
      expect(convertToTraditionalTW('數據庫系統')).toBe('資料庫系統');
      expect(convertToTraditionalTW('內存與硬盤')).toBe('記憶體與硬碟');
      expect(convertToTraditionalTW('視頻與音頻')).toBe('影片與音訊');
      expect(convertToTraditionalTW('默認選單')).toBe('預設選單');
      expect(convertToTraditionalTW('用戶登錄')).toBe('使用者登入');
      expect(convertToTraditionalTW('合同簽訂')).toBe('合約簽訂');
      expect(convertToTraditionalTW('打印機設備')).toBe('印表機設備');
    });

    it('應正確將常見簡體字轉換為繁體中文', () => {
      const simplified = '经济发展与市场规则，选择正确的课程和学校，银行与顾客，创造新的结构。';
      const traditional = convertToTraditionalTW(simplified);
      expect(traditional).toBe('經濟發展與市場規則，選擇正確的課程和學校，銀行與顧客，創造新的結構。');
      expect(traditional).not.toContain('经');
      expect(traditional).not.toContain('济');
      expect(traditional).not.toContain('发');
      expect(traditional).not.toContain('规');
      expect(traditional).not.toContain('则');
      expect(traditional).not.toContain('选');
      expect(traditional).not.toContain('择');
      expect(traditional).not.toContain('课');
      expect(traditional).not.toContain('学');
      expect(traditional).not.toContain('银');
      expect(traditional).not.toContain('顾');
      expect(traditional).not.toContain('创');
      expect(traditional).not.toContain('构');
    });

    it('原本就是繁體中文之字串應原樣保留', () => {
      const twText = '這是一段標準的繁體中文例句。';
      expect(convertToTraditionalTW(twText)).toBe(twText);
    });
  });

  describe('3. 單字識別碼生成 (generateWordId)', () => {
    it('應產出跨版本穩定的 slug ID，以 w_ 開頭且全小寫', () => {
      expect(generateWordId('abandon')).toBe('w_abandon');
      expect(generateWordId('Manage')).toBe('w_manage');
      expect(generateWordId('work-life')).toBe('w_work_life');
    });

    it('多次執行同一單字產出的 ID 必須完全一致', () => {
      const id1 = generateWordId('schedule');
      const id2 = generateWordId('schedule');
      expect(id1).toBe(id2);
      expect(id1).toBe('w_schedule');
    });
  });

  describe('4. 去重與分類合併 (mergeWordEntries)', () => {
    it('同一單字若在學測與多益皆出現，應正確合併為單一筆並具備雙 category', () => {
      const rawEntries = [
        {
          word: 'manage',
          phonetic: '/ˈmænɪdʒ/',
          pos: ['v.'],
          definition: '管理；處置',
          examples: [{ en: 'She managed to finish on time.', zh: '她設法按時完成了。' }],
          category: ['gsat'],
          level: 3,
          tags: ['學測Level 3']
        },
        {
          word: 'manage',
          phonetic: '/ˈmænɪdʒ/',
          pos: ['v.'],
          definition: '經營業務',
          examples: [{ en: 'He manages the marketing team.', zh: '他管理行銷團隊。' }],
          category: ['toeic'],
          level: 1,
          toeicTier: 'entry',
          tags: ['多益入門']
        }
      ];

      const merged = mergeWordEntries(rawEntries);
      expect(merged.length).toBe(1);

      const word = merged[0];
      expect(word.id).toBe('w_manage');
      expect(word.word).toBe('manage');
      expect(word.category).toEqual(expect.arrayContaining(['gsat', 'toeic']));
      expect(word.level).toBe(3); // 學測等級保留
      expect(word.toeicTier).toBe('entry');
      expect(word.tags).toContain('學測Level 3');
      expect(word.tags).toContain('多益入門');
      expect(word.examples.length).toBe(2);
    });

    it('重複單字合併時詞性應正確聯集去重', () => {
      const rawEntries = [
        { word: 'order', pos: ['n.'], definition: '秩序', examples: [], category: ['gsat'], level: 3 },
        { word: 'order', pos: ['v.', 'n.'], definition: '點餐；下訂單', examples: [], category: ['toeic'], level: 1 }
      ];

      const merged = mergeWordEntries(rawEntries);
      expect(merged.length).toBe(1);
      expect(merged[0].pos).toEqual(['n.', 'v.']);
    });
  });

  describe('5. 靜態詞庫 JSON 檔案完整性與品質校驗 (public/data)', () => {
    const vocabPath = path.resolve(process.cwd(), 'public/data/vocabulary.json');
    const versionPath = path.resolve(process.cwd(), 'public/data/version.json');

    it('vocabulary.json 應存在且為合法 JSON 陣列', () => {
      expect(fs.existsSync(vocabPath)).toBe(true);
      const content = fs.readFileSync(vocabPath, 'utf8');
      const data = JSON.parse(content);
      expect(Array.isArray(data)).toBe(true);
    });

    it('詞庫總筆數應達到至少 200 筆以上 (AC 要求)', () => {
      const data: WordItem[] = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
      expect(data.length).toBeGreaterThanOrEqual(200);
    });

    it('所有單字條目之必填欄位均不得為空，且型別完全符合規格', () => {
      const data: WordItem[] = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
      const idSet = new Set<string>();

      for (const item of data) {
        // id 檢驗
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
        expect(item.id.startsWith('w_')).toBe(true);
        // ID 唯一性檢驗，不得有任何重複
        expect(idSet.has(item.id)).toBe(false);
        idSet.add(item.id);

        // word 檢驗
        expect(typeof item.word).toBe('string');
        expect(item.word.length).toBeGreaterThan(0);
        expect(item.word).toBe(item.word.toLowerCase());

        // pos 詞性陣列
        expect(Array.isArray(item.pos)).toBe(true);
        expect(item.pos.length).toBeGreaterThan(0);

        // definition 繁體中文釋義
        expect(typeof item.definition).toBe('string');
        expect(item.definition.length).toBeGreaterThan(0);

        // examples 例句陣列，至少 1 組中英對照
        expect(Array.isArray(item.examples)).toBe(true);
        expect(item.examples.length).toBeGreaterThanOrEqual(1);
        for (const ex of item.examples) {
          expect(typeof ex.en).toBe('string');
          expect(ex.en.length).toBeGreaterThan(0);
          expect(typeof ex.zh).toBe('string');
          expect(ex.zh.length).toBeGreaterThan(0);
        }

        // category
        expect(Array.isArray(item.category)).toBe(true);
        expect(item.category.length).toBeGreaterThan(0);
        for (const cat of item.category) {
          expect(['gsat', 'toeic']).toContain(cat);
        }

        // level
        expect(typeof item.level).toBe('number');
        expect(item.level).toBeGreaterThanOrEqual(1);

        // tags
        expect(Array.isArray(item.tags)).toBe(true);
        expect(item.tags.length).toBeGreaterThan(0);
      }
    });

    it('應完整涵蓋學測 Level 1 ~ Level 6 各等級', () => {
      const data: WordItem[] = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
      const gsatWords = data.filter(w => w.category.includes('gsat'));

      for (let lvl = 1; lvl <= 6; lvl++) {
        const count = gsatWords.filter(w => w.level === lvl).length;
        expect(count).toBeGreaterThan(0);
      }
    });

    it('應涵蓋多益 (TOEIC) 單字且分級正確包含 entry / intermediate / advanced', () => {
      const data: WordItem[] = JSON.parse(fs.readFileSync(vocabPath, 'utf8'));
      const toeicWords = data.filter(w => w.category.includes('toeic'));
      expect(toeicWords.length).toBeGreaterThan(30);

      const tiers = new Set(toeicWords.map(w => w.toeicTier));
      expect(tiers.has('entry')).toBe(true);
      expect(tiers.has('intermediate')).toBe(true);
      expect(tiers.has('advanced')).toBe(true);
    });

    it('version.json 應記錄有效版本號、更新時間、單字筆數及 SHA-256 雜湊', () => {
      expect(fs.existsSync(versionPath)).toBe(true);
      const versionContent = fs.readFileSync(versionPath, 'utf8');
      const versionData = JSON.parse(versionContent);

      expect(versionData.version).toBe('1.0.0');
      expect(typeof versionData.updatedAt).toBe('string');
      expect(new Date(versionData.updatedAt).getTime()).not.toBeNaN();

      const vocabContent = fs.readFileSync(vocabPath, 'utf8');
      const vocabData = JSON.parse(vocabContent);
      expect(versionData.wordCount).toBe(vocabData.length);
      expect(typeof versionData.checksum).toBe('string');
      expect(versionData.checksum.length).toBe(64); // SHA-256 hex長度
    });
  });

  describe('6. 詞庫存取服務 (dictService.ts)', () => {
    beforeEach(() => {
      clearDictCache();
    });

    it('loadVocabulary 能順利載入所有單字清單並支援記憶體快取', async () => {
      const words1 = await loadVocabulary();
      expect(Array.isArray(words1)).toBe(true);
      expect(words1.length).toBeGreaterThanOrEqual(200);

      // 二次呼叫應自快取回傳相同參考
      const words2 = await loadVocabulary();
      expect(words2).toBe(words1);
    });

    it('getDictVersion 能順利取得詞庫版本資訊', async () => {
      const version = await getDictVersion();
      expect(version.version).toBe('1.0.0');
      expect(version.wordCount).toBeGreaterThanOrEqual(200);
      expect(typeof version.checksum).toBe('string');
    });

    it('getWordById 能正確依據 ID 查出單字項目', async () => {
      const word = await getWordById('w_abandon');
      expect(word).toBeDefined();
      expect(word?.word).toBe('abandon');
      expect(word?.id).toBe('w_abandon');

      const nonExistent = await getWordById('w_unknown_word_999');
      expect(nonExistent).toBeUndefined();
    });

    it('getWordsByCategory 能依據分類過濾', async () => {
      const gsatList = await getWordsByCategory('gsat');
      expect(gsatList.length).toBeGreaterThan(0);
      expect(gsatList.every(w => w.category.includes('gsat'))).toBe(true);

      const toeicList = await getWordsByCategory('toeic');
      expect(toeicList.length).toBeGreaterThan(0);
      expect(toeicList.every(w => w.category.includes('toeic'))).toBe(true);
    });

    it('getWordsByLevel 能依據分類與等級精準篩選', async () => {
      const level4Words = await getWordsByLevel('gsat', 4);
      expect(level4Words.length).toBeGreaterThan(0);
      expect(level4Words.every(w => w.category.includes('gsat') && w.level === 4)).toBe(true);
    });

    it('searchWords 能依英文或中文釋義模糊搜尋', async () => {
      const searchResEn = await searchWords('abandon');
      expect(searchResEn.some(w => w.word === 'abandon')).toBe(true);

      const searchResZh = await searchWords('放棄');
      expect(searchResZh.some(w => w.definition.includes('放棄'))).toBe(true);

      const emptyRes = await searchWords('');
      expect(emptyRes).toEqual([]);
    });

    it('getWordsByFilter 能依複合條件篩選', async () => {
      const filterRes = await getWordsByFilter({
        category: 'toeic',
        toeicTier: 'entry'
      });
      expect(filterRes.length).toBeGreaterThan(0);
      expect(filterRes.every(w => w.category.includes('toeic') && w.toeicTier === 'entry')).toBe(true);
    });
  });
});
