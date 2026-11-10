# 高中生背單字 PWA「一字不漏」- 任務清單 (TASKS.md)

本文件由 2 位 PM 規劃拆分，由 6 位工程師（工程師 1 ~ 6）認領實作，並由 3 位測試工程師（測試員 1 ~ 3）驗收。

## 任務狀態說明
- 狀態格式：
  - `[待認領]`
  - `[進行中 - 認領：工程師N]`
  - `[已完成 - 待驗收]`
  - `[驗收通過 - 測試員M]`
  - `[驗收退回 - 測試員M：退回原因]`

---

## 模組一：核心架構、詞庫管線、儲存與排程基礎（PM 1 規劃）
*(由 PM 1 負責規劃 TASK-01 ~ TASK-05)*

---

## 模組二：學習練習模式、答錯複習計畫、錯題本、儀表板與 PWA 介面（PM 2 規劃）

### TASK-06: 練習核心引擎與發音服務模組
- **狀態**：`[驗收通過 - 測試員 1]`
- **負責檔案清單**：
  - `src/types/practice.ts`
  - `src/services/speech.ts`
  - `src/services/practiceEngine.ts`
  - `tests/unit/practiceEngine.spec.ts`
  - `tests/unit/speech.spec.ts`
- **具體實作規格**：
  1. `src/types/practice.ts`：定義練習模式型別（`'flashcard' | 'quiz' | 'spelling' | 'dictation'`）、練習卡片結構（`PracticeItem`：單字、音標、釋義、例句、例句翻譯、詞性、等級、標籤、答錯次數、是否頑固字）、評分等級與作答結果型別。
  2. `src/services/practiceEngine.ts`：
     - 提供 `PracticeSession` 類別或狀態機，管理當前練習卡片佇列。
     - 答錯重考排程演算法：呼叫 `handleIncorrect(item)` 時，將該項目動態插入目前題目隊列後方 3~5 張卡片處（若剩餘題目不足 3 張，則直接排入隊尾）。
     - 本次練習結束錯題清空（Clear-the-deck）：當主題目佇列完成後，自動檢查本次練習是否有答錯過的單字；若有，則啟動「錯題清空輪」，所有錯題必須在此輪全數答對才宣告練習正式完成。
     - 練習狀態查詢：提供 `progress`、`currentIndex`、`totalCount`、`incorrectItems`、`isClearedRound`、`isCompleted` 等響應式/狀態屬性。
  3. `src/services/speech.ts`：
     - 封裝 Web Speech API（`window.speechSynthesis` 與 `SpeechSynthesisUtterance`）。
     - 支援單字朗讀、語速控制（標準 1.0x、慢速 0.75x）、英音/美音偏好設定（優先選取 `en-US`、`en-GB`）。
     - 支援語音可用性偵測函式：`isSpeechSupported()` 與 `checkVoiceAvailability()`，以 Promise 處理語音非同步載入事件（`voiceschanged`）。
     - 支援取消朗讀 `stop()` 與錯誤優雅處理（當語音不可用時回退不拋出異常崩潰）。
- **驗收標準 (AC)**：
  - [x] 單元測試 `tests/unit/practiceEngine.spec.ts`：
    - 驗證「一次全對」順利推進並完成練習。
    - 驗證「答錯時動態插入後方 3~5 張」，且後續能再次抽出作答。
    - 驗證「主隊列結束後自動切入錯題清空輪」，錯題答對後才徹底結束。
    - 驗證練習統計數據（耗時、總題數、首輪答對率、錯題清單）計算準確。
  - [x] 單元測試 `tests/unit/speech.spec.ts`：
    - 模擬 `window.speechSynthesis`，驗證朗讀呼叫與參數（rate, lang, text）傳遞。
    - 模擬無語音支援環境，驗證偵測函式回傳 false 並安全降級。
  - [x] TypeScript 型別嚴格，無 `any`，測試覆蓋率達 90% 以上。

---

### TASK-07: 四種練習模式元件與練習容器
- **狀態**：`[驗收通過 - 測試員 1]`
- **負責檔案清單**：
  - `src/components/practice/FlashcardMode.vue`
  - `src/components/practice/QuizMode.vue`
  - `src/components/practice/SpellingMode.vue`
  - `src/components/practice/DictationMode.vue`
  - `src/components/practice/PracticeContainer.vue`
  - `src/views/PracticeView.vue`
  - `tests/components/FlashcardMode.spec.ts`
  - `tests/components/QuizMode.spec.ts`
  - `tests/components/SpellingMode.spec.ts`
  - `tests/components/DictationMode.spec.ts`
  - `tests/components/PracticeContainer.spec.ts`
