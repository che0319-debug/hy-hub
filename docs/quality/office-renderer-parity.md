# Bot Office：沿用 AI Office 畫面（GUI 階段）

基準：hy-hub master `d4f093c`（包含 #122）。本 PR 不合併、不部署。

目標：HY 用與 AI Office 相同的首頁及五個分頁查看專案。概況唯一主要重點為「待你決定」；順序依正式 AIOfficeV1：一頁摘要、里程碑、待你決定、AI 正在做什麼、收合的 AI 執行配置。手機沿用同一斷點與橫向分頁。

## 實作

- OfficeHome 共用原元件，僅新增預設仍為 AI Office 的 title 參數。搜尋目標、摘要格、專案列、進度與更新時間使用同一套畫面。
- App 的 pilotRoute 加入 Bot Office，使用同一側欄寬度、頁邊距、手機頂欄規則；其他路由條件不變。
- bot-office.css 引用 ai-office-v1.css，移除複製樣式及綠色主題、手機分頁換行等覆寫。只保留既有 P0 逐題輸入所需樣式。
- 執行計畫沿用 AIOfficeV1 的 Execution 實作及 PlanSummary/PlanDocument；包含四模式、里程碑選取、章節定位／展開、鍵盤與拖曳調整雙欄。測試核對原函式內容一致，避免自行簡化。
- 成果頁還原版本選單、sandbox HTML 內文、完整閱讀與 Escape 離開。HTML 不插進主頁 DOM、不允許 script、不任意 fetch 外部 URL。
- 會議室恢復原版對話、輸入與團隊欄；附件外觀保留但明確停用（尚無新流程附件端點），沒有假上傳或轉用舊端點。
- 工作日誌恢復四種篩選及詳情、關聯跳轉；保留原有 HY 留言入口（收合）與舊 log 卡片，不移除資料。
- 已核准的逐題作答、Bot 建議、確認並補充、歷史、follow_ups、needs_advance 保留；歷史與後續事項收合在對應區塊，不另造新分頁。
- 使用新的唯讀視圖轉換層，不寫回 state；保留 #122 的共用資料層變更。Bot 頁不呼叫舊 AI Office／工作包 API。

## 資料與功能邊界

這是 GUI PR，**不能宣稱正式環境已達所有功能等價**。以下等待 Atlas 的正式資料或獨立後端工作；不得猜資料、回填正式答案、重建舊工作包引擎。

| 資訊 | 本版接受的顯示資料（building 上，沿原 AI Office 欄位） | 未提供時 |
| --- | --- | --- |
| 目標／階段／時間 | goal、phase、milestone_id、opened_at/started_at、updated_at | 尚未記錄／尚未提供 |
| 規劃 | plan、plan_revision、plan_state；plan.milestones、project_plan_markdown、ai_execution_plan_markdown | 原版規劃空狀態 |
| 工作明細 | packages[]：id、type、task、status、executor、milestone_id、dependencies、expected_outputs、acceptance_criteria | 數量顯示未知，不以卡片猜工作包 |
| 成果 | report.latest、report.history[]：file_id、revision、html、drive_created_at/created_at；report.summary（或從 HTML 一頁摘要區擷取）、stale | HTML 內文待提供；既有原件連結保留 |
| 審查 | quality.checkpoints[]：checkpoint_id、kind、milestone_id、round、verdict、summary/findings、report_url、target | 節點待提供；現有 last_review、review_card、required_changes、returned_count 照常顯示 |
| 事件 | 原 logs、requests、decision.history；events[] 的 id、at、actor、kind、text、detail、action、work、url | 不虛構系統事件 |
| 團隊 | 現行 owner_bot、executor、reviewer、專案 PI figures | 未指定，不從島推論 |
| 附件／刪除 | 新流程 API 尚未提供 | 停用並說明原因；不連回舊系統 |

以上是前端可接受的映射，沒有改伺服器合約或要求把 HTML 全塞進 900,000 bytes 的 state。若 Atlas 的 HTML 存在 Drive，仍需後續受授權的內文讀取介面；本 PR 不會把 Drive 預覽假稱為原版內文閱讀器。容量警示、舊 Router 的完整政策／健康紀錄也未接入新流程，不假造狀態。

開案與改派仍使用既有 office/requests，由流程處理；顯示「已送出」，不聲稱專案已建立或設定已生效。owner OAuth、owner_only、revision、CAS 及寫入金鑰未改。

## 驗證與截圖

- 單元測試 132 項、Vite build；完整 UI 回歸結果以 PR 描述最新記錄為準。
- tests/bot-office-layout-ui.cjs：同一組隔離工程資料，分別開真正 AIOfficeV1 與 Bot Office，390/1280 截圖；核對主題、頁首背景／邊框／圓角／字體／留白、main 邊距一致。驗證五分頁、雙欄、文件章節、HTML 版本與完整閱讀、script 隔離、日誌篩選、不呼叫舊 API、不寫正式資料。
- 截圖：`docs/quality/ui/office-renderer-parity/ai-*`、`bot-*`。工程 fixture 不代表 p-002 正式資料；缺資料、未接後端及已要求保留的 P0 功能造成的內容差異如上，不宣稱像素完全一致。
- 上游 #122 將專家團改成 AI 軍團；原 pi-ui-smoke 仍等待舊 heading/tab，原 base 也失敗。本 PR 更新該測試兩個標籤，並明確選桌面版在 390px 測試（避免新網址自動切成 MobileApp）；沒有修改 AI 軍團產品功能。

回退：revert 本 PR。沒有後端、排程、正式 hy-data 或 Drive 修改。
