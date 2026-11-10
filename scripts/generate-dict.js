/**
 * 詞庫建置與處理腳本 (Vocabulary Generation Pipeline)
 * 遵循 TASK-02 規範
 * 
 * 核心功能：
 * 1. 括號與斜線變體拆分 (agree(ment) -> agree, agreement / bicycle/bike -> bicycle, bike)
 * 2. 繁體台灣語境轉換 (OpenCC / 台灣慣用語對照：軟件->軟體, 網絡->網路, 信息->資訊, 項目->專案, etc.)
 * 3. 學測 (GSAT L1~L6) 與多益 (TOEIC entry/intermediate/advanced) 去重合併與標籤統一
 * 4. 產生固定唯一 ID (如 w_abandon, w_manage) 跨版本保持穩定
 * 5. 輸出 public/data/vocabulary.json 與 public/data/version.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// -------------------------------------------------------------
// 1. 繁體台灣用語與簡繁字詞對照表 (Taiwan Idioms & Char Map)
// -------------------------------------------------------------
export const TAIWAN_TERMS_MAP = [
  // 雙向或長詞優先替換
  ['計算機屏幕', '電腦螢幕'],
  ['顯示屏', '螢幕'],
  ['屏幕', '螢幕'],
  ['軟件程序', '軟體程式'],
  ['應用程序', '應用程式'],
  ['軟件', '軟體'],
  ['硬件', '硬體'],
  ['網絡服務器', '網路伺服器'],
  ['服務器', '伺服器'],
  ['網絡', '網路'],
  ['网络', '網路'],
  ['信息與資料', '資訊與資料'],
  ['信息技術', '資訊科技'],
  ['信息', '資訊'],
  ['訊息', '資訊'],
  ['數據庫系統', '資料庫系統'],
  ['數據庫', '資料庫'],
  ['数据库', '資料庫'],
  ['數據', '資料'],
  ['数据', '資料'],
  ['項目管理', '專案管理'],
  ['項目計劃', '專案計畫'],
  ['項目', '專案'],
  ['项目', '專案'],
  ['內存卡', '記憶卡'],
  ['內存', '記憶體'],
  ['内存', '記憶體'],
  ['硬盤', '硬碟'],
  ['光盤', '光碟'],
  ['視頻', '影片'],
  ['视频', '影片'],
  ['音頻', '音訊'],
  ['音频', '音訊'],
  ['默認', '預設'],
  ['默认', '預設'],
  ['菜單', '選單'],
  ['菜单', '選單'],
  ['計算機', '電腦'],
  ['计算机', '電腦'],
  ['程序員', '工程師'],
  ['程序', '程式'],
  ['算法', '演算法'],
  ['博客', '部落格'],
  ['鼠標', '滑鼠'],
  ['鼠标', '滑鼠'],
  ['用戶界面', '使用者介面'],
  ['用戶', '使用者'],
  ['用户', '使用者'],
  ['登錄', '登入'],
  ['登录', '登入'],
  ['界面', '介面'],
  ['鏈接', '連結'],
  ['链接', '連結'],
  ['緩存', '快取'],
  ['缓存', '快取'],
  ['郵箱', '信箱'],
  ['邮箱', '信箱'],
  ['簡歷', '履歷'],
  ['简历', '履歷'],
  ['合同', '合約'],
  ['計劃', '計畫'],
  ['计划', '計畫'],
  ['打印機', '印表機'],
  ['打印机', '印表機'],
  ['移動電話', '行動電話'],
  ['智能手機', '智慧型手機'],
  ['高清', '高畫質'],
  ['優化', '最佳化'],
  ['优化', '最佳化'],
  ['質量的', '品質的'],
  ['系统', '系統'],
  ['联系', '聯繫']
];

// 常見簡體字轉繁體字對照表
export const SIMPLIFIED_CHARS_MAP = {
  '简': '簡', '词': '詞', '语': '語', '经': '經', '济': '濟', '业': '業', '会': '會', '议': '議',
  '计': '計', '划': '劃', '产': '產', '标': '標', '准': '準', '设': '設', '备': '備', '门': '門',
  '关': '關', '开': '開', '办': '辦', '公': '公', '发': '發', '展': '展', '联': '聯',
  '质': '質', '量': '量', '认': '認', '识': '識', '导': '導', '师': '師', '责': '責', '任': '任',
  '胜': '勝', '利': '利', '单': '單', '复': '複', '杂': '雜', '环': '環', '境': '境', '资': '資',
  '源': '源', '进': '進', '步': '步', '报': '報', '告': '告', '统': '統', '规': '規', '则': '則',
  '选': '選', '择': '擇', '问': '問', '题': '題', '难': '難', '验': '驗', '证': '證', '测': '測',
  '试': '試', '练': '練', '习': '習', '课': '課', '程': '程', '学': '學', '校': '校', '银': '銀',
  '行': '行', '顾': '顧', '客': '客', '销': '銷', '售': '售', '创': '創', '造': '造', '构': '構',
  '建': '建', '结': '結', '果': '果', '现': '現', '在': '在', '终': '終', '于': '於', '虽': '雖',
  '然': '然', '却': '卻', '变': '變', '化': '化', '适': '適', '应': '應', '强': '強', '协': '協',
  '助': '助', '补': '補', '充': '充', '紧': '緊', '急': '急', '随': '隨', '时': '時', '机': '機',
  '器': '器', '点': '點', '评': '評', '估': '估', '决': '決', '定': '定', '投': '投', '获': '獲',
  '得': '得', '众': '眾', '赞': '贊', '理': '理', '职': '職', '位': '位', '雇': '僱', '员': '員',
  '薪': '薪', '水': '水', '迁': '遷', '提': '提', '升': '升', '降': '降', '低': '低', '损': '損',
  '失': '失', '扩': '擴', '张': '張', '缩': '縮', '小': '小', '预': '預', '算': '算', '审': '審',
  '查': '查', '监': '監', '督': '督', '沟': '溝', '通': '通', '谈': '談', '判': '判', '签': '簽',
  '订': '訂', '违': '違', '约': '約', '赔': '賠', '偿': '償', '支': '支', '付': '付', '账': '帳',
  '据': '據', '凭': '憑', '存': '存', '款': '款', '贷': '貸', '息': '息', '汇': '匯', '率': '率',
  '股': '股', '票': '票', '债': '債', '券': '券', '险': '險', '权': '權', '义': '義', '务': '務',
  '反': '反', '遵': '遵', '守': '守', '执': '執', '实': '實', '施': '施', '运': '運', '营': '營',
  '维': '維', '护': '護', '检': '檢', '修': '修', '保': '保', '养': '養', '改': '改', '善': '善',
  '优': '優', '秀': '秀', '杰': '傑', '出': '出', '独': '獨', '特': '特', '专': '專', '新': '新',
  '研': '研', '利': '利', '商': '商', '标': '標', '版': '版', '侵': '侵', '犯': '犯',
  '诉': '訴', '讼': '訟', '调': '調', '解': '解', '仲': '仲', '裁': '裁', '法': '法', '律': '律',
  '条': '條', '范': '範', '格': '格', '考': '考', '书': '書', '培': '培', '训': '訓', '讨': '討',
  '论': '論', '坛': '壇', '峰': '峰', '览': '覽', '陈': '陳', '列': '列', '宣': '宣', '传': '傳',
  '广': '廣', '策': '策', '略': '略', '针': '針', '愿': '願', '景': '景', '使': '使', '命': '命',
  '价': '價', '值': '值', '观': '觀', '文': '文', '氛': '氛', '围': '圍', '团': '團', '队': '隊',
  '作': '作', '伙': '夥', '伴': '伴', '络': '絡', '触': '觸', '渠': '渠', '道': '道', '馈': '饋',
  '见': '見', '处': '處', '满': '滿', '意': '意', '度': '度', '忠': '忠', '诚': '誠', '奖': '獎',
  '励': '勵', '惠': '惠', '折': '折', '扣': '扣', '促': '促', '赠': '贈', '礼': '禮', '兑': '兌',
  '换': '換', '退': '退', '货': '貨', '物': '物', '流': '流', '配': '配', '送': '送', '仓': '倉',
  '储': '儲', '输': '輸', '船': '船', '空': '空', '递': '遞', '装': '裝', '签': '籤', '尺': '尺',
  '寸': '寸', '重': '重', '容': '容', '积': '積', '坏': '壞', '瑕': '瑕', '疵': '疵', '索': '索',
  '拒': '拒', '绝': '絕', '受': '受', '批': '批', '准': '准', '授': '授', '托': '託', '代': '代',
  '采': '採', '购': '購', '盘': '盤', '缺': '缺', '断': '斷', '延': '延', '迟': '遲', '前': '前',
  '取': '取', '消': '消', '止': '止', '除': '除', '废': '廢', '效': '效', '过': '過', '期': '期',
  '续': '續', '约': '約', '两': '兩', '为': '為', '无': '無', '这': '這', '个': '個', '们': '們',
  '与': '與', '乐': '樂', '买': '買', '卖': '賣', '儿': '兒', '几': '幾',
  '动': '動', '劳': '勞', '医': '醫', '国': '國', '声': '聲', '头': '頭', '对': '對',
  '带': '帶', '总': '總', '数': '數', '样': '樣', '气': '氣', '电': '電',
  '种': '種', '纸': '紙', '给': '給', '车': '車', '边': '邊', '长': '長', '间': '間',
  '页': '頁', '风': '風', '飞': '飛', '馆': '館', '马': '馬', '鱼': '魚',
  '场': '場', '确': '確', '市': '市', '正': '正'
};

/**
 * 將簡體或非台灣慣用語轉換為繁體台灣語境
 */
