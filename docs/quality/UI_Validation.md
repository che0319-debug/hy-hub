# 品質與交接 UI

增量規劃：原控制中心增加一個共用方法庫入口；專案原分頁增加「品質與交接」，沿用原待確認核准。新區域使用既有 hy-ui style A/token；保留四種狀態、導航與既有資料流。

API fixture 畫面驗證（不是正式帳號／E2E）：390px、1280px 全頁已視覺檢查；無 JS pageerror；document.scrollWidth 等於 viewport；品質區按鈕無低於 44px。繁體字、卡片間距、重點／空資料提示可讀。首次截圖測試環境缺中文字體，僅在驗證 browser 注入 Noto Sans TC 後重截；產品維持既有字體。方法選擇由原先無入口修正為專案選單＋原 humanAction 發布；審查待補新增證據／交回原案選擇，避免字串回覆不符合後端契約。

| 畫面 | 手機 | 桌面 |
|---|---|---|
| 方法庫 | [390](ui/library-390.png) | [1280](ui/library-1280.png) |
| 專案交接 | [390](ui/project-390.png) | [1280](ui/project-1280.png) |

載入、空資料、失敗提示都有對應；原件下載用登入授權，不用公開裸連結。正式部署仍需驗證後端資料與瀏覽器下載。截圖直接隨 PR 提交；本次沒有既有 package_code execution 可以合法上傳，未建立假 execution。

後端契約與精確帳號待設定項見 hy-agent-v2 的 docs/quality/04_Enablement_and_Acceptance.md。
