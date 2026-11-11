import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const code = readFileSync(new URL('../public/sam-business-map.js', import.meta.url), 'utf8')
function load() {
  // 與測試同一個 realm 執行，陣列／物件可直接 deepEqual
  const ctx = { crypto: globalThis.crypto }
  new Function('globalThis', code)(ctx)
  return ctx.SamBusinessMap
}
const legacy = () => ({
  graph: { nodes: [{ id: 'sam' }, { id: 'dessert', name: '甜品工廠' }, { id: 'bake33', name: '烘33' }], relationships: [{ from: 'sam', to: 'dessert' }] },
  board: { week_focus: { text: 'x' }, quarter_focus: { text: '川嶼' }, rows: [{ id: 'r1' }] },
})

test('seeds only HY and the four companies, all unknown, all hidden-shareholder edges', () => {
  const M = load()
  const ops = legacy()
  const { map, seeded } = M.ensureMap(ops)
  assert.equal(seeded, true)
  assert.deepEqual(map.nodes.map(n => n.name), ['HY', '樂川', 'RM 餐酒館', '上淼', '迪繆斯 DIVIOS'])
  assert.deepEqual(M.statusSummary(map).map(s => s.status), ['未知', '未知', '未知', '未知'])
  assert.equal(map.edges.length, 4)
  assert.ok(map.edges.every(e => e.from === 'hy' && e.type === '隱名股東'))
  assert.deepEqual(map.edges.map(M.edgeLabel), ['隱名股東（未知）', '隱名股東（未知）', '隱名股東（約 45%）', '隱名股東（未知）'])
  assert.ok(!map.nodes.some(n => n.kind === 'person' || n.kind === 'resource'), 'no placeholder people/resources')
  assert.equal(M.getNode(map, 'lechuan').maintainer, 'Nana')
})

test('legacy graph and board stay untouched in business_ops', () => {
  const M = load()
  const ops = legacy()
  const before = JSON.stringify({ graph: ops.graph, board: ops.board })
  M.ensureMap(ops)
  assert.equal(JSON.stringify({ graph: ops.graph, board: ops.board }), before)
})

test('add / update / remove nodes; removing a card removes its edges', () => {
  const M = load()
  const { map } = M.ensureMap({})
  const p = M.addNode(map, 'person', { name: '測試人物', relation: '顧問' })
  const r = M.addNode(map, 'resource', { name: '測試資源', rtype: '產能' })
  const c = M.addNode(map, 'company', { name: '測試公司', status: '大賺' })
  assert.equal(c.status, '未知', 'status outside 賺/平/虧/未知 is coerced to 未知')
  M.addEdge(map, p.id, 'rm', { type: '人脈' })
  M.addEdge(map, r.id, c.id, { type: '供應', confirmed: true })
  M.updateNode(map, p.id, { role: '顧問' })
  assert.equal(M.getNode(map, p.id).role, '顧問')
  assert.equal(M.removeNode(map, p.id), 1)
  assert.equal(M.edgesOf(map, 'rm').length, 1)
  assert.throws(() => M.removeNode(map, 'hy'))
  assert.throws(() => M.addNode(map, 'person', { name: ' ' }))
})

test('unconfirmed edges are labelled, never blank', () => {
  const M = load()
  const { map } = M.ensureMap({})
  const e = M.addEdge(map, 'hy', 'rm', { type: '合作' })
  assert.equal(M.edgeLabel(e), '合作・未確認')
})

test('stale after 90 days or past follow-up date with key fields unknown; status unchanged', () => {
  const M = load()
  const { map } = M.ensureMap({})
  const n = M.getNode(map, 'rm')
  assert.equal(M.staleness(n, new Date('2026-12-01T00:00:00Z')).stale, false)
  assert.equal(M.staleness(n, new Date('2027-02-15T00:00:00Z')).stale, true)
  n.followup_due = '2026-11-20'
  assert.equal(M.staleness(n, new Date('2026-11-25T00:00:00Z')).stale, true)
  assert.equal(n.status, '未知')
  const l = M.getNode(map, 'lechuan'); l.followup_due = '2026-11-20'; l.status = '平'
  assert.equal(M.staleness(l, new Date('2026-11-25T00:00:00Z')).stale, false, 'key fields known -> not stale')
})

test('layout puts HY at centre, companies on ring 1, people/resources further out; fit keeps everything inside', () => {
  const M = load()
  const { map } = M.ensureMap({})
  M.addNode(map, 'person', { name: 'P' })
  const pos = M.layout(map, 1.6)
  assert.equal(pos.hy.x, 0); assert.equal(pos.hy.y, 0)
  const d = id => Math.hypot(pos[id].x, pos[id].y)
  const pid = map.nodes.find(n => n.kind === 'person').id
  assert.ok(d(pid) > Math.max(...M.COMPANY_IDS.map(d)))
  const rects = Object.values(pos).map(p => ({ x: p.x - 90, y: p.y - 50, w: 180, h: 100 }))
  const f = M.fit(rects, 1440, 800, 24)
  for (const r of rects) {
    assert.ok(r.x * f.scale + f.tx >= 23 && (r.x + r.w) * f.scale + f.tx <= 1440 - 23)
    assert.ok(r.y * f.scale + f.ty >= 23 && (r.y + r.h) * f.scale + f.ty <= 800 - 23)
  }
})

test('DIVIOS card uses the user-confirmed legal entity 帝爾 90895872, with unknowns kept unknown', () => {
  const M = load()
  const { map } = M.ensureMap({})
  const d = M.getNode(map, 'divios')
  assert.equal(d.legal_name, '帝爾股份有限公司')
  assert.equal(d.tax_id, '90895872')
  assert.equal(d.legal_state, '已確認')
  assert.equal(d.status, '未知')
  assert.equal(d.stake_ratio, '未知')
  assert.match(d.registry, /登記資本，不是帳戶現金/)
  assert.match(d.registry, /劉姿廷/)
  assert.match(d.business, /美麗華/)
})
