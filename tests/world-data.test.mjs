import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveOffice, deriveTodos, deriveRunners, deriveSummary, deriveAtlas, deriveAttention, todoMarker, RUNNER_FIG, LIVE_FIGS, OWNER_BOT_ORDER, ownerBotChoices, ownerBotGroups, matchesOwnerFilter, canonicalOwnerBot } from '../src/life-island/worldData.js'
import { ROSTER, HELPERS } from '../src/botRoster.js'
import { mapOffice, officeTeam } from '../src/botOfficeData.js'
import { readFileSync } from 'node:fs'
import { FIGURES, FAMILY_ISLAND, buildingWorld, figureHome, figureFront, islandBotCard } from '../src/life-island/data.js'
import { BOT_COLORS, WADE_LOOK, LEADER_BADGE_COLOR, makeBot } from '../src/life-island/bots.js'
import { MeshBasicMaterial } from 'three'

const office = mapOffice({
  updated: '2026-10-25T08:00:00+08:00',
  buildings: [
    { id: 'a', title: '觸覺手套簡報', owner_bot: '950157', stage: 'running' },
    { id: 'b', title: '月報', owner_bot: '950157', stage: 'done' },
    { id: 'c', title: '補件卡', owner_bot: 'sam', stage: 'assigned' },
    { id: 'd', title: '家庭週末安排', owner_bot: 'family', stage: 'review' },
    { id: 'e', title: '沒有歸屬的專案', stage: 'running' },
    { id: 'f', title: '被退回', owner_bot: 'hy', stage: 'returned' },
  ],
  decisions: [{ id: 'd1', project: 'c', status: 'open', title: '要不要補件', kind: 'approval', questions: [] }],
}, { cards: [] })

test('名冊：四位小幫手＋執行者、Atlas 與 Emma，id 不重複', () => {
  assert.equal(HELPERS.length, 4)
  assert.equal(ROSTER.filter(r => r.group === 'executor').length, 3)
  assert.equal(ROSTER.filter(r => r.group === 'coo').length, 1)
  assert.equal(ROSTER.filter(r => r.group === 'tutor').length, 1)
  assert.equal(ROSTER.length, 11)
  assert.equal(new Set(ROSTER.map(r => r.id)).size, 11)
  assert.deepEqual(HELPERS.map(h => h.agent), ['hy', '950157', 'family', 'sam'])
})

