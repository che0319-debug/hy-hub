// 頂部狀態列
export const topbar = {
  pendingCount: 2,       // 待我處理數
  systemStatus: "ok"     // "ok" | "partial" | "down"
};

// 首頁摘要
export const homeSummary = {
  greeting: "早安 HY",
};

// Bot 團隊
// status: "running"（執行中）| "idle"（閒置）| "collab"（協作中）| "error"（出錯）
// agent 配置欄位：mock·待接 Claude Managed Agent API 核對（決策 #15）
export const bots = [
  {
    id: "hy", name: "HY", role: "個人核心・總管", username: "@HY_Host_Bot",
    todayDone: 1, cost: 0.05, status: "idle",
    model: "Groq llama-3.3-70b",
    systemPrompt: "個人核心助理，負責個人目標追蹤、行程管理、OKR 回顧與行政雜務協調。（mock）",
    tools: ["milestone add/delete/update_due"],
    mcpServers: [],
    skills: [],
    memory: { scope: "personal", store: "personal_data.json" },
    triggers: ["07:00 個人日報", "09:00 executor", "21:10 history snapshot"],
  },
  {
    id: "xiaoyin", name: "小因", role: "家庭守護者", username: "@HY_MyFamily_bot",
    todayDone: 0, cost: 0.00, status: "idle",
    model: "Gemini 2.5 Flash",
    systemPrompt: "家庭守護助理，負責家庭任務追蹤、居家事務排程與家庭週報產出。（mock）",
    tools: ["milestone CRUD", "採訪框架"],
    mcpServers: [],
    skills: [],
    memory: { scope: "family", store: "family_data.json" },
    triggers: ["09:00 executor", "21:05 history snapshot", "週日 07:30 家庭週包"],
  },
  {
    id: "950157", name: "950157", role: "ITRI 工作分身", username: "",
    todayDone: 2, cost: 0.18, status: "running",
    model: "Gemini 2.5 (primary) + Groq llama-3.3-70b (fallback)",
    systemPrompt: "ITRI 工作分身，協助專案管理、行事曆解析、週報產出與多 executor 任務委派。（mock）",
    tools: ["milestone CRUD", "auto-scheduler", "行事曆截圖匯入", "executor 1/2/3 委派"],
    mcpServers: [],
    skills: [],
    memory: { scope: "950157", store: "progress_data.json" },
    triggers: ["06:25 排程器", "06:30 早安日報", "17:00 下班日報", "09:00 executor", "22:00 Cal 提醒", "週二 11:50 科技週報"],
  },
  {
    id: "sam", name: "Sam", role: "副業統籌", username: "@HY_Sam_bot",
    todayDone: 0, cost: 0.19, status: "idle",
    model: "有 LLM（型號待確認）",
    systemPrompt: "副業統籌助理，負責投資組合追蹤、接案排程、LLM 策略建議與月度結算。（mock）",
    tools: ["milestone add/delete", "executor 1/2/3", "LLM 策略建議", "monthly rollover"],
    mcpServers: [],
    skills: [],
    memory: { scope: "sam", store: "sam_data.json + business_ops" },
    triggers: ["06:00 monthly rollover", "09:30 milestone 提醒", "21:15 history snapshot"],
  },
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

// 今日行程：mock·待接 Google Calendar API（格式為合理猜測，接 API 時須對齊真實回傳）
export const todaySchedule = [
  { id: 'sch-1', time: '09:00', title: 'ITRI 團隊站會',  source: '950157' },
  { id: 'sch-2', time: '11:50', title: '科技週報產出',    source: '950157' },
  { id: 'sch-3', time: '14:00', title: '專案進度審查',    source: '950157' },
  { id: 'sch-4', time: '19:30', title: '家庭時間',        source: '小因'   },
  { id: 'sch-5', time: '21:00', title: '副業策略檢視',    source: 'Sam'    },
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

// ⚠️ 以下三份待校正：內容目視估算，接後端前需拿真實資料對齊
// 卡片 id 加 bot 前綴，防跨 bot _milestoneId 撞 id

export const boardHY = {
  botId: "hy",
  columns: [
    {
      id: "hy-personal",
      name: "個人目標",
      color: "#7c3aed",
      items: [
        { id: "hy-m1", title: "(追蹤) 年度 OKR 回顧", due: "2026-06-30", desc: "", assigned: false },
        { id: "hy-m2", title: "(規劃) 下季學習計畫",  due: "2026-07-01", desc: "", assigned: false }
      ]
    },
    {
      id: "hy-admin",
      name: "行政雜務",
      color: "#0891b2",
      items: [
        { id: "hy-m3", title: "(待辦) 健保卡更新", due: "2026-06-15", desc: "", assigned: false }
      ]
    }
  ]
};

export const boardXiaoyin = {
  botId: "xiaoyin",
  columns: [
    {
      id: "xy-family",
      name: "家庭任務",
      color: "#16a34a",
      items: [
        { id: "xy-m1", title: "(追蹤) 孩子健康檢查", due: "2026-06-20", desc: "", assigned: false },
        { id: "xy-m2", title: "(規劃) 暑假行程",     due: "2026-07-01", desc: "", assigned: false }
      ]
    },
    {
      id: "xy-home",
      name: "居家事務",
      color: "#d97706",
      items: [
        { id: "xy-m3", title: "(待辦) 冷氣保養預約", due: "2026-06-10", desc: "", assigned: false }
      ]
    }
  ]
};

export const boardSam = {
  botId: "sam",
  columns: [
    {
      id: "sam-invest",
      name: "投資組合",
      color: "#ea580c",
      items: [
        { id: "sam-m1", title: "(追蹤) ETF 定期定額", due: "2026-06-05", desc: "", assigned: false },
        { id: "sam-m2", title: "(研究) 新標的評估",   due: "2026-06-30", desc: "", assigned: false }
      ]
    },
    {
      id: "sam-side",
      name: "副業項目",
      color: "#7c3aed",
      items: [
        { id: "sam-m3", title: "(執行) 接案報價", due: "2026-06-08", desc: "", assigned: false }
      ]
    }
  ]
};

// 財務全景：mock·數字全假·結構對齊 HY Excel（待接記帳/副業系統）
export const financeData = {
  currentYear: 2026,
  // 年度歷史（2018-2025 固定假值；2026 由當年收支推導，不寫死）
  yearlyHistory: [
    { year: 2018, passiveIncome: 30000,  totalExpense: 140000 },
    { year: 2019, passiveIncome: 50000,  totalExpense: 150000 },
    { year: 2020, passiveIncome: 70000,  totalExpense: 180000 },
    { year: 2021, passiveIncome: 120000, totalExpense: 200000 },
    { year: 2022, passiveIncome: 160000, totalExpense: 230000 },
    { year: 2023, passiveIncome: 240000, totalExpense: 280000 },
    { year: 2024, passiveIncome: 380000, totalExpense: 320000 },
    { year: 2025, passiveIncome: 150000, totalExpense: 290000 },
  ],
  // 收入源（可加減）category: 本業 / 副業 / 投資 / 被動其他
  incomeSources: [
    { id: 'inc-1', name: '本業薪資',   amount: 80000, category: '本業',   linkable: false },
    { id: 'inc-2', name: '副業-餐飲',  amount: 18000, category: '副業',   linkable: true  },
    { id: 'inc-3', name: '副業-電商',  amount: 22000, category: '副業',   linkable: true  },
    { id: 'inc-4', name: '股票股利',   amount: 8000,  category: '投資',   linkable: false },
    { id: 'inc-5', name: '基金配息',   amount: 12000, category: '投資',   linkable: false },
    { id: 'inc-6', name: '租金收入',   amount: 15000, category: '被動其他', linkable: false },
  ],
  // 支出（可加減）layer: 固定 / 家庭 / 個人
  expenses: [
    { id: 'exp-1', name: '勞健保',   amount: 10000, layer: '固定' },
    { id: 'exp-2', name: '保險',     amount: 5000,  layer: '固定' },
    { id: 'exp-3', name: '房貸',     amount: 60000, layer: '固定' },
    { id: 'exp-4', name: '所得稅',   amount: 8000,  layer: '固定' },
    { id: 'exp-5', name: '教育',     amount: 20000, layer: '家庭' },
    { id: 'exp-6', name: '醫療',     amount: 12000, layer: '家庭' },
    { id: 'exp-7', name: '家庭生活', amount: 30000, layer: '家庭' },
    { id: 'exp-8', name: '個人娛樂', amount: 15000, layer: '個人' },
  ],
};

// 人生目標：mock·七維度三層·人生自由指數（HY 5/30 拍板第一版·接後端前先用此 mock）
// score = Σ(維度進度 × 權重 / 100)，四捨五入
export function computeScore(dimensions) {
  return Math.round(
    dimensions.reduce((sum, d) => sum + (d.progress ?? 0) * (d.weight ?? 0), 0) / 100
  )
}

export const goalsData = {
  freedomIndex: {
    note: '卡在事業 0%、財務 10%；地基穩、續航待強化',
    formula: 'Σ(維度進度 × 權重) · mock · 公式待校準',
  },
  dimensions: [
    // ── 引擎層 engine ──
    { id: 'dim-biz',     layer: 'engine',  name: '事業',       weight: 20, progress:  0,
      totalGoal: '成立複合式跨國企業',              current: '籌備中',
      goals: [ { id: 'g-1', title: '完成一副業',     current: '0', required: true,  achieved: false, owner: 'HY', collaborator: 'sam' } ] },
    { id: 'dim-fin',     layer: 'engine',  name: '財務',       weight: 20, progress: 10,
      totalGoal: '財務自由覆蓋率 100%（被動 ≥ 支出）', current: '覆蓋率 10%（mock）',
      goals: [ { id: 'g-2', title: '資產 > 100 萬',  current: '30 萬', required: false, achieved: false, owner: 'HY', collaborator: 'sam' } ] },
    // ── 地基層 base ──
    { id: 'dim-health',  layer: 'base',    name: '健康',       weight: 15, progress: 50,
      totalGoal: '身體檢查都正常',                  current: '進度 50%（mock）',
      goals: [ { id: 'g-3', title: '每週運動 2 次',  current: '', required: false, achieved: false, owner: 'HY', collaborator: 'xiaoyin' } ] },
    { id: 'dim-family',  layer: 'base',    name: '家庭',       weight: 15, progress: 30,
      totalGoal: '家庭安心與和諧',                  current: '進度 30%（mock）',
      goals: [] },
    { id: 'dim-job',     layer: 'base',    name: '本業（950157）', weight: 5, progress: 60,
      totalGoal: '可準時下班',                      current: '現金牛·維運中',
      goals: [ { id: 'g-job-1', title: '維持可準時下班', current: '', required: false, achieved: false, owner: 'HY', collaborator: '950157' } ] },
    // ── 續航層 sustain ──
    { id: 'dim-leisure', layer: 'sustain', name: '休閒',        weight: 15, progress: 20,
      totalGoal: '滿足新體驗',                      current: '進度 20%（mock）',
      goals: [
        { id: 'g-4', title: '每月吃一家新餐廳',       current: '', required: false, achieved: true,  owner: 'HY', collaborator: null },
        { id: 'g-5', title: '每季去台灣一個地方旅遊', current: '', required: false, achieved: false, owner: 'HY', collaborator: null },
        { id: 'g-6', title: '每年出國一次',           current: '', required: false, achieved: false, owner: 'HY', collaborator: null },
      ] },
    { id: 'dim-growth',  layer: 'sustain', name: '成長',        weight: 10, progress: 40,
      totalGoal: '提升新知識',                      current: '進度 40%（mock）',
      goals: [ { id: 'g-7', title: '每季線上學習一次', current: '', required: false, achieved: false, owner: 'HY', collaborator: null } ] },
  ],
};
