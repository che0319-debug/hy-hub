# Bot Office：改回真正 AI Office 五頁與 p-002 實跑增補（2026-10-25）

## 問題對照與版面規劃

上次誤把 ControlCenterV5（AI Work 控制中心）的六頁導覽套入 Bot Office。現行 AIOfficeV1 使用的是 src/lib/aiOffice.mjs 的五頁：概況、會議室、執行計畫、成果與審查、工作日誌。本次 Bot Office 直接共用這個導覽常數，以 AIOfficeV1 的頁面職責為準；資料與寫入仍只走新的 Office API。

畫面主要工作仍是 HY 看待決定事項、作答與專案進展；open decisions 為唯一琥珀焦點，已回覆歷史為白卡。桌面：精簡專案頁首 → 五頁 → 目前頁內容，會議室對話2/3＋團隊1/3；手機按同序單欄，分頁換行、44px操作區。沿用既有ao/hy樣式與五種狀態色，不增加新色／字體。

## 六項畫面回饋

1. 正式UI移除「真實／示範」、整份demo產生器與示範文案。專案內不再重複Bot Office大頁首、卡片索引時間或30秒刷新說明，只留專案名稱／狀態、負責／執行／審查及整理／編輯；新案入口只在總表。
2. 團隊移到會議室側欄，比照AI Office。依building.owner_bot、executor、reviewer與該專案role=pi記錄顯示角色，不把figures每個執行回合當成員。共用figure名稱可解析Claude，但不靠island推測指派。三個Grok Build工作回合只顯示一個執行者；審查者為專案明確指定的Claude；未指定顯示未指定，不造預設。
3. 「等待Atlas處理」原為P2的規格變更／改派／開案／留言請求佇列，不是另一道HY核准。概況移除此空區；實際請求保留，在會議室顯示「已送出」與內容，沒有請求不顯示空佇列。原requests後端與紀錄不刪除、不改成送出即完成。
4. 「待確認」不再是分頁。作答／核准留概況，支援待你決定／已回覆／全部歷史；會議室為對話、留言與團隊。
5. 執行計畫含規劃摘要、時程＋文件、時程與執行、完整文件；使用正式plan_card與已登錄execution卡，不捏造未提供的里程碑／排程。成果與審查含成果版本切換、原件預覽／連結、獨立審查與審查紀錄。review報告實際type=note，依明確review_card關聯歸入審查，不再漏掉；一般note進會議室，decision關聯note回概況。
6. 舊AI Office清單另開獨立PR處理：正式aggregate三筆專案仍在；本PR不改AIOfficeV1、ControlCenterV5、舊API或任何正式專案資料，測試亦用舊頁原版做回歸。

預覽只針對https://drive.google.com與docs.google.com已知文件路徑轉preview，其他HTTPS只提供開啟連結；不新增伺服器讀Drive、API金鑰或F2。真正文件仍受Google登入／分享／嵌入限制，原件連結一直保留。UI測試使用隔離iframe內容，不宣稱已在真實Drive帳號驗證所有文件內容。附件上傳／舊引擎的完整里程碑資料沒有偷偷復用；缺資料明示，沒有新增猜測資料。

## 七項實跑增補

- needs_advance與advance由後端配套標記正式核准結果；前端顯示「待推進」及目標，不私自改building.stage/card/figure或returned_count。Atlas仍推進並一次性確認交接。
- 正式顯示building.follow_ups（id/text/status/source），概況與成果審查均有執行前待辦與來源連結；純讀取，無自動核准或任務推進。
- #210的整份state decision revision檢查已存在；後端追加明確舊revision回歸，不重寫已驗證的HY作答驗證。
- index重複ID由後端配套拒絕，不在GUI自動去重或修改正式index。
- Bot建議儲存原已支援。新增「採用建議並作答」以HY現有action=answer、question_no、expected_revision呼叫，記為HY作答，不提升Bot權限；HY也可改答。
- 逐題confirm原本就有，仍保留確認並補充與對未決字樣的提醒，不改成整張確認。
- 審查卡以可選drive_created_at（Drive metadata createdTime）顯示台北時間，**不以created_at登錄時間、date或檔名推算**；缺值標「Drive建立時間待補」。只讀核對c-012檔名22:15但Drive建立21:15:42；c-010及c-014不是同樣偏移，不全減一小時。

正式index尚未回填drive_created_at；請Atlas依後端 docs/OFFICE_TRIAL_HANDOFF_V1.md的三份metadata核對表，在正常read→patch→write補該key，其他key保留。本次不改Drive檔名／內容、不改Claude或Atlas排程、不寫正式hy-data。合約新欄位缺少時前端相容原版本；待推進標記要後端配套上線後才會對新核准產生。

## 驗證

隔離工作目錄只有本PR的Bot Office改動，AIOfficeV1/ControlCenterV5/舊AI測試使用master原版。node --test tests/*.test.mjs 120項通過、npm run build通過。Playwright測五頁實際用途、精簡頁首、Reviewer Claude與去重、移除島資訊、會議室、規劃書預覽、成果版本、審查note、follow_ups、待推進、Drive時間、採用建議及原P0作答流程。另跑舊Router／PI／模組／AI Office／startup／review-blockers回歸。全用隔離API/Drive fixture，沒有正式寫入。

正式截圖：docs/quality/ui/bot-office-five-tabs/，390及1280各含compact-overview、team-meeting、results。CJK字體以本機字體fixture載入，沒有要求更改網站字體。

回退revert前端PR即可；不會刪除state/index/答案/工作紀錄/請求。C/D/F2未開工，不合併、不部署，待Claude審查與HY指示。