test('Wade 在 Life 島名單，駐在健身房，Office 身分是 fitness，卡片不讀即時資料', () => {
  const wade = ROSTER.find(r => r.id === 'wade')
  assert.ok(wade)
  assert.equal(wade.name, 'Wade')
  assert.equal(wade.ownerId, 'fitness')
  assert.equal(wade.role, '健身教練')
  assert.equal(wade.group, 'coach')
  assert.equal(wade.agent, 'fitness')
  assert.equal(wade.staticInfo, true)
  assert.equal(wade.parent, 'xiaoyin')
  assert.equal(HELPERS.some(h => h.id === 'wade' || h.agent === 'fitness' || h.ownerId === 'fitness'), false)
  assert.equal(OWNER_BOT_ORDER.includes('fitness'), true)
  assert.equal(OWNER_BOT_ORDER.includes('wade'), false)
  assert.equal(ownerBotChoices().some(c => c.value === 'fitness' && c.label === 'Wade'), true)
  assert.equal(ownerBotChoices().some(c => c.value === 'wade'), false)
  assert.equal(canonicalOwnerBot('fitness'), 'fitness')
  assert.equal(canonicalOwnerBot('wade'), '')
  assert.equal(LIVE_FIGS.has('wade'), false)
  assert.equal(LIVE_FIGS.has('fitness'), false)

  const fig = FIGURES.find(f => f.id === 'wade')
  assert.equal(fig.kind, 'wade')
  assert.equal(fig.island, 'family')
  assert.equal(fig.zone, 'gym')
  assert.equal(fig.staticInfo, true)
  const gym = buildingWorld('family', 'gym')
  const spot = figureHome(fig)
  assert.deepEqual(spot, gym)
  assert.deepEqual(gym, { x: FAMILY_ISLAND.c[0] + 4, z: FAMILY_ISLAND.c[1] })
  const index = FIGURES.findIndex(f => f.id === 'wade')
  const front = figureFront(spot, index)
  const dist = (p, q) => Math.hypot(p.x - q.x, p.z - q.z)
  assert.ok(dist(front, gym) > 1.5 && dist(front, gym) < 6, `front ${front.x},${front.z}`)
  for (const b of FAMILY_ISLAND.buildings) {
    if (b.id === 'gym') continue
    const p = buildingWorld('family', b.id)
    assert.ok(dist(front, gym) < dist(front, p), b.id)
    assert.ok(dist(spot, gym) < dist(spot, p), b.id)
  }

  assert.equal(WADE_LOOK.body, 0xf63898)
  assert.equal(WADE_LOOK.eye, 0xffffff)
  assert.equal(WADE_LOOK.body, BOT_COLORS.xiaoyin)
  assert.notEqual(WADE_LOOK.body, BOT_COLORS.hy)
  assert.notEqual(WADE_LOOK.body, BOT_COLORS.gpt)
  const mesh = makeBot('wade', new MeshBasicMaterial(), null, 'wait')
  assert.equal(mesh.kind, 'wade')

  let reads = 0
  const live = new Proxy({ status: 'you', doing: 'LIVE_PROBE', office: { done: 1 }, todos: { overdue: 1, today: 1 }, memory: { memory_last: 'x' } }, {
    get(target, key) { reads += 1; return target[key] },
  })
  const card = islandBotCard(fig, live, false)
  assert.equal(reads, 0)
  assert.equal(card.staticInfo, true)
  assert.equal(card.name, 'Wade')
  assert.equal(card.role, '健身教練')
  assert.match(card.intro, /專職健身教練/)
  assert.match(card.intro, /訓練課表/)
  assert.equal(card.status, undefined)
  assert.equal(card.doing, undefined)
  assert.equal(JSON.stringify(card).includes('LIVE_PROBE'), false)
  assert.equal(JSON.stringify(card).includes('載入'), false)
  assert.equal(JSON.stringify(card).includes('讀不到'), false)

  const off = deriveOffice({ projects: [{ id: 'g', title: '課表', ownerBot: 'fitness', stage: 'running' }, { id: 'fam', title: '家庭', ownerBot: 'family', stage: 'assigned' }], decisions: [], totals: { pending: 0 } })
  assert.equal(off.byAgent.fitness.counts.running, 1)
  assert.equal(off.byAgent.fitness.counts.total, 1)
  assert.equal(off.byAgent.family.counts.running, 0)
  assert.equal(off.byAgent.family.counts.waiting, 1)
  assert.equal(off.byAgent.wade, undefined)
  assert.equal(off.unowned, 0)
  assert.equal(officeTeam({ id: 'g', owner_bot: 'fitness' }).find(m => m.role === '負責 Bot').name, 'Wade')
})

