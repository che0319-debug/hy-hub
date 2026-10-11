# Module Registry V1 UI

## 目的與版面

HY 打開系統架構時先了解整套系統「建置到哪裡、哪些缺口、是否有合法版本驗收」，再查看來源與下一步。唯一重點是整體架構卡。沿用四層與 PI Lab，狀態只來自後端 `/api/module-registry`；Module Registry 不成為第四個引擎。

沿用風格 A 的 hy-card、hy-card-head、hy-card-title、hy-pill、hy-kv、hy-list、hy-btn。新增 mr-grid/mr-dialog 只處理模組格狀布局與可捲動、可 Escape 關閉的詳情；配色皆使用既有 token。未驗收的已建置狀態使用中性灰，僅正式 ACCEPTED 使用完成色。桌面為四層三欄；390px 手機改單欄，詳情可捲動。需要 HY 驗收的 global humanAction 在 AI Work 控制中心的專案列表之前呈現。

## 後端相依與失敗處理

依賴 hy-agent-v2 Module Registry V1 PR。後端尚未部署時 404 明確顯示「API 尚未部署」，不使用 fixture、舊狀態、localStorage 或預設值。重新讀取立刻清空卡片，網路／授權／資料格式錯誤皆顯示錯誤與重試。共 18 個模組資料不足、狀態不合法或 ACCEPTED 無相符 owner humanAction 紀錄時拒絕顯示。

測試資料 `tests/fixtures/module-registry.json` 僅供 Node/Playwright，產品頁面不匯入。畫面測試截圖使用 fixture，不是正式模組驗收證據。

## 驗證

- Node 回歸 39 項通過，包含 API 404/401/403/5xx、網路失敗、缺模組與偽造驗收。
- Vite build 通過；既有 bundle 大於 500 KB 提醒不影響 build。
- 390/1280 Chromium：18 張卡片、0 個偽造驗收、詳情、來源、正式案例待驗收、Escape、API 失敗清空、重試與 PI Lab。
- isolated Inbox fixture：global 模組驗收卡可見，核准 POST 使用合法人類決策格式；不會觸發 merge/deploy。
- 既有 PI Expert/Skill 與 PI Lab browser smoke 維持通過。
- 首輪 GitHub UI CI 暴露既有 smoke 非同步等待不足：Skill 內容顯示後，ExpertTeam.act 仍等待 registry reload，busy 尚未清除。產品 ExpertTeam.jsx 未變更；原 smoke 在 200ms registry fixture 延遲下可重現失敗。補上 Playwright trial actionability 等待後，同樣延遲情境通過；仍保留原按鈕啟用斷言，未放寬發布保護。對照詳見 evidence/module-registry-v1/pi-smoke-comparison.txt。
- 無手機橫向溢出、無 browser pageerror；按鈕沿用至少 44px。
- 已檢視桌面／手機截圖。首次環境中文字型不完整，補妥測試環境字型後重新截圖及確認。

截圖：[桌面總覽](ui/module-registry-1280.png)、[手機總覽](ui/module-registry-390.png)、[手機詳情](ui/module-detail-390.png)、[桌面詳情](ui/module-detail-1280.png)、[手機 API 錯誤](ui/module-error-390.png)、[桌面 API 錯誤](ui/module-error-1280.png)。

## 上線前

先由 HY 審查後端合併與部署，確認正式 authenticated API 的 18 模組與權限，再決定前端合併。初始狀態不是正式驗收結果。三大引擎仍待正式案例，所有模組正式 ACCEPTED 均需版本綁定的證據及 HY owner humanAction。沒有更動正式 AI Work 專案資料。
