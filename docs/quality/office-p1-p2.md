# Bot Office P1/P2 GUI：對齊 AI Office

## 畫面規劃

依 HY 本次 12 項補齊要求，對照 AIOfficeV1 的 OfficeCreate（負責 Bot 選單、名稱／目標）、OfficeProject、Overview、Results、Log，以及 ControlCenterV5 的待確認徽章、作答／核准、規劃書與品質分頁。沿用風格 A／現有 ao、hy 卡片與狀態 token，不把舊 AI Office 的 API 或引擎搬回來。

主要工作是讓 HY 看見待處理事項、逐題作答並留下紀錄；唯一重點為 open decisions 的琥珀色卡片。已回覆歷史使用一般白卡，不誤示為待處理。桌面依序為頁首／狀態 → 六頁導覽 → 待確認 → 專案狀態／相關資料；手機同順序單欄，分頁換行，操作至少44px。開案、改派及規格變更表單都保留輸入與錯誤提示，送出只入等待 Atlas 的請求，不直接改專案。

## 12 項對照

| 項目 | 完成行為 |
| --- | --- |
| 1 | 概況、待確認（open 卡片數徽章）、規劃書、產出、工作紀錄、品質與審查六頁。舊 meeting 卡片保留在概況，execution/plan 卡片進規劃書，不丟棄。 |
| 2 | last_review、審查報告連結、required_changes、returned_count；缺資料顯示待補，不編造報告。 |
| 3 | running 與 review 都納入 AI 執行中計數。 |
| 4 | assigned 且有 open intake 顯示「等 HY 回答」，不新增 stage。 |
| 5 | 工作紀錄新增 HY 留言，POST /api/office/log；Bot 署名與 owner_bot 檢查由後端配套負責。 |
| 6 | 首頁／專案待確認可切待確認、已回覆、全部歷史；answered 卡片唯讀顯示逐題答案、代答／確認者、時間與 history。 |
| 7 | 顯示 questions[].bot_suggestions，標「僅供參考」與根據／把握度，不當作 answer。 |
| 8 | 原代答有「待 HY／待確認／未決」會提醒；填文字可「確認並補充」，或按改答整題替換。 |
| 9 | 前端仍只提交單筆答案、單筆 log 或 request；Atlas 的 revision PATCH／snapshot 保護在後端 PR。 |
| 10 | 決策卡關聯的摘要由 state.questions/answer 投影，index 舊摘要不再蓋掉新答案；不增加 index 寫入。 |
| 11 | 新增專案、規格變更、改派、會議室留言 POST /api/office/requests。新案選 owner Bot，其他請求可選現有專案。執行者／審查者不可相同。顯示等待 Atlas，不宣稱已執行。 |
| 12 | 概況呈現 figures 的 owner、project、island、look_as、status；不改 HY Life 島與島嶼動畫。 |

## 資料與寫入

仍只用 GET /api/office/state、/index 讀取，保留401／404／stale、30秒刷新、首次 loading、HTTPS URL 過濾與獨立示範模式。所有 GUI 寫入沿用 HY 登入 session，不包含 HY_BRAIN_WRITE_KEY 或 owner OAuth token。示範不允許寫入。

新 log/request 使用 request_id；失敗保留內容，同內容可重送相同 ID，編輯後換新 ID。沒有自動重試或樂觀偽成功。決策仍帶 expected_revision，409 保留輸入並要求核對最新版。後端合約請見 hy-agent-v2 docs/OFFICE_P1_P2.md；本前端須在配套後端通過審查、HY 同意合併發布後才上線。

## 測試與截圖

- node --test tests/*.test.mjs
- npm run build
- tests/office-p1-ui.cjs：390/1280，隔離 API fixture，驗證六頁、Bot 建議、補充確認、answered/history、審查連結、HY 留言與四種待處理 request。無正式資料寫入。
- 既有 office-answers、bot-office、router、pi、module-registry、AI Office、startup、review-blockers UI 回歸。
- docs/quality/ui/office-p1/ 的 questions、answered、review、overview 各390/1280截圖。
- 視覺檢查修正：已回覆用白卡、狀態徽章正確；表單使用既有 token、按鈕44px、手機無橫向溢出。概況只保留一張待確認焦點卡。

舊 AI Office 頁面、端點、既有資料、排程均未修改。C/D/F2 不在範圍。revert 前端 PR 可恢復 P0，已寫入的答案／logs／requests仍保留，不刪正式資料。