- **具體實作規格**：
  1. `FlashcardMode.vue`（翻卡模式）：
     - 正面：顯示英文單字、音標、發音播放按鈕、例句遮罩（隱藏中文）。
     - 背面：翻轉展示中文釋義、詞性、完整例句與例句中文翻譯。
     - 四個 FSRS 評分按鈕：「忘了」(Again)、「模糊」(Hard)、「記得」(Good)、「太簡單」(Easy)，觸發評分事件傳遞給外層。
  2. `QuizMode.vue`（四選一選擇題）：
     - 題目顯示英文單字與發音按鈕。
     - 產生 4 個中文釋義選項（1 個正確答案 + 3 個取自相同等級或詞性之干擾項）。
     - 點選選項後即時高亮（正確綠色、選錯紅色並提示正解），發音並自動或手動前進下一題。
  3. `SpellingMode.vue`（拼字練習）：
     - 顯示中文釋義與詞性，提供英文輸入框，支援鍵盤 Enter 送出。
     - 提供「字首提示」或「字母數量提示」。
     - 輸入比對自動去除前後空白、不分大小寫；答錯即時顯示正確拼法、例句與強制播放發音。
  4. `DictationMode.vue`（聽寫模式）：
     - 預設遮蔽英文，自動播放單字發音，提供重聽（常速與 0.75x 慢速）按鈕。
     - 若偵測無可用語音，顯示降級提示訊息或改為輔助拼寫。
     - 輸入框檢驗拼法，答對答錯皆有視覺反饋。
  5. `PracticeContainer.vue` & `PracticeView.vue`：
     - 整合 `PracticeSession`，頂部進度條、當前題號、模式切換展示。
     - 當練習結束時，渲染「完成結算面板」（答對率、錯題摘要、回到首頁或一鍵複習錯題）。
     - Mobile-friendly：大按鈕（>= 44x44px）、流暢翻轉動畫、適應手機鍵盤彈出。
- **驗收標準 (AC)**：
  - [x] 元件測試 `FlashcardMode.spec.ts`：驗證正反面翻轉互動、四顆評分按鈕點擊觸發對應評分事件。
  - [x] 元件測試 `QuizMode.spec.ts`：驗證干擾選項渲染為 4 個、點擊正確/錯誤選項之狀態反饋與事件發射。
  - [x] 元件測試 `SpellingMode.spec.ts`：驗證輸入正解能判定通過、錯誤輸入能提示正解、提示按鈕功能。
  - [x] 元件測試 `DictationMode.spec.ts`：驗證點擊播放音訊觸發 speech 呼叫、輸入答案判定。
  - [x] 元件測試 `PracticeContainer.spec.ts`：驗證題目前進、進度條更新、練習完成面板顯示。

---

### TASK-08: 答錯複習計畫與頑固字排程管理
- **狀態**：`[驗收通過 - 測試員 2]`
- **負責檔案清單**：
  - `src/types/wrongReview.ts`
  - `src/services/wrongReviewPlan.ts`
  - `src/stores/wrongReviewStore.ts`
  - `tests/unit/wrongReviewPlan.spec.ts`
  - `tests/unit/wrongReviewStore.spec.ts`
