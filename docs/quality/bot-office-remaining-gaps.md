# Bot Office 剩餘缺口（對照 69 列）

基準是 master `9f92061`（已含 #125、#126、#124、#123）。「master 狀態」與「證據」都指這個分支起點，行號是當時檔案。本 PR 只補 Bot Office 前端；不重做已經完成的列，不連回 `/api/ai-office` 或 `/api/ai-work-packages`，不假造資料。

| 列號 | master 狀態 | 證據 | 本 PR 處理／需後端／需 HY |
| --- | --- | --- | --- |
| H1 | 已完成 | src/pages/BotOffice.jsx:58 | 不重做。首頁仍用 OfficeHome 列專案 |
| H2 | 已完成 | src/pages/BotOffice.jsx:58；src/pages/OfficeHome.jsx:31 | 不重做 |
| H3 | 已完成 | src/lib/botOfficeView.mjs:7；src/pages/BotOffice.jsx:61 | 不重做。有 goal 才顯示，沒有就「目標尚未記錄」 |
| H4 | 部分 | src/pages/BotOffice.jsx:61、66 | 本 PR：`building.milestones[]` 的第一個未完成項當目前里程碑。沒有里程碑時沿用既有 `milestone_id` |
| H5 | 已完成 | src/pages/OfficeHome.jsx:32 | 顯示不重做。p-001 的 owner_bot 仍空，需 HY，不代填 |
| H6 | 未完成 | src/pages/OfficeHome.jsx:33；src/pages/BotOffice.jsx:61 | 本 PR：首頁與頁首改「里程碑 x／y」。沒有里程碑顯示「里程碑尚未提供」或「尚未提供」 |
| H7 | 已完成 | src/botOfficeData.js:8–9、81–82；src/pages/BotOffice.jsx:61 | 不重做 |
| H8 | 已完成 | src/lib/botOfficeView.mjs:2 | 不重做。ISO 與 epoch 都可轉 |
| H9 | 已完成 | src/pages/OfficeHome.jsx:9、19 | 不重做 |
| H10 | 未完成 | src/pages/OfficeHome.jsx:19 | 本 PR：Bot Office 摘要格改「執行中專案」，只數 `stage===running`。AI Office 預設標籤與計數不變 |
| H11 | 已完成 | src/pages/OfficeHome.jsx:19 | 不重做 |
| H12 | 已完成 | src/pages/OfficeHome.jsx:15–16 | 不重做 |
| H13 | 已完成 | src/components/OfficeActions.jsx:20 | 不重做。送出後仍是請求，不是即時建案 |
| H14 | 未完成 | src/pages/OfficeHome.jsx:21；src/pages/BotOffice.jsx:58 | 本 PR：Bot Office 隱藏「執行者與模型」。AI Office 預設仍顯示 |
| H15 | 已完成 | src/pages/BotOffice.jsx 無 CapacityBanner | 不重做，也不接舊容量 API |
| H16 | 已完成 | src/pages/BotOffice.jsx 無 registry | 不重做 |
| P1 | 已完成 | src/pages/BotOffice.jsx:61 | 不重做 |
| P2 | 未完成 | src/pages/BotOffice.jsx:61 | 本 PR：頁首類型改顯示島別，沒有島就「未分區」 |
| P3 | 已完成 | src/pages/BotOffice.jsx:61 | 不重做 |
| P4 | 已完成 | src/pages/BotOffice.jsx:62 | 不重做。規格變更仍走 office requests |
| P5 | 未完成 | src/pages/BotOffice.jsx:61 | 本 PR：沿用 DeleteZone 的按鈕、確認面板、輸入名稱、執行中不可刪、取消／永久刪除。只在 token `sub==="hy"` 顯示；其他人看到「刪除專案僅限 HY 本人」。呼叫 `POST /api/office/projects/{id}/delete`。錯誤 `drive_write_unavailable`、`archive_folder_not_configured`、`project_running`、名稱不符翻成中文。成功後重載並回首頁。端點本身由另一個 PR 提供；404／503／斷線只顯示原因 |
| P6 | 已完成 | src/pages/BotOffice.jsx:61 | 不重做 |
| P7 | 未完成 | src/pages/BotOffice.jsx:61 | 需 HY。p-001 的目標、負責 Bot、資料夾都不代填、不新建資料夾 |
| P8 | 部分 | src/pages/BotOffice.jsx:66 | 本 PR：同 H4。時間軸用里程碑名稱與狀態，不再用工作包完成數冒充 |
| P9 | 未完成 | src/pages/BotOffice.jsx:61 | 本 PR：同 H6 |
| P10 | 已完成 | src/lib/botOfficeView.mjs:2；src/pages/BotOffice.jsx:61 | 不重做 |
| P11 | 已完成 | src/pages/BotOffice.jsx:61 | 不重做。沒有 `drive_folder_url` 就不顯示連結 |
| P12 | 部分 | src/pages/BotOffice.jsx:62、68 | 本 PR：拿掉 ReviewBlockers。有未完成 follow_ups 才顯示「執行前待辦」，不再稱系統阻塞 |
| P13 | 已完成 | src/pages/BotOffice.jsx:63 | 不重做 |
| O1 | 部分 | src/components/BotOfficePanels.jsx:13–25 | 本 PR：概況改解析報告 HTML「一頁摘要」，加 ReportStrip。沒有報告顯示「這個專案還沒有專案報告」。不再用 plan 卡 summary 或塞在 state 裡的 HTML 冒充。讀取走合約 1、2 |
| O2 | 部分 | src/components/BotOfficePanels.jsx:25 | 本 PR：`state.updated` 晚於報告 `modified_time` 時顯示「報告比目前狀態舊，請以狀態列為準」 |
| O3 | 部分 | src/pages/BotOffice.jsx:66 | 本 PR：讀 `milestones[].name`。沒有 building 里程碑時，才退回 #125 已嵌入的 plan.milestones，避免版面測試的 M1 消失。不另造工作包 |
| O4 | 已完成 | src/components/OfficeDecisions.jsx:91 | 不重做 |
| O5 | 部分 | src/components/OfficeDecisions.jsx:49–52 | 本 PR：decision 有 why、options[{label,impact}]、evidence、deadline 才顯示。舊題沒有這些欄位就不出現，不回填。之後仍需 PI／Atlas 寫入 |
| O6 | 已完成 | src/components/OfficeDecisions.jsx:26 | 不重做 |
| O7 | 已完成 | src/pages/BotOffice.jsx:18–20 | 不重做 |
| O8 | 未完成 | src/pages/BotOffice.jsx:54、67 | 本 PR：「AI 正在做什麼」改讀 figures 執行回合加 execution 卡。沒有執行中回合顯示「目前沒有執行中的回合。」 |
| O9 | 已完成 | src/pages/BotOffice.jsx:69 | 不重做。保留收合的執行者／審查者／改派，不是舊 Router |
| M1 | 部分 | src/lib/botOfficeView.mjs:9–15；src/components/BotOfficePanels.jsx:33 | 本 PR：`officeJournal` 併入 asked_at、answered_at、history、卡片、figures、有時間的 follow_ups、logs、requests，套到對話串。沒有時間的 follow_ups 不發明時間 |
| M2 | 已完成 | src/components/OfficeActions.jsx:16 | 不重做。選取的已登錄檔只寫進留言文字，不加 request 欄位 |
| M3 | 已完成 | src/components/BotOfficePanels.jsx:34 | 不重做。狀態仍顯示「已送出」 |
| M4 | 未完成 | src/components/BotOfficePanels.jsx:34 | 本 PR：上傳走合約 6。503 或沒有 Drive 寫入權時停用並顯示原因 |
| M5 | 未完成 | src/components/BotOfficePanels.jsx:34 | 本 PR：「選取已登錄的專案檔」走合約 4。格式不對就顯示「檔案清單格式無法辨識，沒有改用其他來源。」 |
| M6 | 未完成 | src/components/BotOfficePanels.jsx:34 | 本 PR：匯入 Drive 參考走合約 6，按鈕為「登錄為專案參考」。503 時停用並顯示原因 |
| M7 | 已完成 | src/components/BotOfficePanels.jsx:28–30 | 不重做 |
| M8 | 已完成 | src/components/BotOfficePanels.jsx:29–30 | 不重做 |
| E1 | 已完成 | src/components/BotOfficePanels.jsx:36–47 | 不重做。四個模式、分隔條與 PlanDocument 都留著 |
| E2 | 部分 | src/pages/PlanViews.jsx:14 | 本 PR：building 里程碑若有 deliverables、acceptance 就送進規劃。沒有 scope、risks、closure 等欄位時不從全文猜。結構化規劃仍需後端或合約 v1 |
| E3 | 部分 | src/pages/PlanViews.jsx:89 | 不虛構版本號。building 已有 plan_revision、plan_state 才顯示。卡片標題當版本仍需 HY 定 |
| E4 | 未完成 | src/components/BotOfficePanels.jsx:48 | 本 PR：有 plan 卡就讀合約 3，成功才覆寫規劃書 markdown，可分章、目錄、聚焦。失敗且沒有已嵌入全文時顯示「規劃書全文讀取未接上」與原件連結。不把 iframe 預覽當完整功能 |
| E5 | 未完成 | src/pages/PlanViews.jsx:70 | 需 HY。不另抓第二份「AI 執行規劃書」，也不重建工作包 |
| E6 | 未完成 | src/pages/BotOffice.jsx:66 | 本 PR：有 deliverables、acceptance 才顯示。沒有就「尚未提供」，不從報告文字補 |
| E7 | 部分 | src/components/BotOfficePanels.jsx:46 | 本 PR：執行頁列出 figures 執行回合與 execution 卡。沒有里程碑仍顯示「尚無正式 Milestone。小型專案不強制固定里程碑數量。」 |
| E8 | 部分 | src/components/BotOfficePanels.jsx:62 | 本 PR：有 review_card 的 output 出現在審查輪次。不把所有 output 卡都標成規劃書版本 |
| R1 | 部分 | src/components/BotOfficePanels.jsx:54–62 | 本 PR：成果頁改讀合約 1、2，srcDoc 沙盒只有 `allow-popups allow-popups-to-escape-sandbox`，referrerPolicy `no-referrer`。保留完整閱讀、Escape、下載、在 Drive 開啟 |
| R2 | 部分 | src/components/BotOfficePanels.jsx:62 | 本 PR：版本選單用 report.history 的 file_id，不讀 state 裡的 HTML 歷史 |
| R3 | 已完成 | src/components/BotOfficePanels.jsx:62 | 不重做 |
| R4 | 已完成 | src/components/BotOfficePanels.jsx:60–62 | 不重做。既有 quality.checkpoints 仍列出；結論只在該筆有 verdict 時顯示 |
| R5 | 未完成 | src/components/BotOfficePanels.jsx:62 | 本 PR：同一專案 output→review_card 配對，每輪顯示成果版本 |
| R6 | 未完成 | src/components/BotOfficePanels.jsx:62 | 本 PR：有整數 round 用該值，否則依時間順序從 1 編 |
| R7 | 部分 | src/components/BotOfficePanels.jsx:62 | 本 PR：審查卡有 verdict 才顯示結論。沒有就顯示 last_review 與摘要，不從文字猜 PASS／FAIL |
| R8 | 已完成 | src/botOfficeData.js:46–47 | 不重做。輪次沿用 drive_created_at；沒有就「Drive 建立時間待補」 |
| R9 | 未完成 | src/components/BotOfficePanels.jsx:62 | 本 PR：展開「審查報告全文」時讀合約 3。沒有文件就顯示原因，不放 Drive iframe 冒充全文 |
| R10 | 未完成 | src/components/BotOfficePanels.jsx:62 | 本 PR：review 卡已有 criteria 才列出。沒有就不顯示。標準內容仍需 Atlas 寫入 |
| R11 | 已完成 | src/components/OfficeActions.jsx:53；src/components/BotOfficePanels.jsx:62 | 不重做 |
| L1 | 部分 | src/lib/botOfficeView.mjs:9–15 | 本 PR：工作日誌改用 officeJournal。舊 officeEvents 保留，給沒有 state／index 的路徑與既有測試 |
| L2 | 部分 | src/components/BotOfficePanels.jsx:66 | 本 PR：沿用全部／HY 與代理／系統與工作包／成果登錄。人、系統、成果照來源分類；代理與具名 Bot 算人 |
| L3 | 已完成 | src/pages/BotOffice.jsx 無 ProjectRouterLog | 不重做，也不接舊 Router 日誌 |
| L4 | 未完成 | 合約 3 只讀 index 卡片 | 需後端。Drive「日誌.md」沒有對應卡片 file id，前端不猜卡號、不回填 log |

## 本 PR 沒有做、也不會用假資料補上的

- 合約 1 到 6 的伺服器實作（另一個 PR）。前端在 404、503、斷線與格式錯誤時只顯示原因。
- p-001 的目標、負責 Bot、專案資料夾（P7、H5）。
- 要不要第二份 AI 執行規劃書（E5）。
- 規劃書的 scope、risks、closure 等結構化欄位（E2），以及尚未寫入的 criteria（R10）。
- Drive「日誌.md」全文（L4）。