test('Nana 島上只介紹身分，Office 身分是 nana，不算 Sam 的專案', () => {
  const nana = ROSTER.find(r => r.id === 'nana')
  const fig = FIGURES.find(f => f.id === 'nana')
  assert.equal(nana.post, '川泱購物 CEO')
  assert.equal(nana.agent, 'nana')
  assert.equal(nana.board, null)
  assert.equal(nana.parent, 'sam')
  assert.equal(HELPERS.includes(nana), false)
  assert.equal(LIVE_FIGS.has('nana'), false)
  assert.equal(canonicalOwnerBot('nana'), 'nana')
  assert.equal(fig.island, 'side')
  assert.equal(fig.zone, 'chuan')
  assert.equal(fig.status, 'wait')
  assert.deepEqual(figureHome(fig), buildingWorld('side', 'chuan'))
  const live = new Proxy({}, { get() { throw new Error('Nana must not read live data') } })
  assert.deepEqual(islandBotCard(fig, live, false), {
    staticInfo: true, name: 'Nana', role: '川泱購物 CEO', intro: 'Nana 是川泱購物的 CEO。',
  })
  const office = deriveOffice({ projects: [{ id: 'p-002', ownerBot: 'sam', stage: 'running' }, { id: 'ny', title: '川泱', ownerBot: 'nana', stage: 'review' }], decisions: [], totals: { pending: 0 } })
  assert.equal(office.byAgent.sam.counts.running, 1)
  assert.equal(office.byAgent.nana.counts.review, 1)
  assert.equal(office.byAgent.nana.counts.running, 0)
  assert.equal(office.unowned, 0)
  assert.equal(officeTeam({ id: 'ny', owner_bot: 'nana' }).find(m => m.role === '負責 Bot').name, 'Nana')
})

test('Emma 在名冊與隱地島人生修練館旁，Office 身分是 english', () => {
  const emma = ROSTER.find(r => r.id === 'emma')
  const fig = FIGURES.find(f => f.id === 'emma')
  assert.equal(emma.name, 'Emma')
  assert.equal(emma.role, '英文小老師')
  assert.equal(emma.group, 'tutor')
  assert.equal(emma.agent, 'english')
  assert.equal(emma.persona, null)
  assert.equal(emma.source, null)
  assert.equal(emma.board, null)
  assert.equal(emma.ownerId, undefined)
  assert.equal(emma.staticInfo, true)
  assert.equal(emma.parent, 'hy')
  assert.equal(emma.island, 'life')
  assert.equal(emma.zone, 'dojo')
  assert.equal(HELPERS.some(h => h.id === 'emma'), false)
  assert.equal(OWNER_BOT_ORDER.includes('emma'), false)
  assert.equal(OWNER_BOT_ORDER.includes('english'), true)
  assert.equal(ownerBotChoices().some(c => c.value === 'english' && c.label === 'Emma'), true)
  assert.equal(ownerBotChoices().some(c => c.value === 'emma'), false)
  assert.equal(canonicalOwnerBot('emma'), '')
  assert.equal(canonicalOwnerBot('english'), 'english')
  assert.equal(LIVE_FIGS.has('emma'), false)
  assert.equal(fig.kind, 'emma')
  assert.equal(fig.island, 'life')
  assert.equal(fig.zone, 'dojo')
  assert.equal(fig.staticInfo, true)
  assert.deepEqual(figureHome(fig), buildingWorld('life', 'dojo'))
  const live = new Proxy({}, { get() { throw new Error('Emma must not read live data') } })
  assert.deepEqual(islandBotCard(fig, live, false), {
    staticInfo: true, name: 'Emma', role: '英文小老師', intro: '英文小老師，在隱地島人生修練館附近。',
  })
  const off = deriveOffice({ projects: [{ id: 'en', title: '英文課', ownerBot: 'english', stage: 'running' }, { id: 'raw', title: '名冊 id 不是身分', ownerBot: 'emma', stage: 'running' }], decisions: [], totals: { pending: 0 } })
  assert.equal(off.byAgent.english.counts.running, 1)
  assert.equal(off.byAgent.hy.counts.total, 0)
  assert.equal(off.byAgent.emma, undefined)
  assert.equal(off.unowned, 1)
  assert.equal(officeTeam({ id: 'en', owner_bot: 'english' }).find(m => m.role === '負責 Bot').name, 'Emma')
  assert.equal(BOT_COLORS.emma, 0x000000)
  assert.equal(BOT_COLORS.emma, BOT_COLORS.hy)
  const mat = new MeshBasicMaterial()
  const mesh = makeBot('emma', mat, null, 'wait')
  assert.equal(mesh.kind, 'emma')
  mesh.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== mat) o.material.dispose() })
  mat.dispose()
})

