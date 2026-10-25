# AI Office 專案清單顯示修正（2026-10-25）

## 已查證的資料

正式 hy-data main 7512919ab2e715f89c57302c640747d6552f1f83 的 ai_work_packages/aggregate.json：revision 2870，原壓縮內容解壓後大小與 SHA-256 符合，SQLite integrity_check=ok。僅在記憶體反序列化，PRAGMA query_only=ON 查詢，wp_projects 仍有三個專案。沒有修改或還原正式檔案。

Render 台北時間 2026-10-25 08:02–08:10 的 /api/ai-office/projects、/actions 及三個專案詳情均可見200或304，部分詳情請求耗時二十秒以上。200/304 不代表前端畫面一定正常，也不能只靠這些日誌斷定使用者當時唯一的觸發原因；但證據不支持「本次刪除三個專案」。

## 確認並重現的前端問題

AIOfficeV1.loadOffice 原本等所有專案的 summary 都完成（或失敗）才把 projects 交給 ControlCenterV5；初次進入即使專案清單已讀到，仍一直不顯示。ControlCenterV5 在自訂 loadData 任一更新失敗時，又直接清空 projects/inbox/details，會讓上次已看到的專案消失。

## 修正

- 清單和待處理事項讀到後先 publish；詳情在同一輪背景補齊，未到的細節保持既有「尚未完整」提示，不捏造統計。
- 更新失敗保留最後成功的資料，顯示錯誤及「仍顯示上次成功載入的專案」，不拿空清單假裝成功。
- 每輪載入以 generation 識別；新刷新或卸載後，舊請求完成不得回寫並蓋掉新錯誤／資料。
- 正式API、驗證、project資料、狀態機、排程、路由與 AI Office 五頁均不變。

## 畫面與驗證

畫面用途是先讓 HY 看到已存在的專案；沿用既有 OfficeHome，唯一焦點仍由待確認卡片決定，不新增布局或色票。桌面及390px手機順序皆為頁首 → 摘要 → 搜尋／篩選 → 專案列表；錯誤就地顯示，列表不消失。

隔離工作目錄只含本 PR 的修正，Bot Office 使用目前 master 的版本：node --test tests/*.test.mjs 118項通過、npm run build 通過。Playwright ai-office-visibility-ui、既有 ai-office-ui、ai-office-startup-ui 通過390/1280。新增測試刻意阻擋 summaries，確認清單先顯示；再注入503，確認清單保留；釋放舊 summaries 不得清除新版錯誤；最後可重試成功。沒有正式API寫入。

新增 ai-office-visibility-ui.yml 是 pull_request-only CI，沒有 cron／push部署／排程修改。截圖：docs/quality/ui/ai-office-visibility/list-{390,1280}.png。

回退：revert 本 PR，只有前端讀取與顯示行為改變，不動正式資料。本 PR 不合併、不部署，等待 Claude 審查及 HY 指示。
