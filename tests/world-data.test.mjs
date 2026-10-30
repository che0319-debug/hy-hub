import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveOffice, deriveTodos, deriveRunners, deriveSummary, deriveAttention, RUNNER_FIG, LIVE_FIGS, OWNER_BOT_ORDER, ownerBotChoices, canonicalOwnerBot } from '../src/life-island/worldData.js'
import { ROSTER, HELPERS } from '../src/botRoster.js'
import { mapOffice } from '../src/botOfficeData.js'
import { FIGURES, FAMILY_ISLAND, buildingWorld, figureHome, figureFront, islandBotCard } from '../src/life-island/data.js'
import { BOT_COLORS, WADE_LOOK, makeBot } from '../src/life-island/bots.js'
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

test('名冊：四位小幫手＋執行者與 Atlas，id 不重複', () => {
  assert.equal(HELPERS.length, 4)
  assert.equal(ROSTER.filter(r => r.group === 'executor').length, 3)
  assert.equal(ROSTER.filter(r => r.group === 'coo').length, 1)
  assert.equal(ROSTER.length, 9)
  assert.equal(new Set(ROSTER.map(r => r.id)).size, 9)
  assert.deepEqual(HELPERS.map(h => h.agent), ['hy', '950157', 'family', 'sam'])
})

test('Wade 在 Life 島名單，駐在健身房，不進 owner-bot，卡片不讀即時資料', () => {
  const wade = ROSTER.find(r => r.id === 'wade')
  assert.ok(wade)
  assert.equal(wade.name, 'Wade')
  assert.equal(wade.ownerId, 'fitness')
  assert.equal(wade.role, '健身教練')
  assert.equal(wade.group, 'coach')
  assert.equal(wade.agent, null)
  assert.equal(wade.staticInfo, true)
  assert.equal(HELPERS.some(h => h.id === 'wade' || h.agent === 'fitness' || h.ownerId === 'fitness'), false)
  assert.equal(OWNER_BOT_ORDER.includes('fitness'), false)
  assert.equal(OWNER_BOT_ORDER.includes('wade'), false)
  assert.equal(ownerBotChoices().some(c => c.value === 'fitness' || c.value === 'wade' || c.label === 'Wade'), false)
  assert.equal(canonicalOwnerBot('fitness'), '')
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

  assert.equal(WADE_LOOK.body, 0x3dbe72)
  assert.equal(WADE_LOOK.eye, 0xffffff)
  for (const [name, color] of Object.entries(BOT_COLORS)) assert.notEqual(WADE_LOOK.body, color, name)
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

  const off = deriveOffice({ projects: [{ id: 'g', title: '課表', ownerBot: 'fitness', stage: 'running' }], decisions: [], totals: { pending: 0 } })
  assert.equal(off.byAgent.fitness, undefined)
  assert.equal(off.byAgent.wade, undefined)
  assert.equal(off.unowned, 1)
})

test('mapOffice 帶出 ownerBot', () => {
  assert.equal(office.projects.find(p => p.id === 'a').ownerBot, '950157')
  assert.equal(office.projects.find(p => p.id === 'e').ownerBot, '')
})

test('deriveOffice：狀態與 Bot Office 一致，歸屬看 owner_bot', () => {
  const r = deriveOffice(office)
  assert.equal(r.byAgent['950157'].status, 'ai')
  assert.equal(r.byAgent['950157'].counts.done, 1)
  assert.match(r.byAgent['950157'].doing, /1 個專案進行中：觸覺手套簡報/)
  assert.equal(r.byAgent.sam.status, 'you')            // 有待你決定的題目
  assert.equal(r.byAgent.sam.asks, 1)
  assert.equal(r.byAgent.family.status, 'ai')           // 待審也算 AI 執行中
  assert.equal(r.byAgent.hy.status, 'wait')
  assert.equal(r.byAgent.hy.counts.returned, 1)
  assert.equal(r.pending, 1)
  assert.equal(r.unowned, 1)                            // 沒有 owner_bot 的專案不算在任何人身上
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

test('deriveSummary：待你確認取 Bot Office；系統數讀取失敗的來源', () => {
  assert.deepEqual(deriveSummary({ pending: 4, failedCount: 0, loaded: true }), { needsYou: 4, systemIssues: 0 })
  assert.deepEqual(deriveSummary({ pending: null, failedCount: 0, loaded: false }), { needsYou: null, systemIssues: null })
  assert.equal(deriveSummary({ pending: 0, failedCount: 2, loaded: true }).systemIssues, 2)
})

test('deriveAttention：問題→紅、待處理→琥珀、無事→不顯示', () => {
  const now = Date.parse('2026-10-25T01:00:00Z'), day = n => new Date(now - n * 86400e3).toISOString()
  assert.deepEqual(deriveAttention(null), { level: null, reasons: [], items: [] })
  assert.equal(deriveAttention({ status: 'wait', office: { asks: 0, returned: 0 }, todos: { overdue: 0, today: 0 }, memory: { memory_last: day(1) } }, now).level, null)
  const you = deriveAttention({ status: 'you', office: { asks: 2, returned: 0 }, todos: { overdue: 0, today: 1 } }, now)
  assert.equal(you.level, 'you'); assert.deepEqual(you.reasons, ['待你確認 2 件', '今日待辦 1 件'])
  assert.equal(deriveAttention({ status: 'wait', todos: { overdue: 1, today: 0 } }, now).level, 'bad')
  assert.equal(deriveAttention({ status: 'wait', office: { returned: 1 } }, now).level, 'bad')
  const stale = deriveAttention({ status: 'wait', memory: { memory_last: day(25) } }, now)
  assert.equal(stale.level, 'bad'); assert.deepEqual(stale.reasons, ['長期記憶 25 天沒更新'])
  assert.equal(deriveAttention({ status: 'bad' }, now).level, 'bad')
  assert.equal(deriveAttention({ status: 'you', todos: { overdue: 1, today: 0 } }, now).level, 'bad')   // 紅色優先
})

test('deriveAttention：items 帶層級與去處，供卡片列出原因', () => {
  const a = deriveAttention({ status: 'you', office: { asks: 1, returned: 1 }, todos: { overdue: 2, today: 0 } })
  assert.deepEqual(a.items.map(i => [i.level, i.text, i.go]), [['bad', '專案被退回 1 件', 'office'], ['bad', '逾期待辦 2 件', 'board'], ['you', '待你確認 1 件', 'office']])
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
