# 統一執行者與模型設定

後端對應 hy-agent-v2 的 `29_Unified_Router_Settings_and_Rollout.md`。本次只開 PR，不合併、不部署。

- 「專家團 → 執行者與模型」只讀 Router 單一設定，移除舊 Claude Opus／Sonnet 角色表。
- 每個角色可編輯主執行端、排序備援、每端模型。角色預設由後端 `role_defaults` 提供，可信任新 AI／模型清單直接由後端 catalog 進入下拉。
- PI 審查預設 Claude → 所屬 owner bot → 使用者，保留獨立性與正式 humanAction。
- 只影響未來新包；修改先留草稿，再輸入原因、授權依據、勾選確認後儲存。
- 頁頂提供本人專屬派工控制／緊急停用。取消確認不送出；409 不覆蓋新版；前台顯示近期切換稽核。
- 上線初始舊派工：先限定一個新測試案、驗收後再由本人全面啟用 Router。無需 Render `AI_WORK_ROUTER_CORE_ENABLED`。
- 緊急停用只讓未來新包回舊路，既有已凍結包與鎖由原 trusted runner 持續服務。

實際驗收依後端文件：預留新專案 ID、切 pilot、由既有 `/api/ai-office/projects` 正式啟動新案、驗證規劃／一般／CODE／兩種審查／改設定新包生效／取消與緊急停用，最後才全面切 Router。這次 PR 不做真實派工。

模型選單是訂閱環境偏好，不呼叫模型 API，也不代表遠端已切換。執行端無法滿足時必須回報。

CI：80 項 JS 單元測試、Vite build、1280／390 Router 與既有 PI／Office／Module UI 操作測試。截圖由 `pi-ui-390-1280` CI artifact 留存（包含 models／thresholds／project／log），不把舊截圖當成新版實測。
