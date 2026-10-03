import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const code = readFileSync(new URL('../public/sam-business-board.js', import.meta.url), 'utf8')
function load() {
  const ctx = { crypto: globalThis.crypto }
  vm.createContext(ctx)
  vm.runInContext(code, ctx)
  return ctx.SamBusinessBoard
}

const graph = () => ({
  nodes: [
    { id: 'sam', name: 'Sam', status: 'active' },
    { id: 'lechuan', name: '樂川', industry: '食品／餐飲', status: 'active' },
    { id: 'art_trade', name: '藝術品買賣', status: 'paused' },
    { id: 'vending_ig', name: '智能販賣機 IG' },
  ],
  relationships: [],
})

test('ensureBoard fills defaults without overwriting existing values', () => {
  const B = load()
  const ops = { board: { last_review_at: '2026-10-01T00:00:00Z', rows: [{ id: 'r1', node_id: 'lechuan', cells: { next: { text: '約試吃', kind: 'suggestion' } } }] } }
  const b = B.ensureBoard(ops)
  assert.equal(b.schema_version, 'business-board-v1')
  assert.equal(b.last_review_at, '2026-10-01T00:00:00Z')
  assert.equal(b.rows[0].cells.next.kind, 'suggestion')
  assert.equal(b.rows[0].cells.what.kind, 'unknown')
  assert.deepEqual([...b.excluded_node_ids], [])
})

test('graph drives one row per node (root excluded), facts carry sources, rest unknown', () => {
  const B = load()
  const b = B.ensureBoard({})
  const rows = B.boardRows(graph(), b)
  assert.deepEqual([...rows.map(r => r.node_id)], ['lechuan', 'art_trade', 'vending_ig'])
  const lechuan = rows[0]
  assert.equal(lechuan.virtual, true)
  assert.equal(lechuan.cells.what.kind, 'fact')
  assert.match(lechuan.cells.what.source, /樂川/)
  assert.equal(lechuan.cells.stage.text, '有效／推進中')
  assert.equal(lechuan.cells.cashflow.kind, 'unknown')
  assert.equal(rows[2].cells.what.kind, 'unknown')
  assert.equal(rows[2].cells.stage.kind, 'unknown')
  assert.equal(b.rows.length, 0, 'deriving rows must not write anything')
})

test('editing materializes the row; unknown→text becomes HY confirmed; fact needs a source', () => {
  const B = load()
  const b = B.ensureBoard({})
  const [row] = B.boardRows(graph(), b)
  assert.throws(() => B.updateRow(b, row, { cells: { cashflow: { text: '打平', kind: 'fact', source: '' } } }), /來源/)
  assert.equal(b.rows.length, 0, 'failed validation writes nothing')
  B.updateRow(b, row, { focus: true, cells: { cashflow: { text: '大致打平', kind: 'unknown' }, blocker: { text: '人力不足', kind: 'suggestion' } } })
  assert.equal(b.rows.length, 1)
  assert.equal(b.rows[0].node_id, 'lechuan')
  assert.equal(b.rows[0].cells.cashflow.kind, 'confirmed')
  assert.ok(b.rows[0].cells.cashflow.confirmed_at)
  assert.equal(b.rows[0].cells.blocker.kind, 'suggestion')
  assert.equal(b.rows[0].cells.what.kind, 'fact', 'derived facts kept on materialize')
  const rows = B.boardRows(graph(), b)
  assert.equal(rows.filter(r => r.node_id === 'lechuan').length, 1, 'still one row per node')
  assert.equal(rows[0].focus, true)
})

test('focus rows are pinned to the top', () => {
  const B = load()
  const b = B.ensureBoard({})
  const rows = B.boardRows(graph(), b)
  B.updateRow(b, rows[2], { focus: true })
  assert.equal(B.boardRows(graph(), b)[0].node_id, 'vending_ig')
})

test('confirmSuggestions turns Sam suggestions into HY confirmed only', () => {
  const B = load()
  const b = B.ensureBoard({ board: { rows: [{ id: 'r', node_id: 'lechuan', cells: { next: { text: 'A', kind: 'suggestion' }, blocker: { text: 'B', kind: 'suggestion' }, what: { text: 'C', kind: 'fact', source: 's' } } }] } })
  const [row] = B.boardRows(graph(), b)
  assert.equal(B.counts([row]).suggestion, 2)
  assert.equal(B.confirmSuggestions(b, row), 2)
  assert.equal(b.rows[0].cells.next.kind, 'confirmed')
  assert.equal(b.rows[0].cells.what.kind, 'fact')
})

test('remove a graph row excludes the node until restored; node itself untouched', () => {
  const B = load()
  const g = graph()
  const b = B.ensureBoard({})
  const row = B.boardRows(g, b).find(r => r.node_id === 'art_trade')
  B.removeRow(b, row)
  assert.ok(!B.boardRows(g, b).some(r => r.node_id === 'art_trade'))
  assert.equal(g.nodes.length, 4)
  B.restoreNodeRow(b, 'art_trade')
  assert.ok(B.boardRows(g, b).some(r => r.node_id === 'art_trade'))
})

test('manual rows (no node) can be added, renamed and deleted; orphan rows are flagged', () => {
  const B = load()
  const b = B.ensureBoard({ board: { rows: [{ id: 'old', node_id: 'gone', cells: {} }] } })
  const m = B.addManualRow(b, '川嶼')
  let rows = B.boardRows(graph(), b)
  const manual = rows.find(r => r.id === m.id)
  assert.equal(manual.from_graph, false)
  assert.equal(manual.name, '川嶼')
  assert.equal(rows.find(r => r.id === 'old').orphan, true)
  B.updateRow(b, manual, { name: '川嶼（本季主推）' })
  assert.equal(B.boardRows(graph(), b).find(r => r.id === m.id).name, '川嶼（本季主推）')
  B.removeRow(b, manual)
  rows = B.boardRows(graph(), b)
  assert.ok(!rows.some(r => r.id === m.id))
  assert.deepEqual([...b.excluded_node_ids], [])
})

test('week focus and review time', () => {
  const B = load()
  const b = B.ensureBoard({})
  assert.throws(() => B.setFocus(b, 'week_focus', { text: 'x', kind: 'fact' }), /來源/)
  B.setFocus(b, 'week_focus', { text: '川嶼試賣準備', kind: '' })
  assert.equal(b.week_focus.kind, 'confirmed')
  B.markReviewed(b, '2026-10-03T08:00:00.000Z')
  assert.equal(b.last_review_at, '2026-10-03T08:00:00.000Z')
})
