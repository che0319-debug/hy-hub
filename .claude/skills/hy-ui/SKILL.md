---
name: hy-ui
description: HY Life OS 的 UI 設計與實作流程（風格 A）。在 hy-hub 新增或修改任何畫面、看板、分頁、卡片、樣式或文案之前使用。
---

# HY Life OS UI（風格 A）

HY 在 2026-10-03 定案「風格 A」：明亮、清楚、資訊一眼看懂。HY 主要用手機看，最在意「哪些事要我處理」。
你的工作不是發揮創意換風格，而是**把畫面做得跟風格 A 一致、乾淨、好讀**。

## 依據（先打開看）

1. `public/hy-ui/hy-ui.css` — 唯一的 token 與元件來源。
2. `public/hy-ui/examples/research.html`、`public/hy-ui/examples/board.html` — 標準範例。
3. `docs/ui/*.png` — 範例的手機／桌面截圖，你的成品要和它們放在一起看起來是同一套。

## 流程（每次都照做）

### 1. 先規劃，不要直接寫

用幾行文字寫下（放進 PR 說明）：
- 這個畫面的**主要工作**是什麼？HY 打開它最想知道哪一件事？
- 這一頁的**唯一重點**是哪個元素（用 `.hy-card.is-focus` 或頁首摘要呈現）？
- 用到哪些既有元件；若真的需要新元件，理由是什麼。
- 手機版的排列順序（需要 HY 處理的東西排最前）。
- 簡單 ASCII 線框（桌面與手機各一）。

### 2. 只用既有的元件與 token

| 需要 | 用這個 |
|---|---|
| 頁首 | `.hy-header` + `.hy-badge` + `.hy-header-actions` |
| 分頁 | `.hy-tabs` > `.hy-tab[aria-current=page]` |
| 頁面標題列 | `.hy-pagehead` > `.hy-title` + `.hy-lede`／`.hy-summary` |
| 卡片 | `.hy-card`、`.hy-card-head`、`.hy-card-title` |
| 唯一重點 | `.hy-card.is-focus`（一頁最多一張） |
| 待 HY 處理 | `.hy-card.needs-you`、`.hy-pill[data-s=you]`、`.hy-alert` |
| 狀態 | `.hy-pill[data-s=wait|ai|you|done|bad]` |
| 欄位列表 | `dl.hy-kv` |
| 看板 | `.hy-board` > `.hy-col`（待你確認的欄加 `.is-needs-you`） |
| 雙欄 | `.hy-split`（2:1，手機變單欄） |
| 連結清單 | `.hy-list` |
| 按鈕 | `.hy-btn`、`.is-primary`、`.is-danger` |
| 空狀態 | `.hy-empty`（寫清楚下一步要做什麼） |

禁止：新增顏色、漸層、陰影堆疊、新字體、全大寫標籤、裝飾性 emoji（分頁標題的一個 emoji 除外）、每張卡片都加動畫。
顏色只能用 `var(--hy-*)`；不要寫死色碼。

### 3. 文案

- 繁體中文、短句、先說結論。用 HY 的說法（「待你確認」「AI 執行中」「逾期」），不要系統用語（「pending」「webhook」）。
- 按鈕寫動作，且整個流程同一個詞（按「核准並部署」→ 結果顯示「已部署」）。
- 錯誤說清楚發生什麼、怎麼處理；空狀態告訴 HY 下一步。
- 沒有真實資料就寫「待補」，不要編造內容。

### 4. 截圖自評（至少一輪修正）

1. 用 Playwright/Chromium 開啟畫面，截手機 390px 與桌面 1280px（全頁）。
2. 和 `docs/ui/` 的範例並排看，逐項檢查：
   - [ ] 一眼看得出這頁的重點與「待你確認」的東西
   - [ ] 只用五種狀態色，意義正確
   - [ ] 字級只有四階，沒有擠在一起或斷行難看
   - [ ] 手機版沒有橫向捲動、按鈕 ≥ 44px、重要的排前面
   - [ ] 間距一致（卡片間 16px、卡片內 16–24px）
   - [ ] 空資料、載入中、錯誤三種狀態都有處理
3. 找到問題就改，再截一次。把**最後**的截圖用 `package_code_create_artifact` 上傳並放進交件結果。
4. PR 說明附上：規劃、改了什麼、自評清單結果。

## 改版舊看板時

- 舊的 `public/*-dashboard.html` 有自己的 `:root` 變數（`--brand-color`、`--bg` 等）。改版時引用 `hy-ui/hy-ui.css`，逐步把舊 class 換成 `.hy-*`，**功能與資料流不變**（API 呼叫、儲存、拖拉排序都要保留）。
- 一次改一個看板，PR 小一點比較好審。
