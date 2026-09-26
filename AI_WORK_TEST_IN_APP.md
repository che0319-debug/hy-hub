# AI Work Test 改為 HY Life OS 內部分頁

2026-09-27，Asia/Taipei。使用者最新指示：沿用現有 HY Life OS，新增一個分頁測試；不採新建付費 Render 服務方案。前次約 US$7.25／月的部署申請已撤回，未建立任何資源或部署。

## 已修改的入口

- Sidebar 使用內部 NavLink，目的地 `#/ai-work-test`，不另開網站或 browser tab。
- main.jsx 原先把 ai-work-test 路由導回正式 AI Work；現已改為獨立 AIWorkTest 元件。
- Test 頁不匯入正式 aiWorkStore 或 lifeOSApi；未接通資料前只顯示真實等待原因，不複製正式專案、不提供假核准按鈕、不以 localStorage 代替後端。
- App 在 Test 路由不呼叫正式 dispatch-sessions；離開原頁後的舊非同步回應不會回填 Test session 清單。
- 保留原本正式頁面；未合併 master、未觸發網站部署。這只完成**分頁入口修正**，不是完成線上 V3 workflow。
- 原有 aiWorkTestLink helper 與獨立 Render 草案屬歷史設計，新的入口不再使用 VITE_AI_WORK_TEST_URL；後續不能據此建立付費資源。

## 不新增付費主機的儲存方案，待確認後才實作

現有 Render hy-agent-v2 是 free 服務且沒有持久磁碟，不能直接把本機 SQLite 路徑搬進去當成持久儲存。前台多一頁不會解決此限制。

具體候選：沿用現有前台與後端 host，但新增**獨立 Test repository／Test 專用存取憑證**及 `ai-work-v3-test` 專用後端服務層。只在這個 Test repository 的固定資料檔中保存完整 Test aggregate；不寫 hy-data 正式核心檔、不使用 mutate_core／write_core、舊 MCP 不可取得 Test store。測試成果仍使用原先批准的獨立 Drive folder。

每一筆 humanAction 以使用者看到的 revision／action version 加 GitHub blob SHA 做 compare-and-swap。Status、Phase、Human Action、版本與 audit 放在**同一份資料檔的一次 commit**；SHA 或 domain version 不符就回傳衝突，不重讀後拿舊內容覆寫。先查 request ID 的既有 receipt，再決定是否受理重送；成功只在 GitHub 接受 commit 後回覆。全部 claim／lease／queue 也走同一儲存契約，禁止快取寫回覆蓋新版本。

此為待實作契約，不是宣稱既有 SQLite runtime 已支援 GitHub CAS。需新增持久儲存 adapter、資料結構／大小上限、並行與中斷重試驗證，才能開放 workflow。GitHub 單檔容量與請求額度會限制 Test 規模，驗證前不承諾高流量用途。憑證最小權限必須與 production 分開；不能僅換 JSON 路徑就宣稱憑證已隔離。若要求 process 級的憑證不可互見，則共用現有後端程序不符合，不能逕自放寬。

前台沿用 HY Life OS 外殼登入；Test 操作者／代理授權仍要由後端驗證，不能把 production 共用密碼 token 當成可區分 HY／Grok 的身分。本人與代理仍透過 Test 前台正式 humanAction 核准，不新增本人限定。

依使用者最初第 7 點：「現有儲存做不到原子提交時，提出具體隔離方案，停在此關卡等確認。」因此本次停在儲存接通前；需要確認是否採用上述 Test 專用 repository／憑證、單檔 CAS 方案。確認只授權實作與驗證，不代表允許部署 production 或擅自放寬隔離。

## 本次入口驗證

使用實際 main.jsx／App／Sidebar／AIWorkTest 跑瀏覽器，5 項通過：直接 Test 路由、同分頁導航、無正式 dispatch 載入、無假核准控制、重新整理仍在 Test。驗證隔離了 AuthGate 與其他 production pages，沒有對真實登入或 API 做操作；不是完整 production build 或 V3 後端驗收。

GitHub CAS 介面依據：https://docs.github.com/en/rest/repos/contents （update 需既有 blob SHA，衝突拒絕）。這不替代待實作的 domain revision／request receipt 驗證。
