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

function companyFields(M) {
  return M.FIELDS.company.filter(f => f.key).map(f => f.key)
}

test('fresh seed is HY plus five same-shape companies, with a plain-text income note', () => {
  const M = load()
  const ops = legacy()
  ops.businesses = [{ id: 'biz_1779606945285', display_name: '新竹3C手機店', my_role: { equity_percent: 0 }, status: 'active' }]
  const beforeBiz = JSON.stringify(ops.businesses)
  const { map, seeded } = M.ensureMap(ops)
  assert.equal(seeded, true)
  assert.deepEqual(map.nodes.map(n => n.id), ['hy', 'lechuan', 'rm', 'shangmiao', 'divios', 'hsinchu3c'])
  assert.deepEqual(map.nodes.map(n => n.name), ['HY', '樂川', 'RM 餐酒館', '上淼', '迪繆斯 DIVIOS', '新竹3C手機店'])
  assert.deepEqual(M.statusSummary(map).map(s => s.status), ['未知', '未知', '未知', '未知', '未知'])
  assert.equal(map.edges.length, 5)
  const hidden = map.edges.filter(e => e.to !== 'hsinchu3c')
  assert.ok(hidden.every(e => e.from === 'hy' && e.type === '隱名股東'))
  assert.deepEqual(hidden.map(M.edgeLabel), ['隱名股東（未知）', '隱名股東（未知）', '隱名股東（約 45%）', '隱名股東（未知）'])
  const hsEdge = map.edges.find(e => e.to === 'hsinchu3c')
  assert.equal(hsEdge.type, '投資')
  assert.equal(hsEdge.note, '穩定合作的投資')
  assert.equal(hsEdge.via, '未知')
  assert.equal(hsEdge.written, '未知')
  assert.equal(hsEdge.confirmed, true)
  assert.equal(M.edgeLabel(hsEdge), '投資（穩定合作的投資）')
  const keys = companyFields(M)
  assert.deepEqual(keys.filter(k => k === 'income_note'), ['income_note'])
  assert.equal(M.FIELDS.company.find(f => f.key === 'income_note').label, '收入')
  assert.ok(!keys.includes('income_actual') && !keys.includes('income_leads') && !keys.includes('income_unknown'))
  for (const id of ['lechuan', 'rm', 'shangmiao', 'divios']) {
    const n = M.getNode(map, id)
    assert.equal(n.income_note, '未知')
    assert.equal(n.status, '未知')
    assert.equal(n.kind, 'company')
  }
  const hs = M.getNode(map, 'hsinchu3c')
  assert.equal(hs.income_note, '每月穩定2萬')
  assert.equal(hs.status, '未知', 'income text must not flip status to 賺')
  assert.equal(hs.legal_name, '未知')
  assert.equal(hs.tax_id, '未知')
  assert.equal(hs.stake_role, '未知')
  assert.equal(hs.stake_ratio, '未知')
  assert.equal(hs.stake_via, '未知')
  assert.doesNotMatch(hs.stake_role, /隱名/)
  assert.match(M.getNode(map, 'shangmiao').stake_ratio, /約 45%/)
  for (const id of ['lechuan', 'rm', 'divios', 'hsinchu3c']) assert.equal(M.getNode(map, id).stake_ratio, '未知')
  assert.ok(!map.nodes.some(n => /0\s*%|持股\s*0|^0$/.test(String(n.stake_ratio))))
  assert.equal(JSON.stringify(ops.businesses), beforeBiz, 'ledger is not deleted or rewritten')
  assert.ok(!map.nodes.some(n => n.kind === 'person' || n.kind === 'resource'), 'no placeholder people/resources')
  assert.equal(M.getNode(map, 'lechuan').maintainer, 'Nana')
  const again = M.ensureMap(ops)
  assert.equal(again.seeded, false, 'second pass does not ask to save again')
})

function fourCompanyMap(M) {
  const map = M.seed()
  map.nodes = map.nodes.filter(n => n.id !== 'hsinchu3c')
  map.edges = map.edges.filter(e => e.from !== 'hsinchu3c' && e.to !== 'hsinchu3c')
  for (const n of map.nodes) if (n.kind === 'company') delete n.income_note
  return map
}

