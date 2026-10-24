# Bot Office P0：待你決定的逐題作答

主要工作：HY 在原待決卡內確認 Bot 代答、作答或核准，不切回舊 AI Office。唯一重點仍是最上面的待 HY 決定，沿用 hy-ui token／卡片／狀態色／44px 控件，舊 Inbox 的選項、意見框、核准與退回互動。多題是新合約，不改其他頁或 Life Island。

| 區域 | 桌面／手機順序 |
|---|---|
| 待決卡 | 標題 → 題號與問題／原因／建議 → 代答與根據 → 選項／文字框 → 回答、確認、先不決定 |
| 核准卡 | 原件摘要 → 修改意見 → 核准／退回；退回意見必填 |
| 衝突 | 保留輸入 → 讀取新題目 → HY 明確核對後再送出 |

新增 OfficeDecisions.jsx；欄位對照與 POST 都集中 botOfficeData.js。其餘未接上的新增專案／改派／留言仍停用。真實模式用 HY 登入 session，只 POST 單筆 decision，沒有 Atlas 金鑰。示範模式不寫入；正式 legacy intake 沒有 questions 時提示等 Atlas 補題，不猜題。

父層每30秒刷新仍不顯示載入閃爍；草稿保存其開始編輯時的 revision，避免自動刷新默默讓舊答案套新題。409 不自動重送，保留文字並要求核對最新題目；401 提供重新登入，413／502 不假裝成功。Bot 的 answered_by=hy 也標「HY Bot 代答」，只有 answer_source=hy 才是 HY 本人作答。完整合約與換線步驟見後端 docs/OFFICE_P0_V1.md。

驗證：node --test tests/*.test.mjs、npm run build；新增 office-answers-ui.cjs 驗證12題工程 fixture、Sam 代答、確認／改答、選項不立即寫、先不決定、退回、401／409與保留草稿、沒有 stage 寫入；1280與390無橫向溢出，按鈕>=44px。bot-office-ui.cjs 保留舊 GET／404／stale／示範與刷新測試；既有六支 UI 測試仍執行。

自評：讀圖後將頁首舊「唯讀檢視」文案改為「回答後等待 Atlas 處理」，避免與已開放的作答矛盾；未改色彩、字級或原列表布局。工程截圖在 ui/office-answers/questions-{390,1280}.png、conflict-{390,1280}.png，並非正式川泱資料。

新增 PR-only Office P0 UI CI，沒有 cron、不改舊 workflow。預覽：npm run dev -- --host 127.0.0.1，正常登入後開 /#/bot-office；後端尚未部署時 API 不可用會明確報錯，不會模擬成功。新增 UI 腳本可用隔離 fixture 重現；需 Playwright、Chromium、@fontsource/noto-sans-tc，可用 CHROME_BIN 指定瀏覽器，OFFICE_ANSWERS_QA_DIR 指定截圖目錄。

P1/P2 僅評估，未啟動；舊 AI Office、Life Island、排程與正式資料不動。只開 PR、交 Claude 審查，HY 本人授權才合併。回退 revert 本 PR，已儲存答案留在 Office state。