- **具體實作規格**：
  1. `src/types/wrongReview.ts`：
     - 定義錯題追蹤資料結構 `WrongRecord`：單字 ID、初次答錯時間、累積錯誤次數（`incorrectCount`）、短間隔階段（`'day1' | 'day3' | 'graduated'`）、下次追蹤日期（`nextReviewDate`）、是否為頑固字（`isLeech`）、最後作答狀態。
  2. `src/services/wrongReviewPlan.ts`：
     - 實作完整答錯複習排程計算：
       - 當日即時重考：由練習引擎處理，當次練到全對。
       - 隔天（Day+1）短間隔追蹤：當日答錯的字排定於次日複習隊列。
       - 第 3 天（Day+3）短間隔追蹤：次日複習若答對，排入第 3 天複習；第 3 天若亦答對，則自短間隔中畢業（交回 FSRS 常規排程）。若任一階段再次答錯，重置短間隔流程。
       - 頑固字（Leech）判定規則：累積答錯次數 >= 3 次者自動標記 `isLeech = true`。
       - 頑固字特別處理策略：頑固字推薦題型限制為拼字（`spelling`）與聽寫（`dictation`），並在作答時強制配置 `showFullSentence = true`。
  3. `src/stores/wrongReviewStore.ts`：
     - Pinia Store 管理整體錯題清單與持久化至 IndexedDB。
     - Action：`recordWrongAnswer(wordId)`、`recordCorrectAnswer(wordId)`、`removeWrongRecord(wordId)`、`resetWrongRecord(wordId)`。
     - Getter：`todayFollowUpList`（今日待追蹤之 Day 1 / Day 3 錯題）、`leechList`（所有頑固字清單）、`allWrongItems`、`wrongCount`。
- **驗收標準 (AC)**：
  - [x] 單元測試 `tests/unit/wrongReviewPlan.spec.ts`：
    - 驗證單字答錯 1 次排定明天（Day+1）。
    - 驗證 Day+1 答對後排定第 3 天（Day+3）。
    - 驗證 Day+3 答對後狀態轉為畢業 (`graduated`)。
    - 驗證累積答錯次數達 3 次時，`isLeech` 自動為 `true`，且其推薦模式為拼字與聽寫。
  - [x] 單元測試 `tests/unit/wrongReviewStore.spec.ts`：
    - 驗證 store 各 actions 對狀態更新與 getter 篩選正確無誤。
    - 覆蓋率達 90% 以上。

---

### TASK-09: 錯題本頁面與針對性複習功能
- **狀態**：`[驗收通過 - 測試員 3]`
- **負責檔案清單**：
  - `src/views/NotebookView.vue`
  - `src/components/notebook/MistakeCard.vue`
  - `src/components/notebook/MistakeFilter.vue`
  - `tests/components/NotebookView.spec.ts`
  - `tests/components/MistakeCard.spec.ts`
- **具體實作規格**：
  1. `src/views/NotebookView.vue`：
     - 錯題本主頁面，頂部呈現統計看板（總錯題數、頑固字數、本週克服數）。
     - 提供「只練錯題」一鍵開始按鈕，點擊後彈出模式選擇或直接進入錯題專屬練習 Session。
     - 支援快速切換：全體錯題 / 僅頑固字。
  2. `src/components/notebook/MistakeFilter.vue`：
     - 排序方式：依答錯次數降序（預設）、依最近答錯時間、依單字字母順序。
     - 詞庫篩選：全部、高中學測（Level 1~6）、多益（入門/中階/進階）。
     - 關鍵字搜尋：即時搜尋單字英文或中文釋義。
  3. `src/components/notebook/MistakeCard.vue`：
     - 單張錯題卡片：呈現單字、音標、詞性、中文釋義。
     - 頑固字醒目標籤：累積答錯 >= 3 次顯示紅色頑固字火焰/警示徽章，並顯示答錯次數。
     - 互動操作：點擊展開例句與翻譯、內建發音按鈕、手動標記為「已克服/自錯題本移除」動作。
- **驗收標準 (AC)**：
  - [x] 元件測試 `MistakeCard.spec.ts`：
    - 驗證頑固字徽章與錯誤計數正確渲染。
    - 驗證發音點擊、展開折疊例句、移除按鈕點擊事件。
  - [x] 元件測試 `NotebookView.spec.ts`：
    - 驗證列表依錯誤次數正確排序。
    - 驗證關鍵字過濾與詞庫篩選器能正確過濾資料。
    - 驗證點擊「只練錯題」可正確彙整選中錯題跳轉至練習。

---

### TASK-10: 首頁儀表板、連續學習里程碑與防積壓警示
- **狀態**：`[驗收通過 - 測試員 1]`
- **負責檔案清單**：
  - `src/views/HomeView.vue`
  - `src/components/dashboard/ReviewCounter.vue`
  - `src/components/dashboard/StreakMilestone.vue`
  - `src/components/dashboard/BacklogAlert.vue`
  - `src/stores/dashboardStore.ts`
  - `tests/components/HomeView.spec.ts`
  - `tests/components/StreakMilestone.spec.ts`
  - `tests/components/BacklogAlert.spec.ts`
