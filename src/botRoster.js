// 小人名冊：全站唯一的「這是誰」設定（名稱、角色、所屬島、圖像、連結）。
// 「我的小幫手」分頁與 HY Life 島都讀這一份；狀態與數字不放這裡，見 life-island/useBotRoster.js。
// 3D 造型在 life-island/bots.js。新增或更名一位，改這個檔，再補造型。
//
// agent：後端用的代號（Bot Office 的 owner_bot、memory-health 的 key）。executor 沒有就是 null。
// persona：人設與記憶頁（/agent/:id）的 id。source：待辦資料裡的 _source 標記。
// ownerId：身份代號。只有 group === 'helper' 的 agent 會進專案歸屬與記憶；coach 的 ownerId 不進那些對照。
// staticInfo：Life 島卡片只顯示 intro，不讀 Bot Office、待辦、記憶或 roster 狀態。
export const ROSTER = [
  { id: 'hy', group: 'helper', name: 'HY', role: '個人核心・總管', post: '隱地島隊長', island: 'life', zone: 'dojo', kind: 'hy',
    agent: 'hy', persona: 'hy', source: 'HY', board: '/line/hy' },
  { id: 'p950157', group: 'helper', name: '950157', role: 'ITRI 工作分身', post: '科研島隊長（ITRI 工作分身）', island: 'biz', zone: 'hq', kind: 'p950157',
    agent: '950157', persona: '950157', source: '950157', board: '/line/950157' },
  { id: 'xiaoyin', group: 'helper', name: '小因', role: '家庭守護者', post: '棲園島隊長', island: 'family', zone: 'home', kind: 'xiaoyin',
    agent: 'family', persona: 'xiaoyin', source: '家庭', board: '/line/family' },
  { id: 'sam', group: 'helper', name: 'Sam', role: '副業統籌', post: '金融島隊長', island: 'side', zone: 'sidehq', kind: 'sam',
    agent: 'sam', persona: 'sam', source: 'Sam', board: '/line/sam' },
  { id: 'atlas', group: 'coo', name: 'Atlas', role: '營運長 COO・系統維運（Grok bot）', post: '中央島營運長（COO）', island: 'central', zone: 'dispatch', kind: 'atlas', agent: null, board: null },
  { id: 'claude', group: 'executor', name: 'Claude', role: 'AI 執行者', post: 'AI 執行者（Claude）', island: 'central', zone: 'dispatch', kind: 'claude', agent: null, board: null },
  { id: 'gpt', group: 'executor', name: 'GPT', role: 'AI 執行者', post: 'AI 執行者（GPT Chat，含工作）', island: 'central', zone: 'meeting', kind: 'gpt', agent: null, board: null },
  { id: 'grokbuild', group: 'executor', name: 'Grok Build', role: 'AI 執行者', post: 'AI 執行者（Grok Build 工作通道）', island: 'central', zone: 'syscenter', kind: 'grokbuild', agent: null, board: null },
  // 約聘健身教練。沒有 Bot Office 專案，也不寫 HY OS 記憶。只出現在 Life 島，駐點是棲園島的健身房。
  { id: 'wade', group: 'coach', name: 'Wade', role: '健身教練', post: '健身教練', island: 'family', zone: 'gym', kind: 'wade',
    agent: null, persona: null, source: null, board: null, ownerId: 'fitness', staticInfo: true,
    intro: '使用者的專職健身教練，負責訓練課表、器材教學與進度追蹤。' },
]

export const HELPERS = ROSTER.filter(r => r.group === 'helper')
export const rosterById = id => ROSTER.find(r => r.id === id) || null
// 小人圖像（由 3D 模型渲染，放在 public/avatars/）
export const avatarUrl = id => `${import.meta.env.BASE_URL}avatars/${id}.png`
