# AI Office V1：五頁定案 UI 與正式資料整合

視覺唯一主要參考為 HY 提供的 `10497.jpg`（同目錄 `visual-reference.jpg`），沿用冷白底、藍色主按鈕、白色圓角卡片、淡色圖示／狀態、精簡字體層級與密度。它是風格參考，不是新增功能清單。既有 HY 導覽列不改；AI Office 內不建立第二側欄、專家照片或額外分頁。

入口仍為 `#/ai-work-v5`，保留所有既有重導向及首頁操作。依賴後端 [PR #137](https://github.com/che0319-debug/hy-agent-v2/pull/137) 的 `/api/ai-office` API；後端未部署時顯示明確錯誤及重試，不顯示 fixture 當正式資料。本任務只開 PR，不合併、不部署、不寫入正式專案資料。

## 五頁實作

| 分頁 | 最終布局與資料 |
| --- | --- |
| 專案概況 | 共用精簡頁首；三欄六卡，編輯／二次確認刪除在右上；底部文字／附件補充，沒有 PI 建議重複區。類型／完成日期缺正式資料時明說未記錄。進度只顯示工作包計數，沒有虛構整體百分比。 |
| PI 會議室 | 對話紀錄主區與精簡待處理／團隊區；展開指定正式 humanAction，沿用既有 Inbox 核准契約。已處理事項仍可追溯原始答案、附件、角色與時間。Grok 是 HY 代理，不是 PI 下屬。 |
| 執行計畫 | 60:40 雙欄、拖曳及鍵盤調整比例、兩種全寬模式；切換模式不卸載文件而保留捲動。正式兩份 Markdown 文件、標題導覽、Milestone／工作包對應定位。没有對應標題就提示，沒有平行文件副本或固定三個 Milestone。 |
| 成果與審查 | 沙盒 HTML 報告主視覺、指定歷史版本、完整閱讀及 Escape；精簡正式成果／Drive 連結與 Quality checkpoint 原始版本證據。不能將舊審查套用到最新報告。 |
| 工作日誌 | 單欄、篩選、原始事件時間與執行者，humanAction／工作包／檔案連結。沒有固定右欄或額外決策頁。 |

## 邊界與已知服務缺口

- PI 即時雙向對話尚無正式資料契約，畫面明示未就緒；既有 notes、suggestions、humanAction 是正式紀錄，不冒充 GPT／Claude 對話。意見送至既有 suggestions，等待工作包接手，不宣稱 PI 已讀／回覆。
- 「待我處理」只顯示既有流程正式指派 owner/HY 的 action，原因／PI分析只呈現實際 reason 與 requested_by。來源沒記 PI 分析時明說，不能用前端篩選冒充 PI 判定。PI Engine 下一版需結構化 decision reason、options、recommendation、source evidence；此次不建立新核准系統。
- 全域 Google Picker 尚未建置；可以選取專案已登錄 Drive 檔案、上傳至 canonical 專案資料夾，或指定外部 Drive ID 複製到 references 並讀回。不是任意貼 Drive 連結就宣稱已保存。
- Expert 配置僅呈現實際 package capability pins 的已發布版本；沒有正式配置則未記錄，不杜撰團隊／online 狀態。Resource Service 模型配額及可用性仍未就緒。
- Quality checkpoint 對應版本證據由後端提供，並不保證其審查對象一定是 HTML 報告。未綁定報告版本時明說且顯示原始快照；若要強制 Claude 僅審查每版持續報告，須 Quality／Report Service 升級，不可由 UI 改寫。
- 正式開案／審查完成時間、類型／估算等舊 schema 沒有的欄位，不新增假值。頁首最近更新是最近已登錄事件；開始日期採初始工作包建立時間。

## 重用與權限

ControlCenterV5 保留預設行為，新增可選 project renderer、loader、title；Inbox／DeleteZone／SpecChangeBox 共用，不再複製核准／刪除／規格變更邏輯。所有配色覆寫只在 `.ao` 中，其他 HY 頁面及導航內容不改。

讀取使用唯讀 AI Office projection，沒有 recalculate、派工或 Drive provisioning。文字／上傳／humanAction／刪除沿用 `/api/ai-work-packages` 與既有 auth；Drive 引用及版本報告由對應 service 升級。上傳未完成不得提交帶附件的正式回覆。刪除需展開二次確認並輸入完全一致的專案名，後端仍控制 owner、執行锁、Drive 備份及刪除。

## 驗證與預覽

`node --test tests/*.test.mjs`，`npm run build`，`node tests/ai-office-ui.cjs`。Browser 使用隔離 fixture，與正式驗收分開；涵蓋 1280/390 五頁、定位、拖曳與键盤比例、捲動保留、歷史報告、上傳／Drive import、人工作答附件、二次刪除阻擋、API錯誤清空及重試，無 pageerror／横向溢出。沿用 PI Expert/Skill/Lab 與 Registry 回歸。CI 同時執行新測試並上傳 `docs/quality/ui/ai-office/` 截圖。

這份 PR 是完整五頁前台與已存在能力的正式串接，以上尚無後端能力的項目保留未就緒，不能宣稱 AI Office 或三引擎已正式驗收。

本機驗證：後端 476 passed（5 項既有 deprecation warning）；前端 43 passed、Build 通過，三組 browser regression 通過。PLAN_APPROVAL／CODE_REVIEW 的核准契約不接受附件，本頁不提供會被忽略的附件提交；補充資料改由既有 suggestions 交接。CI 結果以 PR Checks 為準。

## HY 審查修訂：首頁與配色

AI Office 入口新增 `OfficeHome.jsx` 專案總表：山景深藍主視覺、真實專案/工作包/待處理/完成數摘要、名稱與 Goal 搜尋、四種篩選、正式專案卡片及既有 NewProject 表單。專案詳情讀取不完整時不顯示完整工作包數；API 失敗不保留假狀態。共用 ControlCenterV5 只增加可選 renderHome，原預設行為不改；global Module Registry 驗收入口保留。

五頁沿用定案布局，增加深藍頁首、青綠/淡紫/暖橘內容色彩與輕微陰影，色彩不表示正式核准。首頁不複製專家團/知識庫或假今日完成資料。新增 `00-home-1280.png` 與 `00-home-390.png`，以及更新五頁截圖，全部為隔離工程 fixture。

Browser 回歸新增首頁搜尋、篩選、NewProject 展開/取消、390/1280 響應式及進入專案；正式建立、刪除與核准仍使用既有契約。此次只更新 PR #79，不合併、不部署。