export function convertToTraditionalTW(text) {
  if (!text || typeof text !== 'string') return text;
  let result = text;

  // 1. 優先替換慣用詞彙
  for (const [from, to] of TAIWAN_TERMS_MAP) {
    if (result.includes(from)) {
      result = result.split(from).join(to);
    }
  }

  // 2. 逐字替換常見簡體字
  let chars = '';
  for (let i = 0; i < result.length; i++) {
    const ch = result[i];
    chars += SIMPLIFIED_CHARS_MAP[ch] || ch;
  }

  return chars;
}

// -------------------------------------------------------------
// 2. 括號與斜線變體拆分 (Expand Word Variants)
// -------------------------------------------------------------
/**
 * 拆解合併寫法：
 * - agree(ment) -> ['agree', 'agreement']
 * - bicycle/bike -> ['bicycle', 'bike']
 * - photo(graph) -> ['photo', 'photograph']
 * - (a)round -> ['round', 'around']
 * - collect(ion) -> ['collect', 'collection']
 */
export function expandWordVariants(word) {
  if (!word || typeof word !== 'string') return [];
  const cleaned = word.trim().toLowerCase();
  if (!cleaned) return [];

  // 先依斜線、分號切割
  const slashParts = cleaned.split(/[/;]/).map(s => s.trim()).filter(Boolean);
  const results = new Set();

  for (const part of slashParts) {
    // 檢查是否有括號，如 agree(ment), (a)round, photo(graph)
    const match = part.match(/^(.*?)\((.*?)\)(.*)$/);
    if (match) {
      const prefix = match[1];
      const middle = match[2];
      const suffix = match[3];

      const optBase = `${prefix}${suffix}`.trim();
      const optExpanded = `${prefix}${middle}${suffix}`.trim();

      if (optBase) results.add(optBase);
      if (optExpanded) results.add(optExpanded);
    } else {
      results.add(part);
    }
  }

  return Array.from(results);
}

