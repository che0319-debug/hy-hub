// Work Lab 示意資料：只在開發／截圖時使用，內容為版面示意，不是真實專案資料。

const today = new Date()
const d = n => { const x = new Date(today); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10) }
const t = (n, h = 10) => `${d(n)}T${String(h).padStart(2, '0')}:15:00+08:00`

const TEAM = [
  { role: '專案經理（PI）', lead: true, status: '在職', persona: '消費品牌商轉的專案經理，先定可檢查的驗收標準再派工，審查時追問假設是否會讓結論失效。', skills: ['SK-plan', 'SK-review'], deliverables: '每期問題 2 週內可回答；任務有可檢查的完成標準；審查意見具體可執行。', now: '審查 tk-a2：品牌故事 v2', updated: t(0, 9) },
  { role: '品牌策略師', status: '在職', persona: '烘焙與禮盒品牌策略，擅長把定位寫成可直接用的文案。', skills: ['SK-content', 'SK-research'], deliverables: '完整可用的稿件；與 HY 先前回饋一致。', now: 'tk-a3 v1 待審', updated: t(0, 8) },
  { role: '市場研究員', status: '在職', persona: '區域市場與通路研究，所有數字標來源或標為假設。', skills: ['SK-research'], deliverables: '比較表＋結論；每個主張標 evidence。', now: '受阻：缺門市實際客單價', updated: t(-2, 15) },
]

const TASKS = [
  { id: 'tk-a1', title: '新竹烘焙禮盒競品定位表', role: '市場研究員', skill: 'SK-research', status: '完成', version: 2, acceptance: ['≥ 8 個競品', '每個競品標價格帶與通路', '寫出 3 個可切入的空白'], output_path: 'outputs/wl-demo01/tk-a1_v2.md', method: '公開官網與電商頁面整理，價格以官網標價為準。', evidence: [{ claim: '競品價格帶', kind: '外部資料', source: '各品牌官網（待補連結）' }, { claim: '目標客群月消費頻率', kind: '假設', source: '' }], review: { by: '專案經理（PI）', verdict: '通過', notes: '第二版補齊通路欄，結論與表格一致。', version: 2, ts: t(-1, 11) } },
  { id: 'tk-a2', title: '品牌故事稿（600 字）', role: '品牌策略師', skill: 'SK-content', status: '待審', version: 2, acceptance: ['完整稿 550–650 字', '不得出現價格', '與 HY 9/28 回饋一致'], output_path: 'outputs/wl-demo01/tk-a2_v2.md', method: '依競品表的空白定位改寫。', evidence: [{ claim: '品牌創立年份', kind: '假設', source: '' }], review: { by: '專案經理（PI）', verdict: '退回', notes: '第三段提到「平價」與限制「不得對外報價」的精神衝突，請改成價值描述。', version: 1, ts: t(-1, 16) } },
  { id: 'tk-a3', title: '上市檢核清單補齊三項未驗證項目', role: '品牌策略師', skill: 'SK-plan', status: '進行中', version: 0, acceptance: ['每項有負責角色與完成標準'], output_path: null, evidence: [] },
  { id: 'tk-a4', title: '門市客單價與回購假設驗證', role: '市場研究員', skill: 'SK-research', status: '受阻', version: 0, acceptance: ['給出客單價區間與來源'], blocked_reason: '需要 HY 提供既有門市的實際客單價，公開資料查不到。', blocked_at: t(-2, 15), evidence: [] },
  { id: 'tk-a5', title: '禮盒命名候選 10 個', role: '品牌策略師', skill: 'SK-content', status: '待辦', version: 0, acceptance: ['10 個候選＋各一句理由'], evidence: [] },
]

const CYCLE = { id: 'cy-demo01', project: 'wl-demo01', no: 1, question: '川嶼在新竹禮盒市場要用什麼定位切入，才能讓上市檢核清單的三個未驗證項目有答案？', status: '進行中', start: d(-6), end: d(8), assumptions: ['首發市場為新竹', '不做對外報價'], tasks: TASKS }