- **具體實作規格**：
  1. `src/stores/dashboardStore.ts`：
     - 管理每日學習進度數據：今日已複習數、今日待複習數、今日新學字數、每日新字上限（預設 20 個，支援使用者自訂）。
     - 連續學習天數（Streak）計算邏輯：檢查最後學習日期，連續天數累加；若相隔超過 1 天未學習則重設為 1。
     - 防積壓狀態評估：當待複習數大於閾值（預設 50 個）時，標記為 `isBacklogged = true`。
  2. `src/components/dashboard/ReviewCounter.vue`：
     - 視覺化圓環或進度條：展示今日複習進度、新字進度。
     - 標註今日新字預設上限（20 個），並提示「錯題複習不占新字額度」。
  3. `src/components/dashboard/StreakMilestone.vue`：
     - 醒目顯示目前連續打卡天數（例如：🔥 連續 23 天）。
     - 每連續 10 天達成一個里程碑（10 天、20 天、30 天等），展示解鎖勳章與恭賀文案。
  4. `src/components/dashboard/BacklogAlert.vue`：
     - 當待複習單字過多（> 50）時觸發警示橫幅。
     - 警示文案：「今日待複習單字較多，建議先暫停新字，專注清空複習，避免積壓！」
     - 提供「暫停今日新字」快速按鈕（點擊後將今日新字上限臨時設定為 0）。
  5. `src/views/HomeView.vue`：
     - 彙整各儀表板組件，提供「開始今日複習」、「學習今日新字」、「錯題快速複習」三大入口按鈕。
- **驗收標準 (AC)**：
  - [x] 元件測試 `StreakMilestone.spec.ts`：驗證連續天數渲染、每 10 天里程碑徽章與文案正確激勵展示。
  - [x] 元件測試 `BacklogAlert.spec.ts`：
    - 待複習字數 <= 50 時不顯示；> 50 時顯示防積壓警示。
    - 點擊「暫停今日新字」按鈕能正確調用 store 動作調整新字配額。
  - [x] 元件測試 `HomeView.spec.ts`：驗證各學習入口按鈕能正常觸發導覽或啟動練習。

---

### TASK-11: PWA 安裝引導、離線狀態提示與全站手機版面體驗
- **狀態**：`[驗收通過 - 測試員 3]`
- **負責檔案清單**：
  - `src/components/layout/AppShell.vue`
  - `src/components/layout/BottomNav.vue`
  - `src/components/pwa/InstallPromptModal.vue`
  - `src/components/pwa/OfflineBanner.vue`
  - `src/composables/usePwaInstall.ts`
  - `src/composables/useNetworkStatus.ts`
  - `tests/composables/usePwaInstall.spec.ts`
  - `tests/components/BottomNav.spec.ts`
  - `tests/components/InstallPromptModal.spec.ts`
- **具體實作規格**：
  1. `src/components/layout/AppShell.vue` & `BottomNav.vue`：
     - Mobile-first 全站版面骨架，支援 iPhone 與 Android 手機螢幕適配（CSS `env(safe-area-inset-*)` 邊距安全區）。
     - 底部導航欄（Bottom Navigation）：首頁（Dashboard）、練習（Practice）、錯題本（Notebook）、設定/備份（Settings），觸控熱區 >= 48px，清晰視覺圖示與啟用狀態切換。
  2. `src/composables/usePwaInstall.ts` & `InstallPromptModal.vue`：
     - 平台環境偵測：偵測是否為獨立視窗模式（`display-mode: standalone` 或 `navigator.standalone`）、是否為 iOS Safari、是否為 Android / Chrome。
     - Android 支援：監聽 `beforeinstallprompt` 事件並快取 `deferredPrompt`；在首頁或橫幅提供「安裝 App」按鈕，點擊觸發原生安裝對話框並記錄安裝結果。
     - iOS 支援：偵測到 iOS Safari 且非 standalone 模式時，主動引導點擊彈出「加到主畫面教學」（含圖文指示：1. 點擊 Safari 底部分享圖示 2. 向上滑動並選取「加入主畫面」）。
     - 儲存「已略過」狀態至 localStorage，避免頻繁打擾學生。
  3. `src/composables/useNetworkStatus.ts` & `OfflineBanner.vue`：
     - 即時監聽網路連線狀態（`online` / `offline` 事件）。
     - 離線時頂部顯示微型溫馨橫幅：「離線模式中，詞庫與學習功能完全正常運作」。
     - 語音離線檢測：結合 Web Speech 狀態，若離線且裝置缺乏本機英語語音套件時，友善提示「目前離線，裝置無內建英文語音，發音功能可能受限」。
