# AI Office 新案 UI

建案沿用名稱、Goal、選填說明及原有負責 Bot。唯一說明：「PI 會先研究你的目標並展開規劃，完成後再交給你審閱。」

已移除正式 PI 版本選擇、hash/Skill 區塊、startup-options 載入、Quality 啟動核准／重提按鈕、三引擎啟動卡片及配置警告。不新增分頁、側欄或重複資訊。

POST /api/ai-office/projects 由後端自動選最新正式 PI 並安排品質審查。前端不傳版本或狀態。錯誤保留表單，同一 UUID 重試；不降級到未整合的 legacy 建案、不偽裝進度。已有專案概況、PI會議室、執行計畫、成果與審查、工作日誌保留。

依賴後端 PR #138，本 PR #81；後端先部署。本次不合併部署，不改正式資料。原 ControlCenter NewProject 不變，只使用選用的 creation renderer。

驗證：43 個既有單元測試、production build、1280/390 建案測試（只有名稱/Goal、不選PI、不要求啟動核准、API錯誤重試、相同UUID及五頁）、既有AI Office／PI／18模組Registry回歸。工程預覽 create-1280.png／create-390.png 為隔離 fixtures，不代表正式專案或引擎驗收。