// -------------------------------------------------------------
// 3. 固定唯一識別碼 (Persistent Slug ID)
// -------------------------------------------------------------
/**
 * 產生唯一且跨版本固定之單字識別碼
 * 規則：w_${小寫英數底線}
 */
export function generateWordId(word) {
  if (!word || typeof word !== 'string') return '';
  const slug = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/^_+|_+$/g, '');
  return `w_${slug}`;
}

// -------------------------------------------------------------
// 4. 單字去重與分類合併 (Deduplication & Category Merging)
// -------------------------------------------------------------
/**
 * 將多個單字條目去重合併：
 * 當同一單字同時出現在學測與多益時，合併為單一筆：
 * - category: ['gsat', 'toeic']
 * - 詞性 pos 合併去重
 * - tags 涵蓋學測級別與多益分級
 * - 例句合併（以英文例句去重）
 * - definition 本地化繁體台灣用語
 */
export function mergeWordEntries(entries) {
  const map = new Map();

  for (const raw of entries) {
    const wordKey = raw.word.trim().toLowerCase();
    if (!wordKey) continue;

    const existing = map.get(wordKey);
    const category = Array.isArray(raw.category) ? raw.category : [raw.category || 'gsat'];
    const pos = Array.isArray(raw.pos) ? raw.pos : [raw.pos || 'n.'];
    const level = typeof raw.level === 'number' ? raw.level : 1;
    const toeicTier = raw.toeicTier || (category.includes('toeic') ? (level === 1 ? 'entry' : level === 2 ? 'intermediate' : 'advanced') : undefined);
    const definition = convertToTraditionalTW(raw.definition || '');
    const phonetic = raw.phonetic || '';
    const examples = Array.isArray(raw.examples) ? raw.examples.map(ex => ({
      en: (ex.en || '').trim(),
      zh: convertToTraditionalTW((ex.zh || '').trim())
    })) : [];

    if (!existing) {
      map.set(wordKey, {
        word: wordKey,
        phonetic,
        pos: [...pos],
        definition,
        examples: [...examples],
        category: [...new Set(category)],
        level,
        toeicTier,
        tags: Array.isArray(raw.tags) ? [...raw.tags] : []
      });
    } else {
      // 合併 category
      for (const cat of category) {
        if (!existing.category.includes(cat)) {
          existing.category.push(cat);
        }
      }
      existing.category.sort(); // 保證 ['gsat', 'toeic'] 順序穩定

      // 合併 POS
      for (const p of pos) {
        if (!existing.pos.includes(p)) {
          existing.pos.push(p);
        }
      }

      // 等級與多益 tier 合併
      if (category.includes('gsat')) {
        existing.level = level; // 學測等級優先作為主 level
      }
      if (toeicTier) {
        existing.toeicTier = toeicTier;
      }

      // 音標補充
      if (!existing.phonetic && phonetic) {
        existing.phonetic = phonetic;
      }

      // 釋義豐富
      if (definition && !existing.definition.includes(definition)) {
        if (!existing.definition) {
          existing.definition = definition;
        } else if (!existing.definition.includes(definition)) {
          existing.definition = `${existing.definition}；${definition}`;
        }
      }

      // 例句合併去重
      for (const ex of examples) {
        if (ex.en && !existing.examples.some(e => e.en.toLowerCase() === ex.en.toLowerCase())) {
          existing.examples.push(ex);
        }
      }

      // 標籤合併
      if (Array.isArray(raw.tags)) {
        for (const t of raw.tags) {
          if (!existing.tags.includes(t)) {
            existing.tags.push(t);
          }
        }
      }
    }
  }

  // 最終結構標準化與 ID 指派
  const result = [];
  for (const item of map.values()) {
    const id = generateWordId(item.word);

    // 建立標準標籤
    const tagsSet = new Set(item.tags);
    if (item.category.includes('gsat')) {
      tagsSet.add(`學測Level ${item.level}`);
    }
    if (item.category.includes('toeic')) {
      const tierName = item.toeicTier === 'entry' ? '入門' : item.toeicTier === 'intermediate' ? '中階' : '進階';
      tagsSet.add(`多益${tierName}`);
    }

    // 確保至少有一組例句
    const finalExamples = item.examples.length > 0 ? item.examples : [{
      en: `Practice using "${item.word}" in a daily context.`,
      zh: `在日常語境中練習使用「${item.word}」。`
    }];

    result.push({
      id,
      word: item.word,
      phonetic: item.phonetic || undefined,
      pos: item.pos.length > 0 ? item.pos : ['n.'],
      definition: convertToTraditionalTW(item.definition || '暫無釋義'),
      examples: finalExamples,
      category: item.category,
      level: item.level,
      toeicTier: item.toeicTier,
      tags: Array.from(tagsSet)
    });
  }

  // 依字母順序排列
  result.sort((a, b) => a.word.localeCompare(b.word));
  return result;
}