- **驗收標準 (AC)**：
  - [x] 單元測試 `tests/composables/usePwaInstall.spec.ts`：
    - 驗證 `beforeinstallprompt` 事件捕捉、prompt 觸發與安裝狀態判定。
    - 驗證 iOS 裝置辨識與非 standalone 狀態判定。
  - [x] 元件測試 `BottomNav.spec.ts`：驗證四個導覽頁籤之高亮與路由跳轉事件。
  - [x] 元件測試 `InstallPromptModal.spec.ts`：驗證 Android 與 iOS 分別渲染專屬安裝教學內容，關閉後持久化記錄。
  - [x] 在 375px（iPhone SE）至 430px（iPhone Pro Max）視窗下，導航與彈窗排版無溢出。


### 第一部分：核心架構、資料與排程演算法（PM 1 規劃）

---

### [TASK-01] 專案基礎架構、TypeScript / Vite / Vitest 配置與 PWA 離線配置
- **任務狀態**: `[驗收通過 - 測試員 2]`
- **負責檔案清單**:
  - `vite.config.ts`
  - `tsconfig.json`
  - `tsconfig.node.json`
  - `index.html`
  - `src/main.ts`
  - `src/App.vue`
  - `src/vite-env.d.ts`
  - `src/pwa.ts`
  - `public/manifest.webmanifest`
  - `tests/pwa.test.ts`
- **實作規格**:
  1. **建置與開發環境配置**:
     - 設定 `vite.config.ts`，整合 `@vitejs/plugin-vue` 與 `vite-plugin-pwa`。
     - 配置路徑別名 `@` 指向 `./src`。
     - 配置 `vitest` 測試環境（採用 `happy-dom`），支援單元測試執行。
     - 建立標準 `tsconfig.json` 與 `tsconfig.node.json`，開啟嚴格型別檢查 (`strict: true`)。
  2. **PWA & Workbox 快取配置**:
     - `vite-plugin-pwa` 採用 `registerType: 'autoUpdate'` 或提供自定義更新通知機制。
     - 快取規則：預先快取 (Precache) 靜態資產（包含 `.html`, `.js`, `.css`, `.svg`, `.png`, `.ico` 以及詞庫靜態目錄 `/data/*.json`）。
     - 設定 Web App Manifest 屬性：
       - `name`: 「一字不漏 - 高中生背單字 PWA」
       - `short_name`: 「一字不漏」
       - `description`: 「高中學測與多益單字間隔複習 PWA，完全離線使用」
       - `theme_color`: `#2563eb`
       - `background_color`: `#ffffff`
       - `display`: `standalone`
       - `start_url`: `/`
  3. **PWA 控制模組 (`src/pwa.ts`)**:
     - 封裝 `registerSW`，提供 Service Worker 註冊、更新偵測與狀態回呼 (`needRefresh`, `offlineReady`)。
  4. **入口與主畫面骨架 (`index.html`, `src/main.ts`, `src/App.vue`)**:
     - `index.html` 設置適合行動裝置的 viewport (`width=device-width, initial-scale=1.0, viewport-fit=cover`) 與 iOS PWA meta 標籤 (`apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`)。
     - `src/main.ts` 初始化 Vue 與 Pinia，並掛載至 `#app`。
     - `src/App.vue` 提供基礎全螢幕響應式容器骨架與更新提示懸浮列 (Toast/Banner) 預留插槽。
- **驗收標準 (AC)**:
  1. 執行 `npm run build` 成功：`vue-tsc` 型別檢查通過，Vite 成功產出 `dist/`，包含 `sw.js`、`workbox-*.js` 及 `manifest.webmanifest`。
  2. 執行 `npm run test` 可順利啟動 Vitest。
  3. `tests/pwa.test.ts` 驗證 PWA 設定參數與 `src/pwa.ts` 更新邏輯函式正常運作。

---

