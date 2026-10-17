# AI 派工簡化

每個角色只選主力／一個備案，顯示 GPT、Claude、Grok；模型由各自排程設定。GPT 的 Chat／Work 入口仍由角色能力對應，不合併底層身分或執行鎖。

移除派工方式／緊急停用、工作包路由介紹、模型與健康細項表單。保留套用範圍、一次儲存、409 保護及唯讀工作日誌。過渡控制 API 保留供既有維運使用；此頁不改啟用模式。

選項須後端 ready 且 execution_verified，並符合角色。execution_verified 只代表同一可信 actor/provider 有 COMPLETED receipt，不代表正式全流程驗收。未驗證目前設定顯示停用項目，不被刪除或偽稱可選。

編輯某一列後才使用後端固定原則：3 包超時未領、每包等待 2 小時、可用備案自動切換；模型回歸 session-default。未編輯列、指定類型規則、其他範圍及已建立包原樣保留。歷史多備案只在明確重新選擇該列後縮為一個。

後端配套 PR 提供 simple_health_defaults 與 execution_verified；後端未更新時選單停用，不以猜測預設寫入。Grok 通知是現有 Router 事件投影，供 Bot 下一次讀取 Context，沒有聲稱已主動送達。

CI 的 router-ui.cjs 測試 1280／390 畫面並上傳 docs/quality/ui/router/simple-*.png；fixture 成功紀錄不是正式連線驗收。