// -------------------------------------------------------------
// 5. 詞庫處理管線 (Process Raw Vocabulary)
// -------------------------------------------------------------
/**
 * 處理原始詞表：展開變體、繁體台灣化、去重合併、格式校驗
 */
export function processVocabulary(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    throw new Error('rawEntries must be an array');
  }

  const expandedList = [];

  for (const raw of rawEntries) {
    const rawWord = (raw.word || '').trim();
    if (!rawWord) continue;

    const variants = expandWordVariants(rawWord);
    if (variants.length <= 1) {
      expandedList.push({
        ...raw,
        word: variants[0] || rawWord.toLowerCase()
      });
    } else {
      // 處理括號/斜線拆分，為每個變體產出獨立詞條紀錄
      for (const v of variants) {
        // 若為 agree(ment) 特例，派生名詞詞性
        let variantPos = raw.pos;
        let variantDef = raw.definition;
        if (rawWord === 'agree(ment)') {
          if (v === 'agree') {
            variantPos = ['v.'];
            variantDef = '同意；贊同';
          } else if (v === 'agreement') {
            variantPos = ['n.'];
            variantDef = '協定；協議；同意';
          }
        } else if (rawWord === 'collect(ion)') {
          if (v === 'collect') {
            variantPos = ['v.'];
            variantDef = '收集；聚集';
          } else if (v === 'collection') {
            variantPos = ['n.'];
            variantDef = '收藏品；收集；群體';
          }
        } else if (rawWord === 'photo(graph)') {
          if (v === 'photo') {
            variantPos = ['n.'];
            variantDef = '照片；相片';
          } else if (v === 'photograph') {
            variantPos = ['n.', 'v.'];
            variantDef = '照片；為…照相';
          }
        }

        expandedList.push({
          ...raw,
          word: v,
          pos: variantPos,
          definition: variantDef
        });
      }
    }
  }

  const merged = mergeWordEntries(expandedList);

  // 嚴格校驗每個單字條目
  for (const item of merged) {
    if (!item.id || typeof item.id !== 'string') {
      throw new Error(`Invalid id for word: ${item.word}`);
    }
    if (!item.word || typeof item.word !== 'string') {
      throw new Error(`Invalid word string: ${item.word}`);
    }
    if (!Array.isArray(item.pos) || item.pos.length === 0) {
      throw new Error(`Missing pos for word: ${item.word}`);
    }
    if (!item.definition || typeof item.definition !== 'string') {
      throw new Error(`Missing definition for word: ${item.word}`);
    }
    if (!Array.isArray(item.examples) || item.examples.length === 0) {
      throw new Error(`Missing examples for word: ${item.word}`);
    }
    for (const ex of item.examples) {
      if (!ex.en || !ex.zh) {
        throw new Error(`Incomplete example for word: ${item.word}`);
      }
    }
    if (!Array.isArray(item.category) || item.category.length === 0) {
      throw new Error(`Missing category for word: ${item.word}`);
    }
    if (typeof item.level !== 'number' || item.level < 1) {
      throw new Error(`Invalid level for word: ${item.word}`);
    }
  }

  return merged;
}