test('HY 隊長徽章是藍點，不是 Sam 的橘', () => {
  assert.equal(LEADER_BADGE_COLOR, 0x2d85f7)
  assert.notEqual(LEADER_BADGE_COLOR, BOT_COLORS.sam)
  const mat = new MeshBasicMaterial()
  const bot = makeBot('hy', mat, null, 'wait')
  const col = bot.mesh.geometry.attributes.color.array
  let blue = 0, orange = 0
  for (let i = 0; i < col.length; i += 3) {
    const r = col[i], g = col[i + 1], b = col[i + 2]
    if (b > 0.45 && b > r * 1.4 && r < 0.45) blue += 1
    if (r > 0.7 && g > 0.35 && g < 0.8 && b < 0.3) orange += 1
  }
  assert.ok(blue > 10, `blue vertices ${blue}`)
  assert.equal(orange, 0)
  bot.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== mat) o.material.dispose() })
  mat.dispose()
})

test('所有名冊角色都可產生有效、可點選的 3D 模型', () => {
  const mat = new MeshBasicMaterial()
  for (const fig of FIGURES) {
    const bot = makeBot(fig.kind, mat, null)
    const g = bot.mesh.geometry
    assert.ok(g.attributes.position.count > 0, fig.id)
    assert.ok([...g.attributes.position.array].every(Number.isFinite), fig.id)
    assert.ok([...g.attributes.normal.array].every(Number.isFinite), fig.id)
    assert.ok(g.boundingBox.max.y < 0.65 && g.boundingBox.min.y >= 0, fig.id)
    assert.ok(g.boundingBox.max.z > g.boundingBox.min.z, fig.id)
    bot.root.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== mat) o.material.dispose() })
  }
  mat.dispose()
})

test('mapOffice 帶出 ownerBot', () => {
  assert.equal(office.projects.find(p => p.id === 'a').ownerBot, '950157')
  assert.equal(office.projects.find(p => p.id === 'e').ownerBot, '')
})

test('deriveOffice：狀態與 Bot Office 一致，歸屬看 owner_bot', () => {
  const r = deriveOffice(office)
  assert.equal(r.byAgent['950157'].status, 'ai')
  assert.equal(r.byAgent['950157'].counts.done, 1)
  assert.match(r.byAgent['950157'].doing, /^執行中 1：觸覺手套簡報/)
  assert.equal(r.byAgent.sam.status, 'you')            // 有待你決定的題目
  assert.equal(r.byAgent.sam.asks, 1)
  assert.equal(r.byAgent.family.status, 'ai')           // 待審也算 AI 執行中
  assert.equal(r.byAgent.hy.status, 'wait')
  assert.equal(r.byAgent.hy.counts.waiting, 1)               // 舊資料 returned 讀成規劃中
  assert.equal('returned' in r.byAgent.hy.counts, false)
  assert.equal(r.byAgent.sam.doing, '規劃中 1')
  assert.equal(r.pending, 1)
  assert.equal(r.unowned, 1)                            // 沒有 owner_bot 的專案不算在任何人身上
})

test('deriveOffice：只剩等你的執行中專案改計入待你決定', () => {
  const blocked = mapOffice({
    buildings: [
      { id: 'a', title: '觸覺手套簡報', owner_bot: '950157', stage: 'running' },
      { id: 'p-002', title: '川泱', owner_bot: '950157', stage: 'running', milestones: [{ id: 'M4', step: 'running' }] },
    ],
    decisions: [{ id: 'd1', project: 'p-002', status: 'open', kind: 'intake', authority: 'owner_only', milestone: 'M4', title: '銀角' }],
  }, { cards: [] })
  const row = deriveOffice(blocked).byAgent['950157']
  assert.equal(row.counts.running, 1)
  assert.equal(row.counts.hyDecision, 1)
  assert.equal(row.status, 'you')
  assert.match(row.doing, /^執行中 1/)
  assert.doesNotMatch(row.doing, /執行中 2/)
})

