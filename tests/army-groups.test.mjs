import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ROSTER, HELPERS, CORE_BOTS, armyGroups, armyCardIds, armyMemberView, armyCountText } from '../src/botRoster.js'
import { OWNER_BOT_ORDER, canonicalOwnerBot, deriveOffice } from '../src/life-island/worldData.js'

const read = file => readFileSync(new URL(file, import.meta.url), 'utf8')

test('軍團四欄：核心在上，組員在對應核心下，一共 8 張', () => {
  const groups = armyGroups()
  assert.equal(CORE_BOTS, HELPERS)
  assert.deepEqual(groups.map(g => g.lead.id), ['hy', 'p950157', 'xiaoyin', 'sam'])
  assert.deepEqual(groups.map(g => g.lead.name), ['HY', '950157', '小因', 'Sam'])
  assert.deepEqual(groups.find(g => g.lead.id === 'hy').members.map(m => m.id), ['atlas', 'emma'])
  assert.deepEqual(groups.find(g => g.lead.id === 'p950157').members.map(m => m.id), [])
  assert.deepEqual(groups.find(g => g.lead.id === 'xiaoyin').members.map(m => m.id), ['wade'])
  assert.deepEqual(groups.find(g => g.lead.id === 'sam').members.map(m => m.id), ['nana'])
  assert.deepEqual(armyCardIds(), ['hy', 'atlas', 'emma', 'p950157', 'xiaoyin', 'wade', 'sam', 'nana'])
  assert.equal(armyCardIds().length, 8)
  for (const id of ['emma', 'wade', 'nana', 'atlas']) assert.equal(HELPERS.some(h => h.id === id), false)
  assert.equal(ROSTER.find(r => r.id === 'emma').agent, 'english')
  assert.equal(ROSTER.find(r => r.id === 'wade').agent, 'fitness')
  assert.equal(ROSTER.find(r => r.id === 'nana').agent, 'nana')
  assert.equal(ROSTER.find(r => r.id === 'atlas').agent, null)
  assert.equal(OWNER_BOT_ORDER.includes('english'), true)
  assert.equal(OWNER_BOT_ORDER.includes('fitness'), true)
  assert.equal(OWNER_BOT_ORDER.includes('nana'), true)
  assert.equal(OWNER_BOT_ORDER.includes('emma'), false)
  assert.equal(OWNER_BOT_ORDER.includes('wade'), false)
  assert.equal(OWNER_BOT_ORDER.includes('atlas'), false)
  assert.equal(canonicalOwnerBot('english'), 'english')
  assert.equal(canonicalOwnerBot('fitness'), 'fitness')
  assert.equal(canonicalOwnerBot('nana'), 'nana')
  assert.equal(canonicalOwnerBot('emma'), '')
  assert.equal(canonicalOwnerBot('wade'), '')
  assert.equal(canonicalOwnerBot('atlas'), '')
})

test('沒有 Office 資料時組員計數是 0；有歸屬資料就顯示真實數字', () => {
  const emma = ROSTER.find(r => r.id === 'emma')
  assert.equal(armyMemberView(emma, { loaded: false }).office, null)
  assert.equal(armyCountText(null, false), '讀取中…')
  const empty = armyMemberView(emma, { loaded: true })
  assert.equal(armyCountText(empty.office, true), '執行中 0・待審 0・完成 0')
  assert.equal(empty.office.waiting, 0)
  assert.equal(empty.office.total, 0)
  assert.deepEqual(empty.todos, { overdue: 0, today: 0 })
  assert.equal(empty.memory, null)
  assert.equal(empty.doing, '名下還沒有專案')
  const off = deriveOffice({
    projects: [
      { id: 'en', title: '英文課', ownerBot: 'english', stage: 'running' },
      { id: 'en2', title: '複習', ownerBot: 'english', stage: 'review' },
      { id: 'en3', title: '結業', ownerBot: 'english', stage: 'done' },
      { id: 'hy1', title: 'HY 自己的', ownerBot: 'hy', stage: 'running' },
    ],
    decisions: [],
    totals: { pending: 0 },
  })
  const live = armyMemberView(emma, { loaded: true, byAgent: off.byAgent })
  assert.equal(armyCountText(live.office, true), '執行中 1・待審 1・完成 1')
  assert.equal(live.office.total, 3)
  assert.equal(off.byAgent.hy.counts.running, 1)
  assert.equal(off.unowned, 0)
  const counted = armyMemberView(
    emma,
    { loaded: true, byAgent: { english: { status: 'ai', doing: '執行中 2：英文課', asks: 1, counts: { total: 4, running: 2, review: 1, hyDecision: 0, waiting: 0, done: 3 } } } },
  )
  assert.equal(counted.status, 'ai')
  assert.equal(armyCountText(counted.office, true), '執行中 2・待審 1・完成 3')
  assert.equal(counted.office.total, 4)
  assert.equal(counted.doing, '執行中 2：英文課')
  const wade = armyMemberView(ROSTER.find(r => r.id === 'wade'), { loaded: true, byAgent: deriveOffice({ projects: [], decisions: [], totals: { pending: 0 } }).byAgent })
  assert.equal(armyCountText(wade.office, true), '執行中 0・待審 0・完成 0')
  assert.equal(wade.doing, '名下還沒有專案')
  const nana = armyMemberView(ROSTER.find(r => r.id === 'nana'), { loaded: true, byAgent: deriveOffice({ projects: [{ id: 'ny', title: '川泱', ownerBot: 'nana', stage: 'done' }], decisions: [], totals: { pending: 0 } }).byAgent })
  assert.equal(armyCountText(nana.office, true), '執行中 0・待審 0・完成 1')
})

test('軍團頁把組員排在核心下面，Atlas 可收合，記憶區仍在卡片下方', () => {
  const cards = read('../src/components/BotRosterCards.jsx')
  const atlas = read('../src/components/AtlasCard.jsx')
  const helpers = read('../src/pages/Helpers.jsx')
  assert.match(cards, /armyGroups\(\)/)
  assert.match(cards, /armyCardIds\(\)/)
  assert.match(cards, /bot-column/)
  assert.match(cards, /目前沒有小組成員/)
  assert.match(cards, /member.id === 'atlas'/)
  assert.match(cards, /全部展開/)
  assert.doesNotMatch(cards, /border-dashed|虛線空卡|bot-grid/)
  const openAt = atlas.indexOf('{open &&')
  assert.ok(openAt > 0)
  assert.ok(atlas.indexOf('atlas-checks') > openAt)
  assert.ok(atlas.indexOf('小時沒更新') > openAt)
  assert.ok(atlas.indexOf('className="bot-line"') < openAt)
  assert.ok(atlas.indexOf('atlas-t') < openAt)
  const rosterAt = helpers.indexOf('<BotRosterCards')
  const memoryAt = helpers.indexOf('<MemoryCenter embedded />')
  assert.ok(rosterAt > 0 && memoryAt > rosterAt)
  assert.match(helpers, /mt-8 border-t border-slate-200 pt-6/)
  assert.doesNotMatch(helpers, /<AtlasCard/)
})