test('migrates an existing four-company map without overwriting notes, status, old columns, graph, board, or the ledger', () => {
  const M = load()
  const ops = legacy()
  ops.businesses = [
    { id: 'biz_1779606945285', display_name: '新竹3C手機店', status: 'active', my_role: { equity_percent: 0 } },
    { id: 'biz_keep', display_name: '要留著的帳', status: 'paused' },
  ]
  ops.map_v2 = fourCompanyMap(M)
  const lechuan = ops.map_v2.nodes.find(n => n.id === 'lechuan')
  lechuan.status = '平'
  lechuan.income_note = '自訂收入，不要蓋掉'
  const oldActual = lechuan.income_actual
  const shang = ops.map_v2.nodes.find(n => n.id === 'shangmiao')
  const beforeGraph = JSON.stringify({ graph: ops.graph, board: ops.board })
  const beforeBiz = JSON.stringify(ops.businesses)
  const { map, seeded } = M.ensureMap(ops)
  assert.equal(seeded, true)
  assert.deepEqual(map.nodes.filter(n => n.kind === 'company').map(n => n.id), ['lechuan', 'rm', 'shangmiao', 'divios', 'hsinchu3c'])
  assert.equal(lechuan.income_note, '自訂收入，不要蓋掉')
  assert.equal(lechuan.status, '平')
  assert.equal(lechuan.income_actual, oldActual, 'old three-column text stays on the node but is not copied')
  assert.notEqual(lechuan.income_note, oldActual)
  for (const id of ['rm', 'shangmiao', 'divios']) assert.equal(M.getNode(map, id).income_note, '未知')
  assert.equal(M.getNode(map, 'rm').status, '未知')
  assert.match(shang.stake_ratio, /約 45%/)
  const hs = M.getNode(map, 'hsinchu3c')
  assert.equal(hs.income_note, '每月穩定2萬')
  assert.equal(hs.status, '未知')
  assert.equal(hs.stake_ratio, '未知')
  assert.doesNotMatch(String(hs.stake_ratio), /0/)
  const edge = map.edges.find(e => e.to === 'hsinchu3c' || e.from === 'hsinchu3c')
  assert.equal(edge.type, '投資')
  assert.equal(edge.note, '穩定合作的投資')
  assert.equal(JSON.stringify({ graph: ops.graph, board: ops.board }), beforeGraph)
  assert.equal(JSON.stringify(ops.businesses), beforeBiz)

  hs.income_note = '手改過的新竹收入'
  edge.type = '合作'
  edge.note = '使用者改過的說明'
  const second = M.ensureMap(ops)
  assert.equal(second.seeded, false)
  assert.equal(hs.income_note, '手改過的新竹收入')
  assert.equal(edge.type, '合作')
  assert.equal(edge.note, '使用者改過的說明')
  assert.equal(lechuan.status, '平')
})