const PROJECTS = {
  'wl-demo01': {
    id: 'wl-demo01', name: '川嶼蛋糕商轉（示意）', status: '進行中', goal: '完成商轉前的定位、品牌內容與上市檢核。', scope: '品牌定位、文案、上市檢核；不含生產排程。', acceptance: ['上市檢核清單全部項目有答案', '品牌故事定稿'], deadline: '2026-12', constraints: ['不得對外報價', '不得對外聯繫廠商'], hy_context: '（匯入後顯示 HY 在 AI Work 已回答的事項）', team: TEAM, cycles: ['cy-demo01'], current_cycle: 'cy-demo01', reports: [], updated: t(0, 9),
  },
  'wl-demo02': {
    id: 'wl-demo02', name: '姿音行銷服務包（示意）', status: '規劃中', goal: '定義第一個可販售的行銷服務包。', scope: '', acceptance: ['服務包內容與交付清單'], deadline: '', constraints: ['不得對外報價'], hy_context: '', team: [], cycles: [], current_cycle: null, reports: [], updated: t(0, 7),
  },
}

const ITEMS = {
  'wl-demo01': {
    decisions: [
      { id: 'de-g1', kind: 'general', state: 'open', title: '首發通路先做門市自取還是宅配？', body: '市場研究員受阻在客單價；PI 建議先決定通路，才能縮小研究範圍。', options: ['門市自取', '宅配', '兩者都做'], recommendation: '門市自取', due: d(-1), by: '專案經理（PI）', ts: t(-3) },
    ],
    feedback: [
      { id: 'fb-1', target: 'tk-a1', text: '競品表加一欄「是否有企業禮盒方案」。', state: '待你驗收', accepted: true, reply: '採納。已在 tk-a1 v2 加入「企業禮盒」欄，8 個競品中 3 個有方案，並把它列為第 3 個切入空白。', thread: [{ by: 'HY', text: '競品表加一欄「是否有企業禮盒方案」。', ts: t(-2, 9) }, { by: '專案經理（PI）', text: '採納。已在 tk-a1 v2 加入「企業禮盒」欄，8 個競品中 3 個有方案，並把它列為第 3 個切入空白。', ts: t(-1, 10), accepted: true }], ts: t(-2, 9) },
    ],
    ratings: [],
  },
  'wl-demo02': {
    decisions: [
      { id: 'de-p1', kind: 'plan_approval', state: 'open', title: '核准專案規劃', body: '先用一期回答「哪一個服務包最容易在 30 天內成交第一個客戶」。拆成三個任務：盤點既有能力、競品服務包、服務包草案。假設：不對外報價、不聯繫客戶。', options: ['approve', 'reject'], recommendation: 'approve', due: d(2), by: '專案經理（PI）', ts: t(0, 7),
        draft: { team: [{ role: '專案經理（PI）', lead: true, persona: '行銷服務專案經理', skills: ['SK-plan', 'SK-review'], deliverables: '問題可回答' }, { role: '服務設計師', persona: '中小企業行銷服務設計', skills: ['SK-research', 'SK-content'], deliverables: '服務包草案' }], cycle: { question: '哪一個服務包最容易在 30 天內成交第一個客戶？', days: 14, assumptions: ['不對外報價'], tasks: [{ title: '盤點既有能力與案例', role: '服務設計師', skill: 'SK-research', acceptance: ['≥ 5 項能力，每項附案例或標待補'] }, { title: '競品服務包比較', role: '服務設計師', skill: 'SK-research', acceptance: ['≥ 6 家，表格比較內容與交付'] }, { title: '服務包草案 2 版', role: '服務設計師', skill: 'SK-content', acceptance: ['兩版各含內容、交付、時程'] }] } } },
    ],
    feedback: [], ratings: [],
  },
}