test('負責 Bot 篩選依核心分組，選核心不含組員', () => {
  const groups = ownerBotGroups()
  assert.deepEqual(groups.map(group => [group.lead.value, group.members.map(member => member.value)]), [
    ['sam', ['nana']],
    ['family', ['fitness']],
    ['950157', []],
    ['hy', ['english']],
  ])
  assert.deepEqual(groups.map(group => [group.lead.label, group.members.map(member => member.label)]), [
    ['Sam', ['Nana']],
    ['小因', ['Wade']],
    ['950157', []],
    ['HY', ['Emma']],
  ])
  assert.equal(groups.some(group => group.lead.value === 'atlas' || group.members.some(member => member.value === 'atlas')), false)
  assert.equal(matchesOwnerFilter('english', 'hy'), false)
  assert.equal(matchesOwnerFilter('hy', 'hy'), true)
  assert.equal(matchesOwnerFilter('fitness', 'family'), false)
  assert.equal(matchesOwnerFilter('nana', 'sam'), false)
  assert.equal(matchesOwnerFilter('nana', 'nana'), true)
  assert.equal(matchesOwnerFilter('english', 'all'), true)
  const home = readFileSync(new URL('../src/pages/OfficeHome.jsx', import.meta.url), 'utf8')
  assert.match(home, /ownerBotGroups\(\)/)
  assert.match(home, /matchesOwnerFilter\(ownerOf\(p\), bot\)/)
  assert.match(home, /ao-owner-group/)
  assert.doesNotMatch(home, /atlas/i)
})

test('deriveOffice：沒有資料就是空，不編造', () => {
  const r = deriveOffice(null)
  assert.deepEqual(r.byAgent, {}); assert.equal(r.pending, null)
  assert.equal(deriveOffice({ projects: [], decisions: [], totals: { pending: 0 } }).byAgent.hy.doing, '名下還沒有專案')
})

test('deriveTodos：依來源算逾期與今日', () => {
  const list = [
    { _source: 'HY', due: '2026/10/23' }, { _source: 'HY', due: '2026-10-25' }, { _source: 'Sam', due: '2026-10-25' },
    { _source: '家庭', due: '2026/10/28' }, { _source: '950157', due: '' },
  ]
  const r = deriveTodos(list, '2026-10-25')
  assert.deepEqual(r.hy, { overdue: 1, today: 1 })
  assert.deepEqual(r.sam, { overdue: 0, today: 1 })
  assert.deepEqual(r.family, { overdue: 0, today: 0 })
  assert.deepEqual(deriveTodos(null, '2026-10-25'), {})
})

test('deriveRunners：runner 合併到三位執行者小人', () => {
  const r = deriveRunners({ runners: {
    'gpt-chat': { running: 1, ready: 2, inferred: 0, current: '整理文獻摘要' },
    'chatgpt-work': { running: 0, ready: 1, inferred: 1, current: null },
    'claude-review': { running: 0, ready: 0, inferred: 0, current: null },
    grok: { running: 2, ready: 0, inferred: 2, current: '跑測試' },
  } })
  assert.equal(r.gpt.status, 'ai'); assert.equal(r.gpt.doing, '整理文獻摘要（1 件執行中、3 件排隊）'); assert.equal(r.gpt.inferred, true)
  assert.equal(r.claude.status, 'wait'); assert.equal(r.claude.doing, '目前沒有工作')
  assert.equal(r.grokbuild.status, 'ai'); assert.equal(r.grokbuild.doing, '跑測試（2 件執行中）')
  assert.equal(r.atlas, undefined)
})

