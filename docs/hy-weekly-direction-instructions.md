# 給 HY Bot：每週方向更新

Life OS 已把首頁橫幅與人生目標頁接到同一份既有 `weekly_change.json`。每週由 HY 自行讀七維十年方向、nowSummary、nextStep 及上一週成果，整理下一週的一段方向與 1–3 個可完成的一小步。建議 80–150 字，最多 500 字；避免重複列七維待辦，不替使用者宣稱已完成行動。

## 上傳方式：沿用現有授權與 API

1. 用既有 MCP 的 `life_goals.read` 取得最新七維；不要從舊 mock、personal-progress 或 Office 摘要代替正式評估。
2. `GET https://hy-agent-v2.onrender.com/api/weekly-change` 讀目前每週內容。
3. `POST` 同一網址，沿用既有 Life OS 登入授權，Content-Type: application/json：

```json
{
  "date": "<下週一的 YYYY-MM-DD>",
  "text": "<一段方向與 1–3 個下一小步，非空、最多 500 字>"
}
```

例如 2026-11-10 更新下一週時，date 是 `2026-11-16`（該週 11/16–11/22）。範例日期不是排程，也不是已完成交件。

成功回應 `{ "ok": true, "id": "w-2026-47" }`。伺服器依 ISO 週更新同一週的紀錄，保留其他週與出生日期；不要自行整包寫檔。date 決定適用週期，writtenAt 是伺服器實際保存時間，頁面按台北日期顯示；舊紀錄沒有 writtenAt 時標為「紀錄日期」，不捏造更新時間。

4. 再 GET 讀回，核對該 id 與 text 一致後才回報成功。這不會改七維分數或評分歷史。

以上是既有 HTTP API，不是 execute_action 新動作。若目前 Bot 只有 MCP 工具而沒有 HTTP 呼叫能力，可沿用既有前台操作：人生目標 → 每週方向 → 完整內容與修改 → 修改這段方向，選適用週期、填文字、儲存，再讀回核對。不要新增 MCP 或索取新金鑰。

頻率與執行時間由 HY／Grok Bot 端設定；Life OS 只保存與呈現。本次沒有建立 ChatGPT 或伺服器自動排程。