const LOGS = [
  { ts: t(0, 9), actor: '專案經理（PI）', action: '領取審查 tk-a2 v2', why: '', cred: '審查' },
  { ts: t(-1, 16), actor: '專案經理（PI）', action: '審查 tk-a2 v1：退回', why: '第三段提到「平價」與限制精神衝突', cred: '審查' },
  { ts: t(-1, 11), actor: '專案經理（PI）', action: '審查 tk-a1 v2：通過', why: '補齊通路欄', cred: '審查' },
  { ts: t(-1, 10), actor: '專案經理（PI）', action: '回覆建議 fb-1：採納', why: '加入企業禮盒欄', cred: '決策' },
  { ts: t(-2, 15), actor: '市場研究員', action: '任務受阻 tk-a4', why: '需要實際客單價', cred: '假設' },
  { ts: t(-2, 9), actor: 'HY', action: '給建議（tk-a1）', why: '競品表加一欄企業禮盒', cred: '決策' },
  { ts: t(-6, 10), actor: 'HY', action: '核准：核准專案規劃', why: '', cred: '決策' },
]

const FILES = {
  'outputs/wl-demo01/tk-a1_v2.md': '# 新竹烘焙禮盒競品定位表 v2\n\n> 示意內容，僅供版面參考。\n\n| 品牌 | 價格帶 | 通路 | 企業禮盒 |\n|---|---|---|---|\n| 競品 A | 中高 | 門市＋宅配 | 有 |\n| 競品 B | 中 | 門市 | 無 |\n| 競品 C | 高 | 宅配 | 有 |\n\n## 可切入的空白\n1. 在地食材故事尚無品牌主打\n2. 小份量多口味組合\n3. 中小企業節慶禮盒',
  'outputs/wl-demo01/tk-a2_v2.md': '# 品牌故事 v2\n\n> 示意內容，僅供版面參考。\n\n（品牌故事全文約 600 字，此處省略。）',
}

const state = { PROJECTS, ITEMS, CYCLES: { 'cy-demo01': CYCLE } }

function overview() {
  const projects = Object.values(state.PROJECTS).map(p => {
    const c = state.CYCLES[p.current_cycle]
    const counts = { 待辦: 0, 進行中: 0, 待審: 0, 退回: 0, 完成: 0, 受阻: 0 }
    c?.tasks.forEach(x => counts[x.status]++)
    const it = state.ITEMS[p.id]
    const health = p.id === 'wl-demo01' ? '卡住' : (it.decisions.some(x => x.state === 'open') ? '需關注' : '正常')
    return { id: p.id, name: p.name, status: p.status, health, cycle: c ? { id: c.id, no: c.no, question: c.question, status: c.status, end: c.end } : null, task_counts: counts, pending_feedback: 0, updated: p.updated }
  })
  const all = pid => state.ITEMS[pid]
  const decisions = [], feedback = [], toRate = [], ratings = []
  for (const p of Object.values(state.PROJECTS)) {
    all(p.id).decisions.filter(x => x.state === 'open').forEach(x => decisions.push({ ...x, project: p.id, project_name: p.name }))
    all(p.id).feedback.filter(x => x.state === '待你驗收').forEach(x => feedback.push({ ...x, project: p.id, project_name: p.name }))
    ratings.push(...all(p.id).ratings)
    const rated = new Set(all(p.id).ratings.map(r => r.task_id))
    state.CYCLES[p.current_cycle]?.tasks.filter(x => x.status === '完成' && !rated.has(x.id) && !x.rating_skipped)
      .forEach(x => toRate.push({ project: p.id, project_name: p.name, task_id: x.id, title: x.title, role: x.role, skill: x.skill, version: x.version }))
  }
  const q = rows => {
    const avg = k => rows.length ? +(rows.reduce((s, r) => s + r.scores[k], 0) / rows.length).toFixed(2) : null
    const o = { count: rows.length, 正確性: avg('正確性'), 完成度: avg('完成度'), 一致性: avg('一致性') }
    o.平均 = rows.length ? +((o.正確性 + o.完成度 + o.一致性) / 3).toFixed(2) : null
    o.可用度 = { 直接用: rows.filter(r => r.usability === '直接用').length, 小修: rows.filter(r => r.usability === '小修').length, 重做: rows.filter(r => r.usability === '重做').length }
    return o
  }
  const group = key => Object.fromEntries([...new Set(ratings.map(r => r[key]))].map(k => [k, q(ratings.filter(r => r[key] === k))]))
  return {
    projects, decisions, feedback_to_accept: feedback, to_rate: toRate,
    alerts: [
      { level: 'bad', text: '決策逾期：首發通路先做門市自取還是宅配？', ref: 'de-g1', project: 'wl-demo01', project_name: '川嶼蛋糕商轉（示意）' },
      { level: 'bad', text: '任務受阻超過 24 小時：門市客單價與回購假設驗證', ref: 'tk-a4', project: 'wl-demo01', project_name: '川嶼蛋糕商轉（示意）' },
    ],
    reports: [], quality: { all: q(ratings), by_skill: group('skill'), by_role: group('role') }, last_run: t(0, 9),
  }
}