test('deriveRunners：沒有資料就是空物件；未知 runner 忽略', () => {
  assert.deepEqual(deriveRunners(null), {})
  const r = deriveRunners({ runners: { 'lane:CODEX': { running: 5, ready: 0 }, 'owner-bot:hy': { running: 1 } } })
  assert.equal(r.gpt.status, 'wait'); assert.equal(r.claude.status, 'wait')
})

test('LIVE_FIGS：四位小幫手、Atlas（營運長）與三位執行者', () => {
  for (const id of ['hy', 'p950157', 'xiaoyin', 'sam', 'atlas', 'gpt', 'claude', 'grokbuild']) assert.ok(LIVE_FIGS.has(id), id)
  assert.ok(!Object.values(RUNNER_FIG).includes('atlas'))   // Atlas 不再對應任何工作通道
  assert.equal(RUNNER_FIG['chatgpt-work'], 'gpt')
})

test('deriveSummary：系統異常數等於 Atlas 未通過的檢查', () => {
  const now = Date.parse('2026-10-25T04:00:00Z')
  const hrs = n => new Date(now - n * 3600e3).toISOString()
  const fresh = { office: { updatedAt: hrs(2), stale: false }, officeEmpty: false, failed: {}, todoFailed: false, unowned: 0, loaded: true }

  const ok = deriveSummary({ pending: 4, ...fresh }, now)
  assert.equal(ok.needsYou, 4)
  assert.equal(ok.systemIssues, 0)
  assert.deepEqual(ok.systemReasons, [])

  assert.deepEqual(deriveSummary({ pending: null, loaded: false }, now), { needsYou: null, systemIssues: null, systemReasons: [] })

  // Office 25 小時沒更新：只有「更新」這一項沒過，狀態列計 1。
  const staleOffice = { updatedAt: hrs(25), stale: false }
  const stale = deriveSummary({ pending: 0, ...fresh, office: staleOffice }, now)
  const staleAtlas = deriveAtlas({ ...fresh, office: staleOffice }, now)
  assert.equal(staleAtlas.attention.length, 1)
  assert.equal(stale.systemIssues, 1)
  assert.match(stale.systemReasons[0], /25 小時沒更新/)

  // 讀取失敗已在 Atlas 檢查內。狀態列用 attention 的數量，不再把 failedCount 加一次。
  const failed = { office: true, memory: true }
  const read = deriveSummary({ pending: 0, ...fresh, failed, todoFailed: true }, now)
  const readAtlas = deriveAtlas({ ...fresh, failed, todoFailed: true }, now)
  const failedCount = Object.values(failed).filter(Boolean).length + 1
  assert.equal(read.systemIssues, readAtlas.attention.length)
  assert.deepEqual(read.systemReasons, readAtlas.attention.map(item => item.text))
  assert.notEqual(read.systemIssues, readAtlas.attention.length + failedCount)
  const readLines = read.systemReasons.filter(text => text.includes('讀取失敗'))
  assert.equal(readLines.length, readAtlas.attention.filter(item => item.text.includes('讀取失敗')).length)
  assert.ok(readLines.length >= 1)

  // 呼叫端已帶入同一份 attention 時，旁邊的 failed 旗標不會再加進去。
  const shared = deriveSummary({ pending: 0, loaded: true, attention: readAtlas.attention, failed, todoFailed: true }, now)
  assert.equal(shared.systemIssues, readAtlas.attention.length)
})