### [TASK-02] 詞庫資料規格、建置處理腳本與靜態詞庫 JSON 產出
- **任務狀態**: `[驗收通過 - 測試員 2]`
- **負責檔案清單**:
  - `src/types/word.ts`
  - `scripts/generate-dict.js`
  - `scripts/raw-data-sample.json`
  - `public/data/vocabulary.json`
  - `public/data/version.json`
  - `src/services/dictService.ts`
  - `tests/dict-generator.test.ts`
- **實作規格**:
  1. **型別定義 (`src/types/word.ts`)**:
     - 定義 `WordItem`：
       - `id: string`（唯一且跨版本固定之識別碼，如 `w_abandon_001` 或標準化 slug，確保更新詞庫不破壞使用者的本機學習進度）
       - `word: string`（英文單字，統一小寫與清理空白）
       - `phonetic?: string`（KK/IPA 音標）
       - `pos: string[]`（詞性陣列，例如 `['v.', 'n.']`）
       - `definition: string`（繁體中文釋義，採用台灣常用翻譯語境）
       - `examples: Array<{ en: string; zh: string }>`（至少 1 組實用例句及中譯）
       - `category: ('gsat' | 'toeic')[]`（詞庫類別：學測、多益，或同時兼具）
       - `level: number`（學測對應 Level 1~6；多益對應 1=入門、2=中階、3=進階）
       - `toeicTier?: 'entry' | 'intermediate' | 'advanced'`
       - `tags: string[]`（標籤清單，如 `["學測Level 1", "多益入門"]`）
  2. **建置處理腳本 (`scripts/generate-dict.js`)**:
     - 支援讀取原始詞表清單，處理合併寫法（例如 `agree(ment)` 拆分、`bicycle/bike` 拆開正規化）。
     - 去重與分類合併：同一單字同時出現在學測與多益時，必須合併為單一詞條紀錄，`category` 包含 `gsat` 與 `toeic`，保證單一 `id`。
     - 簡體釋義轉為繁體台灣慣用語（包含常見名詞轉換）。
     - 產出標準且合法之 `public/data/vocabulary.json`（包含高品質種子單字庫，至少 200 筆以上完整欄位資料，涵蓋學測 L1~L6 與多益入門至進階）及 `public/data/version.json`（包含版本號與更新雜湊/日期）。
  3. **詞庫存取服務 (`src/services/dictService.ts`)**:
     - `loadVocabulary(): Promise<WordItem[]>`：非同步抓取或快取載入詞庫 JSON。
     - 提供單字查詢索引（依 ID、依分類 `category`、依等級 `level` 篩選）。
- **驗收標準 (AC)**:
  1. 執行 `npm run generate-dict` 順利產出符合規格之 `public/data/vocabulary.json` 與 `public/data/version.json`，且 JSON 格式有效無語法錯誤。
  2. 所有輸出的單字物件均具有非空且固定的 `id`、`word`、`pos`、`definition`、`examples`、`category`、`level`。
  3. 重複單字正確合併為單一筆並標註雙 category，不會產生重疊或重複 ID。
  4. `tests/dict-generator.test.ts` 單元測試覆蓋括號拆分、去重合併、繁轉簡繁防呆及結構校驗。

---

### [TASK-03] Dexie.js 本機資料庫（IndexedDB）與 Pinia 學習狀態 Store
- **任務狀態**: `[驗收通過 - 測試員 3]`
- **負責檔案清單**:
  - `src/db/index.ts`
  - `src/db/types.ts`
  - `src/stores/useStudyStore.ts`
  - `src/stores/useSettingsStore.ts`
  - `tests/db.test.ts`
  - `tests/stores.test.ts`
