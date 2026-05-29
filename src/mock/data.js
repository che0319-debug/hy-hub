// 頂部狀態列
export const topbar = {
  pendingCount: 2,       // 待我處理數
  todayCost: 0.42,       // 今日花費 (USD)
  systemStatus: "ok"     // "ok" | "partial" | "down"
};

// 首頁摘要
export const homeSummary = {
  date: "2026-05-28",
  greeting: "早安 HY",
  pendingCount: 2,
  todayDone: 3,
  todayCost: 0.42
};

// Bot 團隊
// status: "running"（執行中）| "idle"（閒置）| "collab"（協作中）| "error"（出錯）
export const bots = [
  { id: "hy",       name: "HY",     role: "個人核心・總管", username: "@HY_Host_Bot",     todayDone: 1, cost: 0.05, status: "idle" },
  { id: "xiaoyin",  name: "小因",   role: "家庭守護者",     username: "@HY_MyFamily_bot", todayDone: 0, cost: 0.00, status: "idle" },
  { id: "950157",   name: "950157", role: "ITRI 工作分身",  username: "",                 todayDone: 2, cost: 0.18, status: "running" },
  { id: "sam",      name: "Sam",    role: "副業統籌",       username: "@HY_Sam_bot",      todayDone: 0, cost: 0.19, status: "idle" }
];

// 派工 Session 清單
// status: "pending"（待派發）| "running"（執行中）| "await"（等我確認）| "done"（完成）| "failed"（失敗）
export const sessions = [
  { id: 42, title: "確認備忘錄", sourceMilestone: "北海岸海鮮拜訪", assignee: "950157",  status: "await"   },
  { id: 41, title: "拜訪重點",   sourceMilestone: "北海岸海鮮拜訪", assignee: "950157",  status: "running" },
  { id: 40, title: "週報整理",   sourceMilestone: null,             assignee: "日報助理", status: "running" },
  { id: 39, title: "行事曆解析", sourceMilestone: null,             assignee: "950157",  status: "done"    },
  { id: 37, title: "LLM 解析",   sourceMilestone: null,             assignee: "小因",    status: "failed"  }
];

// ⚠️ 此結構為目視截圖估算，非真實 progress_data.json
// 待校正：未來接後端前，需拿真實 schema 對齊，不一致就改這裡
// column 對應現有 dashboard 的「專案」，items 對應「milestone」
export const board950157 = {
  botId: "950157",
  columns: [
    {
      id: "fy117",
      name: "FY117 新期程計畫",
      color: "#2563eb",
      items: [
        { id: "m1", title: "(執行) 規劃簡報",  due: "2026-06-05", desc: "要去跟技術司溝通的簡報", assigned: false },
        { id: "m2", title: "(追蹤) 靈巧手 KPI", due: "2026-05-29", desc: "",                       assigned: false }
      ]
    },
    {
      id: "haptic",
      name: "Haptic 年度計畫",
      color: "#16a34a",
      items: [
        { id: "m3", title: "(追蹤) 雙周報 review", due: "2026-06-04", desc: "", assigned: false }
      ]
    },
    {
      id: "temp",
      name: "臨時任務區",
      color: "#7c3aed",
      items: [
        { id: "m4", title: "(0630) 健康檢查", due: "2026-06-30", desc: "", assigned: false }
      ]
    }
  ]
};
