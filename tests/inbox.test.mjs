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
