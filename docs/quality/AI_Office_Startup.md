# AI Office 新專案三引擎啟動 UI

依賴後端 Three Engine Startup PR。AI Office 首頁仍為單行摘要與一案一列，專案內頁仍為既定五頁；只替換新案表單並在概況顯示精簡啟動確認。外部頁面原有 NewProject 流程保持不變。

1. 新案表單讀 `/api/ai-office/startup-options`，手動選已發布且可用 PI；顯示版本及 Expert/Skill hash。讀取失敗、空 Registry、未選版本時不能建立，提供重試，沒有快取／預設假配置。
2. `/api/ai-office/projects` 建立固定正式版本與 Quality OWNER_ONLY 待核准事項。前端使用同一 project UUID 重試，後端原子及 idempotency 防重建；不送 Project Status/Phase/Milestone，不自動核准、不建立獨立派工或 Skill 系統。
3. 概況显示等待 HY、配置完成但待實戰、或 pin 錯誤；原始 Quality 核准事項可直接进入 PI 會議室，由既有 Inbox/resolve 處理。拒絕後 owner 可用原 enable-request 重新提出。顯示「執行端可用性尚未驗證」，不偽裝在線、不宣稱正式驗收。
4. API 未部署時阻止新案，不降級到 legacy 建案。舊專案不自動綁定或啟用 Quality；唯讀查詢無改寫。發布／實際執行／正式驗收依舊分開。

驗證：43個既有前端單元測試、production build、新增 startup desktop/mobile (1280/390) UI 測試，以及既有 AI Office 五頁／PI／Module Registry UI 回歸。測試檔 `tests/ai-office-startup-ui.cjs` 已納入 pi-phase-ui CI；只使用隔離 fixtures。`docs/quality/ui/ai-office-startup/create-*.png` 是工程預覽，不是正式專案資料或驗收證据。

本次不合併、不部署，不建立正式驗證案。后端先部署，前端再上线；下一步另驗證訂閱 GPT Chat 與 Claude 的 MCP 實際認領、計畫雙文件、PI 內審、Quality 三節點及 Drive 讀回，HY 仍保留正式核准權。