// -------------------------------------------------------------
// 6. 建置詞庫檔案 (Build Dictionary & Version)
// -------------------------------------------------------------
export function buildDictionary(inputPath, outDictPath, outVersionPath) {
  console.log(`\n========================================`);
  console.log(`開始建置詞庫 (Building Vocabulary Dictionary)...`);
  console.log(`========================================`);

  let rawData;
  if (fs.existsSync(inputPath)) {
    const rawContent = fs.readFileSync(inputPath, 'utf8');
    rawData = JSON.parse(rawContent);
  } else {
    throw new Error(`Input file not found: ${inputPath}`);
  }

  console.log(`- 讀取原始單字數: ${rawData.length}`);

  const processedWords = processVocabulary(rawData);
  console.log(`- 處理後單字總數: ${processedWords.length}`);

  // 確保目標資料夾存在
  const dictDir = path.dirname(outDictPath);
  if (!fs.existsSync(dictDir)) {
    fs.mkdirSync(dictDir, { recursive: true });
  }

  // 寫入 vocabulary.json
  const jsonString = JSON.stringify(processedWords, null, 2);
  fs.writeFileSync(outDictPath, jsonString, 'utf8');
  console.log(`✓ 成功寫入詞庫檔案: ${outDictPath}`);

  // 計算 SHA-256 Checksum
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex');

  // 統計分類分佈
  let gsatCount = 0;
  let toeicCount = 0;
  let bothCount = 0;
  const levelStats = {};

  for (const w of processedWords) {
    const isGsat = w.category.includes('gsat');
    const isToeic = w.category.includes('toeic');
    if (isGsat && isToeic) bothCount++;
    if (isGsat) {
      gsatCount++;
      levelStats[w.level] = (levelStats[w.level] || 0) + 1;
    }
    if (isToeic) toeicCount++;
  }

  // 寫入 version.json
  const versionInfo = {
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    wordCount: processedWords.length,
    checksum: hash,
    stats: {
      total: processedWords.length,
      gsat: gsatCount,
      toeic: toeicCount,
      both: bothCount,
      gsatLevels: levelStats
    }
  };

  fs.writeFileSync(outVersionPath, JSON.stringify(versionInfo, null, 2), 'utf8');
  console.log(`✓ 成功寫入版本檔案: ${outVersionPath}`);
  console.log(`----------------------------------------`);
  console.log(`詞庫建置摘要 (Dictionary Summary):`);
  console.log(`- 總單字筆數: ${processedWords.length} (要求 >= 200 筆)`);
  console.log(`- 學測單字數 (GSAT): ${gsatCount}`);
  console.log(`- 多益單字數 (TOEIC): ${toeicCount}`);
  console.log(`- 雙分類單字數 (GSAT + TOEIC): ${bothCount}`);
  console.log(`- 學測各級分佈:`, levelStats);
  console.log(`- 雜湊值 (Checksum): ${hash.substring(0, 16)}...`);
  console.log(`========================================\n`);

  return { words: processedWords, version: versionInfo };
}

// -------------------------------------------------------------
// 7. CLI 直接執行入口
// -------------------------------------------------------------
const isMain = process.argv[1] && (
  fileURLToPath(import.meta.url) === process.argv[1] ||
  process.argv[1].endsWith('generate-dict.js')
);

if (isMain) {
  const rootDir = process.cwd();
  const rawPath = path.resolve(rootDir, 'scripts/raw-data-sample.json');
  const dictPath = path.resolve(rootDir, 'public/data/vocabulary.json');
  const versionPath = path.resolve(rootDir, 'public/data/version.json');

  try {
    buildDictionary(rawPath, dictPath, versionPath);
  } catch (err) {
    console.error('建置詞庫失敗 (Build dictionary failed):', err);
    process.exit(1);
  }
}
