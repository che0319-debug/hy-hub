# Bot Office v0：只讀 Office 快照

依 HY 2026-10-24 最終裁定，Bot Office 與第二大腦圖書館分開。本頁只讀 `/api/office/state`、`/api/office/index`；既有 Brain 唯讀 API、舊 AI Office 與其資料層保留。後端相依 PR：che0319-debug/hy-agent-v2 #203，前端可先以明確的 404 空狀態運作。

## 呈現規劃

主要工作是查看專案進度，唯一優先區塊是 open decisions。沿用 AIOfficeV1 專案列表與五分頁排列，複製 CSS 並限定於新頁；使用現有 hy-ui token、字級、狀態色、44px 操作高度。新頁沒有可用的寫入操作。

| 畫面 | 排列 |
|---|---|
| 首頁 | 真實／示範 → 更新時間與警示 → 待 HY 決定 → 摘要 → 篩選與專案列表 |
| 專案 | 標題／階段／executor → 五分頁 → 卡片摘要與 Drive 原件 |
| 手機 | 同順序，卡片單欄、摘要兩欄、分頁換行，避免橫向捲動 |

## 契約與範圍

欄位對照集中於 src/botOfficeData.js。依 Drive 的專案卡／工作卡 v0：cards.project 對應 buildings.id；meeting、execution、output、log、decision 分別進五頁。七個 stage 值沿用 v0，done／returned 屬同一個完成或退回篩選。只顯示 decisions.status=open；ref 可指專案 ID 或其卡片 ID。新增的 schema_version、generated_by、opened_at、last_review 等欄位容忍但不呈現。卡片只顯示 summary、drive_url，不讀取完整內文，不啟動 F2。

契約來源（只讀）：
- 專案卡：https://drive.google.com/file/d/1u53MdCERgZywVyxQwHDs8qp7CnZxupxg/view
- 工作卡：https://drive.google.com/file/d/1BbWcRpZCelrMCah1hj56EDac8ELgzU72/view

舊檔僅 src/main.jsx（import／route，並讓手機可直接進入此路由）與 src/layout/Sidebar.jsx（新增導覽項）。未改 App、舊頁、API helper、樣式原件、workflow 或排程。App 原有登入與 dispatch-sessions 請求仍照常；新頁自己的資料來源只有兩個 Office GET。示範資料完全在本機記憶體，不混入真實資料、不寫正式資料。

## 預覽與驗證

安裝依賴後 `npm run dev -- --host 127.0.0.1`，開啟 `/#/bot-office`。登入沿用現有方式；未部署後端 F 或尚未有快照時顯示「尚無資料」，可自行切換「示範」。不提供繞過驗證的正式模式。

- `node --test tests/*.test.mjs`：106 passed，含新增 8 項資料層測試。
- `npm run build`：通過，原有大 chunk 警告未擴大處理。
- `node tests/bot-office-ui.cjs`：隔離 mock 驗證桌面 1280、手機 390、五頁、示範、401／404／stale、30 秒刷新、沒有 Office 寫入、無溢出與 pageerror。需自行安裝 Playwright、Chromium、@fontsource/noto-sans-tc；可用 CHROME_BIN 指定瀏覽器。沒有修改依賴清單或 CI。
- `node tests/ai-office-ui.cjs`：舊 AI Office 桌面／手機完整回歸通過（全部 API mock）。
- 手動讀圖自評：列表／決策優先順序清楚；五頁對應正確；手機單欄無溢出，沿用 44px 控件；補齊測試機中文字型後重新截圖。沒有新增色彩或寫入入口。

截圖均為工程 fixture，非真實專案：ui/bot-office/desktop.png、mobile.png、empty.png、unauthorized.png、stale.png、demo.png、tab-0.png 至 tab-4.png。qa-results.json 記錄各情境的 API 方法與路徑。

PR 不合併、不部署、不改 hy-data 或金鑰。回退：revert 本 PR。F2、C、D、Atlas 巡視與觀察期皆不在本次範圍。Claude 獨立審查後仍須 HY 本人授權合併。
