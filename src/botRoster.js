// 小人名冊：全站唯一的「這是誰」設定（名稱、角色、所屬島、圖像、連結）。
// 「我的小幫手」分頁與 HY Life 島都讀這一份；狀態與數字不放這裡，見 life-island/useBotRoster.js。
// 3D 造型在 life-island/bots.js。新增或更名一位，改這個檔，再補造型。
//
// agent：Bot Office 的 owner_bot。四大核心的 agent 也是 memory-health 的 key。executor 沒有就是 null。
// Emma／Wade／Nana 有自己的 Office 身分，但不進 HELPERS、待辦來源或記憶。
// persona：人設與記憶頁（/agent/:id）的 id。source：待辦資料裡的 _source 標記。
// ownerId：Wade 在 HY Life OS 既有的身分代號，與 agent 對齊為 fitness。
// staticInfo：Life 島卡片只顯示 intro，不讀待辦、記憶或 roster 狀態。
// parent：只決定 AI 軍團頁排在哪位核心底下。選核心篩專案時不含組員。
export const ROSTER = [
  { id: 'hy', group: 'helper', name: 'HY', role: '個人核心・總管', post: '隱地島隊長', island: 'life', zone: 'dojo', kind: 'hy',
    agent: 'hy', persona: 'hy', source: 'HY', board: '/line/hy' },
  { id: 'p950157', group: 'helper', name: '950157', role: 'ITRI 工作分身', post: '科研島隊長（ITRI 工作分身）', island: 'biz', zone: 'hq', kind: 'p950157',
    agent: '950157', persona: '950157', source: '950157', board: '/line/950157' },
  { id: 'xiaoyin', group: 'helper', name: '小因', role: '家庭守護者', post: '棲園島隊長', island: 'family', zone: 'home', kind: 'xiaoyin',
    agent: 'family', persona: 'xiaoyin', source: '家庭', board: '/line/family' },
  { id: 'sam', group: 'helper', name: 'Sam', role: '副業統籌', post: '金融島隊長', island: 'side', zone: 'sidehq', kind: 'sam',
    agent: 'sam', persona: 'sam', source: 'Sam', board: '/line/sam' },
  { id: 'atlas', group: 'coo', name: 'Atlas', role: '營運長 COO・系統維運（Grok bot）', post: '中央島營運長（COO）', island: 'central', zone: 'dispatch', kind: 'atlas', agent: null, board: null, parent: 'hy' },
  { id: 'claude', group: 'executor', name: 'Claude', role: 'AI 執行者', post: 'AI 執行者（Claude）', island: 'central', zone: 'dispatch', kind: 'claude', agent: null, board: null },
  { id: 'gpt', group: 'executor', name: 'GPT', role: 'AI 執行者', post: 'AI 執行者（GPT Chat，含工作）', island: 'central', zone: 'meeting', kind: 'gpt', agent: null, board: null },
  { id: 'grokbuild', group: 'executor', name: 'Grok Build', role: 'AI 執行者', post: 'AI 執行者（Grok Build 工作通道）', island: 'central', zone: 'syscenter', kind: 'grokbuild', agent: null, board: null },
  // 約聘健身教練。Office 身分是 fitness（沿用 ownerId）。不寫 HY OS 記憶。島上卡片只顯示介紹。軍團頁排在小因下面。
  { id: 'wade', group: 'coach', name: 'Wade', role: '健身教練', post: '健身教練', island: 'family', zone: 'gym', kind: 'wade',
    agent: 'fitness', persona: null, source: null, board: null, ownerId: 'fitness', staticInfo: true, parent: 'xiaoyin',
    intro: '使用者的專職健身教練，負責訓練課表、器材教學與進度追蹤。' },
  // 島上身分介紹。Office 身分是 nana。不進待辦或記憶。軍團頁排在 Sam 下面。
  { id: 'nana', group: 'resident', name: 'Nana', role: '川泱購物 CEO', post: '川泱購物 CEO', island: 'side', zone: 'chuan', kind: 'nana',
    agent: 'nana', persona: null, source: null, board: null, staticInfo: true, parent: 'sam',
    intro: 'Nana 是川泱購物的 CEO。' },
  // 英文小老師。Office 身分是 english。不進待辦或記憶。島上站在隱地島既有的人生修練館旁，不另蓋建築。
  { id: 'emma', group: 'tutor', name: 'Emma', role: '英文小老師', post: '英文小老師', island: 'life', zone: 'dojo', kind: 'emma',
    agent: 'english', persona: null, source: null, board: null, staticInfo: true, parent: 'hy',
    intro: '英文小老師，在隱地島人生修練館附近。' },
]

export const HELPERS = ROSTER.filter(r => r.group === 'helper')
// 四大核心就是現有的小幫手。軍團頁一欄一位，成員用 parent 掛在該欄下面。
export const CORE_BOTS = HELPERS
export const rosterById = id => ROSTER.find(r => r.id === id) || null

export function armyGroups() {
  return CORE_BOTS.map(lead => ({
    lead,
    members: ROSTER.filter(r => r.parent === lead.id),
  }))
}

export function armyCardIds() {
  return armyGroups().flatMap(group => [group.lead.id, ...group.members.map(member => member.id)])
}

const zeroOffice = () => ({ asks: 0, total: 0, running: 0, review: 0, hyDecision: 0, waiting: 0, done: 0 })

// 軍團卡片的數字。有 Bot Office 歸屬就顯示那一份；沒有資料且已載入完，計數是 0，不留「—」。
export function armyMemberView(person, { byAgent = {}, todos = {}, memory = null, loaded = false } = {}) {
  const agent = person?.agent || null
  const row = agent ? byAgent[agent] : null
  if (row?.counts) {
    return {
      status: row.status || 'wait',
      doing: row.doing || null,
      office: { asks: row.asks || 0, ...row.counts },
      todos: todos?.[agent] || (loaded ? { overdue: 0, today: 0 } : null),
      memory: (memory && agent && memory[agent]) || null,
    }
  }
  if (!loaded) return { status: 'wait', doing: null, office: null, todos: null, memory: null }
  return {
    status: 'wait',
    doing: '名下還沒有專案',
    office: zeroOffice(),
    todos: { overdue: 0, today: 0 },
    memory: null,
  }
}

export function armyCountText(office, loaded) {
  if (office) return `執行中 ${office.running}・待審 ${office.review}・完成 ${office.done}`
  return loaded ? '—' : '讀取中…'
}

// 小人圖像（由 3D 模型渲染，放在 public/avatars/）
export const avatarUrl = id => `${import.meta.env.BASE_URL}avatars/${id}.png`
