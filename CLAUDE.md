# CLAUDE.md — hy-hub（HY Life OS 前端）

## 這個 repo 是什麼

- React + Vite 的 HY Life OS 介面，部署在 GitHub Pages（base `/hy-hub/`）。push／merge 到 `master` 會由 `.github/workflows/deploy.yml` 自動部署。
- `public/*-dashboard.html` 是各 Bot 的獨立看板（純 HTML/JS），由 `src/pages/*` 以 iframe 嵌入：
  - `950157-dashboard.html`（ITRI 工作分身）、`family-dashboard.html`、`personal-dashboard.html`、`sam-dashboard.html`
- 後端 API：`https://hy-agent-v2.onrender.com`（另一個 repo `che0319-debug/hy-agent-v2`）。這個 repo 沒有後端。

## 指令

```bash
npm ci
node --test tests/*.test.mjs      # 單元測試
npm run build                     # 建置（base /hy-hub/）
npm run dev -- --host 0.0.0.0 --port 5173 --strictPort
```

## UI：一律使用「風格 A」（2026-10-03 HY 定案）

**做任何 UI 變更前，先讀 `.claude/skills/hy-ui/SKILL.md` 並照它的流程做。** 摘要：

- 共用樣式：`public/hy-ui/hy-ui.css`。新頁面與改版的看板都要引用它，並在 `<html>` 設 `data-bot="950157|family|personal|sam"` 取得該 Bot 代表色。
- 範例（以這兩頁為準）：`public/hy-ui/examples/research.html`、`public/hy-ui/examples/board.html`；截圖在 `docs/ui/`。
- 骨架：深藍頂欄（`--hy-header`）＋ Bot 代表色標章；白色分頁列；明亮冷灰底（`--hy-bg`）；白色卡片。
- 狀態色只有五種，意義全站一致：灰 `wait`＝等待／追蹤中、藍 `ai`＝AI 執行中、琥珀 `you`＝**待你確認**、綠 `done`＝完成、紅 `bad`＝逾期／失敗／危險。不得新增顏色。
- 字級四階：頁面標題 22、卡片標題 17、內文 15、輔助 12–13。字體 Noto Sans TC；Bot 標章用 Syne。
- 一頁只有一個重點（`.hy-card.is-focus` 最多一張）；需要 HY 處理的東西用琥珀色（`.needs-you`），並在手機版排最前面。
- 手機優先（390px）：按鈕與可點區域至少 44px；看板與雙欄在 640px 以下改成單欄。
- 文案：繁體中文、短句、先說「現在怎樣／你要做什麼」；按鈕寫動作（「核准並部署」不是「送出」）。分頁標題可保留一個 emoji，其他地方不用 emoji 裝飾。
- 舊的 AI Work 控制中心（`src/pages/ControlCenterV5.jsx`，米白／墨綠的 `.cc5-*`）是過渡樣式：維護時不要擴大使用 `.cc5-*`，新功能用風格 A。

## AI Work 程式工作包規則

- 只改工作包 `code_work.scope` 允許的路徑；分支 `ai-work/<id>`；不要 merge、不要推 `master`。
- UI 變更交件前必須附截圖：手機 390px、桌面 1280px，各一張（Playwright／Chromium）。
- 環境準備階段不得修改受版控的檔案。
