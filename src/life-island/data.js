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
      id: 'syscenter', title: '系統中心', type: 'system', form: 'lighthouse', height: 3.0, q: -2, r: 0,
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

export const FIGURES = [
  { id: 'atlas', name: 'Atlas', tribe: 'grok', q: 1, r: 0, dx: 0.1, dz: 0.5, wave: true },
];
