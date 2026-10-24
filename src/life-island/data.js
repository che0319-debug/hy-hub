// HY Life 島：世界定義（V5.1 第三部分「世界定義表」）。目前只建「中央島」。
// route = 現有的 2D 頁；沒有的寫 null 並在 note 說明。沒有真資料的欄位一律「待補」，不編造。
export const CENTRAL_ISLAND = {
  id: 'central', name: '中央島', sub: '派工 · Atlas', c: [0, 0], R: 4,
  buildings: [
    {
      id: 'today', title: '今日廣場', type: 'system', form: 'plaza', height: 3.0, q: 0, r: 0,
      kind: '功能', agent: 'Atlas', status: '新做',
      blurb: '今天要看的事：今日行程、待辦清單、本週變化。',
      links: [{ label: '開啟首頁（現有）', to: '/' }],
      note: '整合進來後，首頁的資訊都從這裡看；開啟 HY Life 島時不會彈出。',
    },
    {
      id: 'dispatch', title: '派工坊', type: 'system', form: 'dispatch', height: 2.6, q: 2, r: -2,
      kind: '功能', agent: 'Atlas', status: '現有',
      blurb: '全部專案的派工、執行、審查與驗收。',
      links: [{ label: '開啟 AI Office', to: '/ai-work-v5' }],
      note: '之後 AI Office 會改名為 Bot Office。',
    },
    {
      id: 'meeting', title: '會議帳篷', type: 'business', form: 'meeting', height: 1.5, q: 0, r: 2,
      kind: '功能', agent: 'Atlas', status: '待補',
      blurb: '晨會紀錄與你的 comment。',
      links: [],
      note: '目前晨會用對話進行，還沒有網頁；之後讀第二部分的晨會卡片。',
    },
    {
      id: 'syscenter', title: '系統中心', type: 'system', form: 'syscenter', height: 3.0, q: -2, r: 0,
      kind: '管理', agent: 'Atlas', status: '現有',
      blurb: '管理系統用的頁面：架構、專家團、設定、Agent 設定。',
      links: [
        { label: '系統架構', to: '/system-architecture' },
        { label: '專家團', to: '/expert-team' },
        { label: '設定', to: '/settings' },
      ],
      note: '還沒連上的頁先放這裡，慢慢接。',
    },
  ],
};

// 五位 Agent。展示階段全部先在中央島活動，之後各自搬到自己的島。
// status：wait / ai / you / done / bad。zone：平常活動的建築區。status 是 you 或 bad 的會停在原地等你。
// board：該 Bot 專屬看板（待辦）。對話功能之後再建。
// doing／last 目前是範例文字，等資料契約定案後換成真資料。
export const FIGURES = [
  { id: 'atlas', name: 'Atlas', kind: 'atlas', status: 'ai', zone: 'dispatch', role: '中央島隊長（主 Grok Bot）', board: null,
    doing: '分派今天的工作包給各 Bot', last: '早上整理了晨會待辦' },
  { id: 'xiaoyin', name: '小因', kind: 'xiaoyin', status: 'wait', zone: 'syscenter', role: '家庭島隊長', board: '/line/family',
    doing: '追蹤家裡這週的行程', last: '更新了小孩接送時間' },
  { id: 'sam', name: 'Sam', kind: 'sam', status: 'you', zone: 'today', role: '副業島隊長', board: '/line/sam',
    doing: '等你確認一張補件卡', last: '整理了手機店的庫存' },
  { id: 'p950157', name: '950157', kind: 'p950157', status: 'done', zone: 'meeting', role: '本業島隊長（ITRI 工作分身）', board: '/line/950157',
    doing: '剛完成月報初稿', last: '整理了研究院的待辦' },
  { id: 'hy', name: 'HY', kind: 'hy', status: 'bad', zone: 'syscenter', role: '人生島隊長', board: '/line/hy',
    doing: '有一項任務逾期，需要處理', last: '更新了人生目標進度' },
];

// 狀態色的意義（全站一致，見 hy-ui 風格 A）
export const STATUS_INFO = {
  wait: '等待／追蹤中',
  ai: 'AI 執行中',
  you: '待你確認',
  done: '完成',
  bad: '逾期／失敗／危險',
};

// 頂部狀態列的數字。目前是範例數字，等資料契約（Part 2）定案後換成真資料。
export const WORLD_STATUS = {
  overdue: 2,      // A：逾期待辦（首頁待辦清單）
  today: 3,        // A：今日到期待辦
  needsYou: 1,     // B：Bot Office 待你確認
  systemIssues: 0, // C：系統異狀
  demo: true,
};
