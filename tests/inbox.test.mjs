import test from 'node:test'
import assert from 'node:assert/strict'
import { buildInbox, inboxCounts } from '../src/inbox/inboxData.js'

const bots = {
  atlas: { status: 'bad', attention: [{ level: 'bad', text: '專案歸屬：1 個專案沒有指定 owner_bot', go: 'office' }] },
  family: { status: 'ai', office: { returned: 0, asks: 1 }, todos: { overdue: 1, today: 0 }, memory: null },
}
const base = { decisions: [{ id: 'd1', title: '要不要補件', projectId: 'p1', suggestion: '補' }], projects: [{ id: 'p1', title: '補件卡' }],
  bots,
  todos: [{ title: '報價單', due: '2026/10/25', _source: 'Sam' }, { title: '月報', due: '2026-10-26', _source: 'HY' }, { title: '下週', due: '2026-10-30', _source: 'HY' }],
  sched: [{ start: '14:00', title: 'Goal3' }], today: '2026-10-26' }

test('分四類、依序排列，今日以後的待辦不進來', () => {
  const items = buildInbox(base)
  assert.deepEqual(items.map(i => i.kind), ['decide', 'problem', 'overdue', 'today', 'today'])
  assert.equal(items.find(i => i.kind === 'overdue').title, '報價單')
})
test('數字 = 待我處理 + 問題 + 過期；今日任務不算', () => {
  assert.deepEqual(inboxCounts(buildInbox(base)), { decide: 1, problem: 1, overdue: 1, today: 2, total: 3 })
})
test('問題只收紅色；「待你確認」與逾期待辦不重複列在問題裡', () => {
  const items = buildInbox(base).filter(i => i.kind === 'problem')
  assert.equal(items.length, 1)
  assert.equal(items[0].source, 'Atlas')
  assert.equal(items[0].assignOwner, true)
  assert.equal(items[0].action, '處理')
  assert.equal(items[0].to, null)
})
test('資料還沒載入（null）時不產生卡片，也不出錯', () => {
  const items = buildInbox({ ...base, todos: null, sched: null, decisions: [], bots: {} })
  assert.equal(items.length, 0)
  assert.equal(inboxCounts(items).total, 0)
})

test('待你處理：每張卡都有負責 Bot 與屬性，可依兩者篩選', async () => {
  const { filterInbox, decisionCategory } = await import('../src/inbox/inboxData.js')
  const items = buildInbox({ ...base,
    projects: [{ id: 'p1', title: '補件卡', ownerBot: 'sam' }],
    decisions: [
      { id: 'd1', title: '要不要補件', projectId: 'p1', kind: 'intake' },
      { id: 'd2', title: '週六記帳時段一起整理收支？', projectId: null, isItem: true, ownerBot: 'hy', category: 'suggestion', source: '晨會', deadline: '2026-11-14' },
      { id: 'd3', title: '規劃書核准', projectId: 'p1', kind: 'approval' },
    ] })
  const d1 = items.find(i => i.decisionId === 'd1'), d2 = items.find(i => i.decisionId === 'd2'), d3 = items.find(i => i.decisionId === 'd3')
  assert.equal(d1.owner, 'sam'); assert.equal(d1.category, 'data'); assert.equal(d1.to, '/bot-office?project=p1&tab=meeting'); assert.equal(d1.isItem, false)
  assert.equal(d2.owner, 'hy'); assert.equal(d2.category, 'suggestion'); assert.equal(d2.source, '晨會'); assert.equal(d2.isItem, true)
  assert.equal(d2.to, '/bot-office?item=d2'); assert.equal(d2.due, '2026-11-14')
  assert.equal(d3.category, 'approval')
  assert.equal(items.find(i => i.kind === 'problem').owner, 'atlas')
  assert.equal(items.find(i => i.kind === 'overdue').owner, 'sam')
  assert.deepEqual(filterInbox(items, { owner: 'sam' }).map(i => i.id).sort(), items.filter(i => i.owner === 'sam').map(i => i.id).sort())
  assert.deepEqual(filterInbox(items, { category: 'suggestion' }).map(i => i.decisionId), ['d2'])
  assert.deepEqual(filterInbox(items, { owner: 'hy', category: 'approval' }), [])
  assert.equal(filterInbox(items).length, items.length)
  assert.equal(decisionCategory({ kind: 'approval', category: 'report' }), 'report')
  assert.equal(decisionCategory({ category: 'weird' }), 'approval')
})