test('deriveAttention：問題→紅、待你確認→琥珀、個人待辦→藍、無事→不顯示', () => {
  const now = Date.parse('2026-10-25T01:00:00Z'), day = n => new Date(now - n * 86400e3).toISOString()
  assert.deepEqual(deriveAttention(null), { level: null, reasons: [], items: [] })
  assert.equal(deriveAttention({ status: 'wait', office: { asks: 0, returned: 0 }, todos: { overdue: 0, today: 0 }, memory: { memory_last: day(1) } }, now).level, null)
  const you = deriveAttention({ status: 'you', office: { asks: 2, returned: 0 }, todos: { overdue: 0, today: 1 } }, now)
  assert.equal(you.level, 'you'); assert.deepEqual(you.reasons, ['待你確認 2 件', '今日待辦 1 件'])
  assert.equal(you.items.find(i => i.text.startsWith('今日待辦')).level, 'todo')
  assert.deepEqual(todoMarker(you), { alert: 'you', todoDot: true })
  const onlyTodo = deriveAttention({ status: 'wait', todos: { overdue: 1, today: 0 } }, now)
  assert.equal(onlyTodo.level, 'todo')
  assert.deepEqual(todoMarker(onlyTodo), { alert: 'todo', todoDot: false })
  assert.equal(deriveAttention({ status: 'wait', office: { returned: 1 } }, now).level, null)   // 退回不再亮紅
  const stale = deriveAttention({ status: 'wait', memory: { memory_last: day(25) } }, now)
  assert.equal(stale.level, 'bad'); assert.deepEqual(stale.reasons, ['長期記憶 25 天沒更新'])
  assert.equal(deriveAttention({ status: 'bad' }, now).level, 'bad')
  const both = deriveAttention({ status: 'you', todos: { overdue: 1, today: 0 }, memory: { memory_last: day(25) } }, now)
  assert.equal(both.level, 'bad')   // 系統問題仍優先於個人待辦
  assert.equal(todoMarker(both).todoDot, true)
  assert.equal(deriveAttention({ status: 'you', todos: { overdue: 1, today: 0 } }, now).level, 'you')
  assert.deepEqual(todoMarker(deriveAttention(null)), { alert: null, todoDot: false })
})

test('deriveAttention：items 帶層級與去處，供卡片列出原因', () => {
  const a = deriveAttention({ status: 'you', office: { asks: 1, returned: 1 }, todos: { overdue: 2, today: 0 } })
  assert.deepEqual(a.items.map(i => [i.level, i.text, i.go]), [['todo', '逾期待辦 2 件', 'board'], ['you', '待你確認 1 件', 'office']])
  assert.deepEqual(todoMarker(a), { alert: 'you', todoDot: true })
})

test('deriveAtlas：系統健康清單；有異常就是紅、全部正常是待命', async () => {
  const { deriveAtlas, deriveAttention: attn } = await import('../src/life-island/worldData.js')
  const now = Date.parse('2026-10-25T04:00:00Z'), hrs = n => new Date(now - n * 3600e3).toISOString()
  const base = { office: { updatedAt: hrs(2), stale: false }, officeEmpty: false, failed: {}, todoFailed: false, unowned: 0, loaded: true }
  const ok = deriveAtlas(base, now)
  assert.equal(ok.status, 'wait'); assert.deepEqual(ok.attention, []); assert.equal(ok.checks.length, 5); assert.ok(ok.checks.every(c => c.ok))
  assert.equal(deriveAtlas({ ...base, loaded: false }, now).checks.length, 0)
  const old = deriveAtlas({ ...base, office: { updatedAt: hrs(30), stale: false } }, now)
  assert.equal(old.status, 'bad'); assert.match(old.attention[0].text, /30 小時沒更新/)
  assert.equal(deriveAtlas({ ...base, unowned: 2 }, now).attention[0].text, '專案歸屬：2 個專案沒有指定 owner_bot')
  const failed = deriveAtlas({ ...base, failed: { office: true, memory: true, runners: true }, todoFailed: true }, now)
  assert.ok(failed.attention.length >= 4 && failed.status === 'bad')
  assert.equal(deriveAtlas({ ...base, office: null, officeEmpty: true }, now).status, 'bad')
  // 紅色提醒標與卡片共用同一份項目
  const a = attn({ status: 'bad', attention: failed.attention }, now)
  assert.equal(a.level, 'bad'); assert.equal(a.items, failed.attention)
})