test('drops retired nodes injected into map_v2 and leaves RM in place', () => {
  const M = load()
  const ops = legacy()
  ops.map_v2 = fourCompanyMap(M)
  const retired = [
    { id: 'dessert', kind: 'company', name: '甜品工廠', status: '平' },
    { id: 'bake33', kind: 'resource', name: '烘33' },
    { id: 'vending_ig', kind: 'resource', name: '智能販賣機 IG' },
    { id: 'vending_partner', kind: 'person', name: '智能販賣機合作夥伴' },
    { id: 'art_trade', kind: 'company', name: '藝術品買賣', status: '虧' },
    { id: 'anzheng', kind: 'person', name: '安正' },
    { id: 'coast', kind: 'company', name: '北海岸海鮮', status: '賺' },
    { id: 'oldbar', kind: 'company', name: '餐酒館', status: '未知' },
    { id: 'bigbar', kind: 'company', name: '大型餐酒館＋招待所' },
    { id: 'zhubei', kind: 'resource', name: '竹北餐飲／招待資源' },
    { id: 'tailor', kind: 'resource', name: '成衣／裁縫資源' },
    { id: 'cuyu', kind: 'company', name: '川嶼', status: '平' },
    { id: 'chuanyang', kind: 'company', name: '川泱', status: '賺' },
  ]
  ops.map_v2.nodes.push(...retired)
  ops.map_v2.edges.push({ id: 'e_bad', from: 'hy', to: 'dessert', type: '合作', confirmed: true, note: '' })
  ops.map_v2.edges.push({ id: 'e_coast', from: 'hy', to: 'coast', type: '投資', confirmed: true, note: '已結束' })
  const beforeGraph = JSON.stringify({ graph: ops.graph, board: ops.board })
  const { map, seeded } = M.ensureMap(ops)
  assert.equal(seeded, true)
  const names = map.nodes.map(n => n.name)
  assert.deepEqual(names, ['HY', '樂川', 'RM 餐酒館', '上淼', '迪繆斯 DIVIOS', '新竹3C手機店'])
  assert.ok(names.includes('RM 餐酒館'))
  assert.ok(!map.nodes.some(n => /甜品|烘33|販賣機|藝術品|安正|川嶼|川泱|北海岸|招待|裁縫|^餐酒館$/.test(n.name)))
  assert.ok(!map.edges.some(e => e.id === 'e_bad' || e.id === 'e_coast' || e.to === 'dessert' || e.to === 'coast'))
  assert.equal(JSON.stringify({ graph: ops.graph, board: ops.board }), beforeGraph)
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

test('layout puts HY at centre and five companies evenly on ring 1; fit stays inside desktop and phone', () => {
  const M = load()
  const { map } = M.ensureMap({})
  M.addNode(map, 'person', { name: 'P' })
  function angles(pos) {
    return M.COMPANY_IDS.map(id => Math.atan2(pos[id].y, pos[id].x)).sort((a, b) => a - b)
  }
  function assertEven(pos) {
    const angs = angles(pos)
    assert.equal(angs.length, 5)
    for (let i = 0; i < angs.length; i++) {
      let delta = angs[(i + 1) % angs.length] - angs[i]
      if (i === angs.length - 1) delta += Math.PI * 2
      assert.ok(Math.abs(delta - (Math.PI * 2) / 5) < 0.03, 'angle step ' + delta)
    }
  }
  for (const aspect of [1.6, 1280 / 720, 390 / 844, 360 / 700]) {
    const pos = M.layout(map, aspect)
    assert.equal(pos.hy.x, 0); assert.equal(pos.hy.y, 0)
    assertEven(pos)
    const d = id => Math.hypot(pos[id].x, pos[id].y)
    const pid = map.nodes.find(n => n.kind === 'person').id
    assert.ok(d(pid) > Math.max(...M.COMPANY_IDS.map(d)))
  }
  function cardRects(pos) {
    return Object.entries(pos).map(([id, p]) => {
      const w = id === 'hy' ? 108 : M.COMPANY_IDS.includes(id) ? 184 : 120
      const h = id === 'hy' ? 108 : M.COMPANY_IDS.includes(id) ? 110 : 120
      return { x: p.x - w / 2, y: p.y - h / 2, w, h }
    })
  }
  function assertFit(w, h) {
    const pos = M.layout(map, w / h)
    const rects = cardRects(pos)
    const f = M.fit(rects, w, h, 24)
    for (const r of rects) {
      assert.ok(r.x * f.scale + f.tx >= 23 && (r.x + r.w) * f.scale + f.tx <= w - 23)
      assert.ok(r.y * f.scale + f.ty >= 23 && (r.y + r.h) * f.scale + f.ty <= h - 23)
    }
  }
  assertFit(1440, 800)
  assertFit(1280, 720)
  assertFit(390, 844)
  assertFit(360, 700)
  // 右側詳情打開時，適配範圍是面板以外的畫布
  assertFit(1440 - 420, 800)
  assertFit(1280 - 420, 720)
})

test('dashboard page no longer has a portfolio tab or the retired coast name', () => {
  const html = readFileSync(new URL('../public/sam-dashboard.html', import.meta.url), 'utf8')
  const mapJs = readFileSync(new URL('../public/sam-business-map.js', import.meta.url), 'utf8')
  const uiCss = readFileSync(new URL('../public/hy-ui/hy-ui.css', import.meta.url), 'utf8')
  for (const src of [html, mapJs, uiCss]) {
    assert.equal(src.includes('投資組合'), false)
    assert.equal(src.includes('北海岸'), false)
  }
  assert.equal(html.includes('tab-portfolio'), false)
  assert.equal(html.includes('openNewBiz'), false)
  assert.equal(html.includes('renderPortfolioTab'), false)
  assert.equal(html.includes('＋ 新增副業'), false)
  assert.equal(html.includes("'portfolio'"), false)
  assert.equal(html.includes('id="tab-strategy"'), true, 'hidden strategy tab stays')
  assert.match(html, /五家公司與收入欄的更新尚未存入系統/)
})

test('card face, edge chip and company accent follow the B1 display rules', () => {
  const M = load()
  const { map } = M.ensureMap({})
  const edgeOf = id => map.edges.find(e => e.from === 'hy' && e.to === id)
  const le = M.cardFace(M.getNode(map, 'lechuan'), edgeOf('lechuan').type)
  assert.equal(le.kicker, '隱名股東')
  assert.equal(le.name, '樂川')
  assert.equal(le.status, '')
  assert.equal(le.income, '未知')
  assert.equal(le.incomeUnknown, true)
  assert.equal(le.footer, '隱名股東・比例未知')
  const hs = M.cardFace(M.getNode(map, 'hsinchu3c'), edgeOf('hsinchu3c').type)
  assert.equal(hs.kicker, '投資')
  assert.equal(hs.footer, '投資・比例未知')
  assert.equal(hs.income, '每月穩定2萬')
  assert.equal(hs.incomeUnknown, false)
  assert.equal(hs.business, '未知')
  const sh = M.getNode(map, 'shangmiao')
  sh.status = '平'
  sh.stake_ratio = '50%（使用者 2026-11-19 口述；先前內部約數「約 45%」以此為準）'
  sh.income_note = '持續打平，無固定分紅（使用者口述）'
  sh.business = '上淼頂下（接手）一家成衣廠\n第二行不進卡面'
  const face = M.cardFace(sh, '隱名股東')
  assert.equal(face.status, '平')
  assert.equal(face.footer, '隱名股東・50%')
  assert.equal(face.income, '持續打平，無固定分紅（使用者口述）')
  assert.equal(face.business, '上淼頂下（接手）一家成衣廠')
  assert.deepEqual(M.unknownLabels(sh).filter(x => x === '透過誰持有' || x === '書面約定' || x === '支出').sort(), ['支出', '書面約定', '透過誰持有'])
  assert.equal(M.unknownLabels(sh).includes('待問'), false)
  assert.equal(M.edgeTypeLabel(edgeOf('shangmiao')), '隱名股東')
  assert.equal(M.edgeTypeLabel(edgeOf('hsinchu3c')), '投資')
  assert.equal(M.edgeLabel(edgeOf('shangmiao')), '隱名股東（約 45%）')
  const open = M.addEdge(map, 'hy', 'rm', { type: '合作', confirmed: false })
  assert.equal(M.edgeTypeLabel(open), '合作')
  assert.match(M.edgeLabel(open), /未確認/)
  assert.equal(M.accentFor(M.getNode(map, 'lechuan'), map).main, '#a5782f')
  assert.equal(M.accentFor(M.getNode(map, 'lechuan'), map).text, '#8a6326')
  assert.equal(M.accentFor(M.getNode(map, 'rm'), map).main, '#a65a3c')
  assert.equal(M.accentFor(M.getNode(map, 'shangmiao'), map).main, '#3f5e4a')
  assert.equal(M.accentFor(M.getNode(map, 'divios'), map).main, '#6e5f7a')
  assert.equal(M.accentFor(M.getNode(map, 'hsinchu3c'), map).main, '#4f6b82')
  const extra = M.addNode(map, 'company', { name: '新公司甲' })
  const extra2 = M.addNode(map, 'company', { name: '新公司乙' })
  assert.equal(M.accentFor(extra, map).main, '#7d6b4f')
  assert.equal(M.accentFor(extra2, map).main, '#5e6f63')
  const person = M.addNode(map, 'person', { name: '測試人', relation: '合夥人' })
  const resource = M.addNode(map, 'resource', { name: '測試資源', rtype: '產能' })
  assert.equal(M.accentFor(person, map).main, '#7a5c45')
  assert.equal(M.accentFor(resource, map).main, '#5f7a73')
  const capped = M.fit([{ x: 0, y: 0, w: 10, h: 10 }], 800, 800, 32)
  assert.equal(capped.scale, 1.8)
})

test('dashboard loads B1 fonts and does not keep the old status chips or dot grid', () => {
  const html = readFileSync(new URL('../public/sam-dashboard.html', import.meta.url), 'utf8')
  assert.match(html, /Newsreader/)
  assert.match(html, /Noto\+Serif\+TC:wght@500;600;700/)
  assert.match(html, /Noto\+Sans\+TC:wght@400;500;600;700/)
  assert.match(html, /family=Inter:wght@400;500;600;700/)
  assert.match(html, /display=swap/)
  assert.match(html, /preconnect" href="https:\/\/fonts\.googleapis\.com"/)
  assert.match(html, /preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/)
  assert.match(html, /'Songti TC'/)
  assert.match(html, /'PMingLiU'/)
  assert.match(html, /'Noto Serif CJK TC'/)
  assert.match(html, /'Source Han Serif TC'/)
  assert.match(html, /'PingFang TC'/)
  assert.match(html, /'Microsoft JhengHei'/)
  assert.match(html, /'Noto Sans CJK TC'/)
  assert.match(html, /lang="zh-Hant"/)
  assert.match(html, /\.bm-eyebrow\{[^}]*white-space:nowrap/)
  assert.match(html, /BUSINESS MAP · /)
  assert.equal(html.includes('id="bmStats"'), false)
  assert.equal(html.includes('radial-gradient(#d8dee8'), false)
  assert.match(html, /max-width:1024px/)
  assert.match(html, /function bmSheet\(\)/)
  assert.match(html, /function bmSideOpen\(\)/)
  assert.match(html, /bmSheet\(\)/)
  for (const hex of ['#a5782f', '#a65a3c', '#3f5e4a', '#6e5f7a', '#4f6b82', '#6f6455']) {
    assert.equal(html.includes(hex) || readFileSync(new URL('../public/sam-business-map.js', import.meta.url), 'utf8').includes(hex), true, hex)
  }
})

test('edge labels stay outside the HY halo and off the cards at every aspect', () => {
  const M = load()
  assert.deepEqual(M.labelSize('隱名股東'), { w: 68, h: 19 })
  assert.deepEqual(M.labelSize('投資'), { w: 42, h: 19 })
  const halo = M.HY_RADIUS + M.HY_GLOW
  function hitsCircle(rect, r) {
    const x = Math.max(rect.x, Math.min(0, rect.x + rect.w))
    const y = Math.max(rect.y, Math.min(0, rect.y + rect.h))
    return x * x + y * y < r * r
  }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  }
  function clearance(rect) {
    const x = Math.max(rect.x, Math.min(0, rect.x + rect.w))
    const y = Math.max(rect.y, Math.min(0, rect.y + rect.h))
    return Math.hypot(x, y)
  }
  function check(map, aspect) {
    const pos = M.layout(map, aspect)
    const labels = M.edgeLabelLayout(map, pos)
    const cards = map.nodes.filter(n => n.kind !== 'hy').map(n => M.nodeBox(n, pos[n.id]))
    let minHalo = Infinity
    let minCard = Infinity
    for (const lab of labels) {
      const rect = { x: lab.x - lab.w / 2, y: lab.y - lab.h / 2, w: lab.w, h: lab.h }
      const gap = clearance(rect) - halo
      minHalo = Math.min(minHalo, gap)
      assert.equal(hitsCircle(rect, halo), false, aspect + ' ' + lab.text + ' overlaps HY halo')
      assert.ok(gap >= M.LABEL_GAP - 0.05, aspect + ' ' + lab.text + ' halo gap ' + gap)
      for (const c of cards) {
        assert.equal(overlap(rect, c), false, aspect + ' ' + lab.text + ' overlaps a card')
        const dx = Math.max(c.x - (rect.x + rect.w), rect.x - (c.x + c.w))
        const dy = Math.max(c.y - (rect.y + rect.h), rect.y - (c.y + c.h))
        const sep = dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy)
        minCard = Math.min(minCard, sep)
      }
      for (const other of labels) {
        if (other.id === lab.id) continue
        const o = { x: other.x - other.w / 2, y: other.y - other.h / 2, w: other.w, h: other.h }
        assert.equal(overlap(rect, o), false, aspect + ' labels overlap ' + lab.text)
      }
    }
    return { minHalo, minCard }
  }
  const aspects = [820 / 1040, 1024 / 1100, 1280 / 580, (1280 - 420) / 580, 1440 / 760, (1440 - 420) / 760, 390 / 620, 0.55, 1, 1.6, 2.2]
  const { map } = M.ensureMap({})
  for (const aspect of aspects) check(map, aspect)
  const person = M.addNode(map, 'person', { name: '測試人物', relation: '顧問' })
  const resource = M.addNode(map, 'resource', { name: '測試資源', rtype: '產能' })
  M.addEdge(map, 'hy', person.id, { type: '人脈', confirmed: true })
  M.addEdge(map, 'hy', resource.id, { type: '使用', confirmed: true })
  for (const aspect of [820 / 1040, 1440 / 760, 390 / 620]) check(map, aspect)
})

test('edge labels keep at least 6px of screen clearance after fit', () => {
  const M = load()
  assert.equal(M.labelGapForScale(1), M.LABEL_GAP)
  assert.ok(M.labelGapForScale(0.4) >= 6 / 0.4)
  const haloR = M.HY_RADIUS + M.HY_GLOW
  function clearance(rect) {
    const x = Math.max(rect.x, Math.min(0, rect.x + rect.w))
    const y = Math.max(rect.y, Math.min(0, rect.y + rect.h))
    return Math.hypot(x, y) - haloR
  }
  function sep(a, b) {
    const dx = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w))
    const dy = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h))
    return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy)
  }
  function screenGaps(vw, vh, detail) {
    const { map } = M.ensureMap({})
    const header = vw <= 767 ? 92 : 56
    const title = vw <= 767 ? 156 : 84
    const reserve = detail && vw > 1024 ? 420 : 0
    const stageH = Math.max(160, vh - header - title)
    const bottomInset = vw <= 900 ? 96 : 56
    const innerW = Math.max(80, vw - reserve - 64)
    const innerH = Math.max(80, stageH - 32 - bottomInset)
    const aspect = (vw - reserve) / stageH
    const pos = M.layout(map, aspect)
    const nodes = map.nodes.map(n => M.nodeBox(n, pos[n.id]))
    let scale = M.fit(nodes, innerW, innerH, 0, 1.8).scale
    let labels = M.edgeLabelLayout(map, pos, M.labelGapForScale(scale))
    const withLabels = nodes.concat(labels.map(l => ({ x: l.x - l.w / 2, y: l.y - l.h / 2, w: l.w, h: l.h })))
    scale = M.fit(withLabels, innerW, innerH, 0, 1.8).scale
    labels = M.edgeLabelLayout(map, pos, M.labelGapForScale(scale))
    const cards = map.nodes.filter(n => n.kind !== 'hy').map(n => M.nodeBox(n, pos[n.id]))
    let minHalo = Infinity
    let minCard = Infinity
    for (const lab of labels) {
      const rect = { x: lab.x - lab.w / 2, y: lab.y - lab.h / 2, w: lab.w, h: lab.h }
      const halo = clearance(rect) * scale
      minHalo = Math.min(minHalo, halo)
      assert.ok(halo >= 6 - 0.05, vw + (detail ? ' detail' : '') + ' ' + lab.text + ' halo ' + halo)
      for (const c of cards) {
        const d = sep(rect, c) * scale
        minCard = Math.min(minCard, d)
        assert.ok(d >= 6 - 0.05, vw + (detail ? ' detail' : '') + ' ' + lab.text + ' card ' + d)
      }
    }
    return { minHalo, minCard, scale }
  }
  for (const [vw, vh] of [[390, 844], [820, 1180], [1024, 1180], [1280, 720], [1440, 900]]) {
    screenGaps(vw, vh, false)
    if (vw > 1024) screenGaps(vw, vh, true)
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