- **實作規格**:
  1. **Dexie 資料庫架構 (`src/db/index.ts`, `src/db/types.ts`)**:
     - 資料庫名稱：`yizi_bulou_db`。
     - 資料表 `progress` (單字學習進度)：
       - 欄位：`wordId` (主鍵), `due` (下次複習時間), `stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `reps` (複習次數), `lapses` (答錯次數), `state` (FSRS狀態), `lastReview` (上次複習時間), `isDifficult` (頑固字標記, boolean)。
       - 複合/單一索引：`&wordId, due, state, lapses, isDifficult, lastReview`。
     - 資料表 `reviewLogs` (複習歷史紀錄)：
       - 欄位：`id` (自增主鍵), `wordId`, `rating`, `state`, `due`, `stability`, `difficulty`, `reviewedAt`。
       - 索引：`++id, wordId, reviewedAt, rating`。
     - 資料表 `mistakes` (答錯專屬計畫追蹤表)：
       - 欄位：`wordId` (主鍵), `streakMistakes` (連續錯題次數), `stage` (1: 當日補救, 2: 隔天, 3: 第3天, 4: 頑固字), `nextTrackDate`。
       - 索引：`&wordId, stage, nextTrackDate`。
     - 資料表 `dailyStats` (每日學習里程碑統計)：
       - 欄位：`date` (主鍵, YYYY-MM-DD), `newWordsCount`, `reviewsCount`, `streakDays`, `completed`。
  2. **學習進度 Store (`src/stores/useStudyStore.ts`)**:
     - 響應式狀態：`todayDueWordIds: string[]`, `todayNewWordIds: string[]`, `mistakeWordIds: string[]`, `isLoaded: boolean`。
     - Actions：
       - `loadStudySession(filter: { category: string; level: number; newLimit: number; reviewLimit: number }): Promise<void>`。
       - `recordWordReview(wordId: string, rating: number, isMistakeReview?: boolean): Promise<void>`。
       - `getWordProgress(wordId: string): Promise<WordProgress | undefined>`。
       - `getMistakeList(): Promise<WordProgress[]>`。
  3. **使用者設定 Store (`src/stores/useSettingsStore.ts`)**:
     - 響應式狀態與持久化（結合 localStorage）：`dailyNewWords: number` (預設 20), `dailyReviewLimit: number` (預設 100), `ttsRate: number` (預設 1.0), `activeCategory: 'gsat' | 'toeic'`, `activeLevel: number`, `lastBackupDate: string | null`。
- **驗收標準 (AC)**:
  1. `tests/db.test.ts`：Dexie 資料庫在記憶體/測試環境中可完成 CRUD 操作，包含依 `due` 查詢待複習清單、依 `isDifficult` 查詢頑固字。
  2. `tests/stores.test.ts`：Pinia store 初始化成功、狀態正確載入、複習結果能正確寫入 Dexie 並即時更新響應式狀態。
  3. 完全不依賴網路後端，離線環境所有資料讀寫皆保證原子性與即時性。

---

### [TASK-04] FSRS 間隔複習排程演算法整合與練習隊列排程服務
- **任務狀態**: `[驗收通過 - 測試員 3]`
- **負責檔案清單**:
  - `src/types/fsrs.ts`
  - `src/services/fsrsService.ts`
  - `src/services/scheduler.ts`
  - `tests/fsrs.test.ts`
  - `tests/scheduler.test.ts`
- **實作規格**:
  1. **FSRS 演算法封裝 (`src/services/fsrsService.ts`, `src/types/fsrs.ts`)**:
     - 引入 `ts-fsrs` 模組，定義標準評分對應：
       - Rating 1: Again (忘了)
       - Rating 2: Hard (模糊)
       - Rating 3: Good (記得)
       - Rating 4: Easy (太簡單)
       - 選擇/拼字/聽寫測驗：答對對應 Rating 3 (Good)，答錯對應 Rating 1 (Again)。
     - 提供卡片初始化函式 `createNewCard(wordId: string): FSRSCard`。
     - 提供核心推進函式 `scheduleNextReview(card: FSRSCard, rating: Rating, reviewDate?: Date): { card: FSRSCard; log: FSRSRecordLog }`。
     - 處理中斷多天後才複習（拖延複習）的 FSRS 間隔計算，確保間隔合理且不產生無效日期或 NaN。
  2. **練習隊列排程服務 (`src/services/scheduler.ts`)**:
     - `generateDailyQueue(...)`：整合今日排程：
       - 先排逾期複習單字（已到期或過去未複習的單字，上限受 `reviewLimit` 約束）。
       - 依序排入當日新字（最多不超過 `dailyNewWords`，預設 20）。
     - **答錯即時插隊機制 (當日補救隊列)**：
       - 當使用者在複習或測驗中答錯 (`Rating.Again`)，調用 `insertRetryWord(currentQueue, currentIndex, wordId)`：
       - 將該單字動態插入「目前位置之後 3 ~ 5 張卡」的隨機/固定偏移位置，使學生在短時間內再次被考驗。
       - 本輪練習結束前，必須反覆清理錯題隊列，直到所有單字全數過關才標記練習完成。
     - **錯題升級追蹤 (頑固字規則)**：
       - 當一單字累計答錯次數 (`lapses`) 或單日重複錯題達 3 次以上，觸發頑固字標記 (`isDifficult = true`)，隔天與第 3 天強制加入追蹤隊列。
- **驗收標準 (AC)**:
  1. `tests/fsrs.test.ts`：測試新卡片經 4 種不同 Rating 評分後之 `due`、`stability`、`difficulty`、`state` 計算正確；測試拖延複習 30 天情境，排程結果數值穩健。
  2. `tests/scheduler.test.ts`：
     - 驗證每日新字量嚴格遵守 `dailyNewWords` 上限。
     - 驗證答錯插隊演算法：在練習序列中答錯某字，該字確實出現在接下來第 3~5 張之間。
     - 驗證頑固字邏輯：連續答錯 3 次正確升級為頑固字。

---

### [TASK-05] 備份匯出／匯入、資料完整性驗證與瀏覽器持久儲存 (Storage Persistence)
- **任務狀態**: `[驗收通過 - 測試員 1]`
- **負責檔案清單**:
  - `src/types/backup.ts`
  - `src/services/backupService.ts`
  - `src/services/storageService.ts`
  - `tests/backup.test.ts`
  - `tests/storage.test.ts`
- **實作規格**:
  1. **備份格式規格 (`src/types/backup.ts`)**:
     - 定義備份結構 `BackupPayload`：
       - `app: 'yizi-bulou'`
       - `version: '1.0.0'`
       - `exportedAt: string` (ISO 8601)
       - `payload`: 包含 `progress` 清單、`mistakes` 清單、`dailyStats` 紀錄以及使用者偏好 `settings`。
       - `checksum: string`（簡單校驗雜湊，確保檔案內容未被意外截斷）。
  2. **備份匯出與匯入服務 (`src/services/backupService.ts`)**:
     - `exportToJson(): Promise<string>`：從 Dexie 與 localStorage 擷取所有進度，產出格式化 JSON 字串。
     - `triggerDownload(jsonContent: string, filename?: string): void`：觸發瀏覽器下載備份檔案（命名例如：`yizi-bulou-backup-YYYYMMDD.json`）。
     - `validateBackup(rawJson: string): { valid: boolean; message?: string; data?: BackupPayload }`：防呆校驗，檢查必要欄位、版本號與資料完整性。
     - `importFromJson(rawJson: string, mode: 'overwrite' | 'merge'): Promise<{ success: boolean; importedCount: number }>`：
       - `overwrite`：清空現有進度表後完整還原。
       - `merge`：依單字 ID 比對，若兩邊皆有紀錄，以 `lastReview` 時間較新者優先保留。
     - 提供「每週備份提醒」狀態判斷函式 `shouldRemindBackup(lastBackupDate: string | null): boolean`（距離上次備份 > 7 天回傳 `true`）。
  3. **持久儲存與環境檢測 (`src/services/storageService.ts`)**:
     - 封裝 `requestPersistentStorage(): Promise<boolean>`：調用 `navigator.storage.persist()` 請求持久儲存，並調用 `navigator.storage.persisted()` 確認狀態。
     - 封裝 `getStorageQuota(): Promise<{ usedBytes: number; quotaBytes: number; percentUsed: number } | null>`：提供目前儲存容量估算。
     - 封裝 `detectPlatform(): { isIOS: boolean; isAndroid: boolean; isStandalone: boolean }`：判斷當前作業系統與是否已「加入主畫面 (PWA Standalone)」。
- **驗收標準 (AC)**:
  1. `tests/backup.test.ts`：
     - 匯出之 JSON 經 `importFromJson` 還原後，資料庫進度完全一致 (Round-trip 測試通過)。
     - 匯入格式錯誤、缺少必要欄位或非本 App 備份檔時，優雅拒絕並回傳清晰錯誤訊息，不破壞既有資料。
     - `merge` 模式下正確比對時間戳並保留最新進度。
  2. `tests/storage.test.ts`：
     - 單元測試在 Mock `navigator.storage` 環境下，驗證請求持久儲存、容量計算與平台偵測邏輯。
     - 當瀏覽器不支援 `navigator.storage.persist` 時能安全降級，不拋出未捕獲例外。

---




