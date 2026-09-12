# HY Life OS 2.0 — Engineering Baseline v0.1

## Mission

讓現實的我越來越接近我要的人生，也讓 HY 越來越有能力幫我做到。

HY 同時追蹤兩個差距：

1. **Reality Gap** — Current Me ↔ Desired Me
2. **Self / Value Gap** — Current HY ↔ Ideal HY

AI 的工作量、Agent 數量與 Task 數量都不是成果。最終以現實進展、自主產生的有效價值，以及本人注意力負擔衡量系統價值。

## Constitution

最高決策框架沿用 HY 人生心法：攻／守與八大心法（狠、力、做、財、權、識、擒、謀）。

AI 可以自主改善能力、方法、流程與 Worker；人生方向與憲法只能提出修正案，由現實 HY 最終批准。

## 1 + 3 Digital Twins

### HY — Personal Twin
- 維護 Desired State / Current State / Reality Gap
- 評估整套 Life OS 的 Self / Value Gap
- 做跨領域資源配置與優先順序判斷
- 可提出修憲，但不可自行修憲

### 小因 — Life & Family Twin
- 家庭、生活、健康、體態、飲食、運動、旅遊
- 主動觀察 → 發現 Gap → 實驗 → 衡量 → 改善

### 950157 — Work / R&D Twin
- 本業、研發、技術情報、研究、專利、Proposal、簡報、研發工具
- 第一個高度自主化 Agent（950157 Alive）

### Sam — Business Twin
- 副業、商機、產品、收入與商業驗證
- Idea → Research → Validation → MVP → Reality Result

## Autonomous Agent Loop

Trigger → Mission → Current State → Project/Memory → Gap/Opportunity → Candidate Tasks → Value/Risk Gate → Execute → Review Result → Reality Result → Memory/Reflection → Next Intent.

Agent 不應等待本人逐項派工；每次執行後必須留下可延續的 Next Intent。

## Agent vs Worker

本人只需要認識 HY、小因、950157、Sam 四個分身。Research、Patent、Slides、Nutrition、Market Research、Codex 等均為 Worker / Skill，不建立額外人格管理負擔。

## Autonomy / Risk Gate

- **Green**: 研究、分析、建立 Task、整理資料、prototype、測試、草稿、淘汰低價值方向 → 自主執行
- **Yellow**: 大型研究、重要 Project 調整、較高運算成本、部分行事曆動作 → 執行並留紀錄，必要時通知
- **Red**: 花錢、重要對外訊息、公開發布、合作承諾、刪除重要資料、重大關係決策、修改憲法 → 必須由本人批准

## Learning

**Conversation is Training.**

有意義的互動萃取為：Fact、Preference/Lesson、Decision。不是把所有聊天全文當成 Agent Memory。

學習來源：
- 經驗學習：Task → Reality Result
- 回饋學習：接受／修改／拒絕
- 觀察學習：AI 版本與本人最終版本差異
- 閱讀學習：Research / 文件 / 課程
- 實驗學習：Hypothesis → Experiment → Measure → Keep/Rollback

時間尺度：Daily Adapt、Weekly Learn、Monthly/Quarterly Evolve。

## Memory Ownership

- ChatGPT Memory：對話個人化
- HY World Database：正式長期記憶
- GitHub：程式碼與 schema，不保存日常私人記憶
- AI Model：可替換的推理引擎

正式 Memory 建議以 PostgreSQL 為主，必要時加入 pgvector。

預期資料物件：agents, missions, memories, lessons, preferences, projects, tasks, decisions, experiments, current_states, desired_states, daily_reports, reviews, next_intents。

## Interfaces

- **ChatGPT**：主要自然語言／語音／圖片／文件互動入口
- **HY World**：視覺化、整理、輸入、決策、Review
- **LINE**：Agent 必要時主動通知本人
- **Codex / Research workers**：雲端執行工作

原則：GPT 進、HY 管、LINE 出。

## HY World UI

保留現有矩陣式分頁骨架，Pixel World 作為 Reality-backed Ambient Agent Monitor，而非唯一導航方式。

目標資訊架構：
- Today — HY Daily、今日行程、Top priorities、Agent work、Needs HY
- World — Pixel World
- Agents — 四分身 Mission / State / Next Intent / Value
- Projects — 長期 Project 與底層 Task Engine
- Life — Constitution / Desired State / Current State / Reality Gap
- Inbox — 只放真正需要本人決策的事項
- Review / Growth — Daily/Weekly/Monthly Review、Self Gap、Learning、Experiments
- Settings — 權限、通知、資料來源、成本

現有 Dispatch 不刪除，逐步降級為 Projects 底層 Task Engine。

## Daily Rhythm

每天固定 HY Daily：今日行程、最重要事項、分身自主工作、Needs HY、HY 今日判斷。

白天只有 Decision / Deadline / Anomaly / Important Opportunity 等必要事件通知。

晚上 Agent 自行做 State Update / Memory / Reflection / Next Intent；本人不必閱讀。

每週進行一次 HY Life Review。

## Core Metrics

1. **Reality Progress ↑** — 現實 HY 是否更接近 Desired State
2. **Autonomous Value ↑** — 多少有效成果是在本人未逐項下令時產生
3. **Human Attention ↓** — 系統需要占用本人多少時間

## First Validation — 950157 Alive

第一個里程碑不是新版 UI 完成，而是：

> 本人沒有逐項派工，950157 自己讀 Mission / Project / State，發現一件值得做的工作，自主研究或調用 Codex 執行，完成大部分工作，只在必要決策點找本人，並產生可延續的 Next Intent。

第一階段優先驗證自主價值，再擴展 Sam、小因與 HY 的完整雙迴圈。

## Migration Principle

不重寫現有 HY World。採 `master` 穩定版 + `life-os-v2` 漸進式改造；現有功能先保留，逐步建立新資料模型與自主 Agent Engine，驗證後再替換舊流程。