export async function mockCall(path, { method, body, params }) {
  await new Promise(r => setTimeout(r, 120))
  let m
  if (path === '/overview') return overview()
  if (path === '/file') return { path: params.path, markdown: FILES[params.path] || '（示意：檔案內容）' }
  if (path === '/projects' && method === 'POST') {
    const id = 'wl-new' + Object.keys(state.PROJECTS).length
    state.PROJECTS[id] = { id, ...body, status: '規劃中', team: [], cycles: [], current_cycle: null, reports: [], acceptance: body.acceptance || [], constraints: body.constraints || [] }
    state.ITEMS[id] = { decisions: [], feedback: [], ratings: [] }
    return state.PROJECTS[id]
  }
  if ((m = path.match(/^\/projects\/([^/]+)$/))) {
    const p = state.PROJECTS[m[1]]
    if (method === 'PATCH') { Object.assign(p, body); return p }
    return { project: p, cycle: state.CYCLES[p.current_cycle] || null, items: state.ITEMS[p.id], logs: p.id === 'wl-demo01' ? LOGS : [], alerts: overview().alerts.filter(a => a.project === p.id) }
  }
  if ((m = path.match(/^\/projects\/([^/]+)\/decisions\/([^/]+)$/))) {
    const dec = state.ITEMS[m[1]].decisions.find(x => x.id === m[2])
    Object.assign(dec, { state: 'decided', answer: body.answer, comment: body.comment })
    return dec
  }
  if ((m = path.match(/^\/projects\/([^/]+)\/feedback$/))) {
    const fb = { id: 'fb-' + Date.now(), target: body.target, text: body.text, state: '待處理', thread: [{ by: 'HY', text: body.text, ts: new Date().toISOString() }] }
    state.ITEMS[m[1]].feedback.push(fb)
    return fb
  }
  if ((m = path.match(/^\/projects\/([^/]+)\/feedback\/([^/]+)$/))) {
    const fb = state.ITEMS[m[1]].feedback.find(x => x.id === m[2])
    fb.state = body.action === 'close' ? '已結案' : '再議'
    return fb
  }
  if ((m = path.match(/^\/projects\/([^/]+)\/tasks\/([^/]+)\/rating$/))) {
    const task = state.CYCLES[state.PROJECTS[m[1]].current_cycle].tasks.find(x => x.id === m[2])
    if (body.skip) { task.rating_skipped = true; return { skipped: true } }
    const r = { task_id: task.id, skill: task.skill, role: task.role, ...body }
    state.ITEMS[m[1]].ratings.push(r)
    return r
  }
  throw new Error('示意模式不支援：' + path)
}
