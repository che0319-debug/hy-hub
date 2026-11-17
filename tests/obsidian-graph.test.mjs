import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  DIMENSION_TAG_MAP, INDEX_CARD_ID, MAJOR_LABEL_LIMIT, UNLABELED_DIMENSION,
  applyIndexVisibility, buildGraph, dimensionsOf, filterByDimensions, filterGraph, localGraph,
  majorLabelIds, parseWikiTarget, shortTitle, simulateLayout,
} from '../src/lib/obsidianGraph.js'

const cards = [
  { id: 'person-a', type: 'person', title: '人物甲', state: 'current', related: ['[[know-b|知識乙]]', '[[event-c]]', '[[know-b]]'], backlinks: ['dec-d'] },
  { id: 'know-b', type: 'know', title: '知識乙', state: 'current', related: ['[[person-a]]', '[[event-c]]'], backlinks: [] },
  { id: 'event-c', type: 'event', title: '事件丙', state: 'current', related: ['[[missing-z]]'], backlinks: ['know-b'] },
  { id: 'dec-d', type: 'dec', title: '決策丁', state: 'candidate', related: ['[[person-a|人物甲]]', '[[nope]]'], backlinks: ['ghost'] },
  { id: 'map-e', type: 'map', title: '地圖戊', state: 'current', related: ['[[map-e]]', '[[know-b]]'], backlinks: [] },
]

test('解析 [[id]] 與 [[id|別名]]', () => {
  assert.equal(parseWikiTarget('[[know-b]]'), 'know-b')
  assert.equal(parseWikiTarget('[[know-b|知識乙]]'), 'know-b')
  assert.equal(parseWikiTarget('[[ know-b | 別名 ]]'), 'know-b')
  assert.equal(parseWikiTarget('[[dec-d|決策丁|多餘]]'), 'dec-d')
  assert.equal(parseWikiTarget('know-b'), '')
  assert.equal(parseWikiTarget(''), '')
  assert.equal(parseWikiTarget(null), '')
})

test('無向邊去重，斷鏈與自我連結略過', () => {
  const graph = buildGraph(cards)
  assert.deepEqual(graph.edges, [
    { source: 'dec-d', target: 'person-a' },
    { source: 'event-c', target: 'know-b' },
    { source: 'event-c', target: 'person-a' },
    { source: 'know-b', target: 'map-e' },
    { source: 'know-b', target: 'person-a' },
  ])
  assert.equal(graph.broken, 3)
  assert.equal(graph.nodes.some(node => node.id === 'missing-z' || node.id === 'ghost' || node.id === 'nope'), false)
  assert.equal(graph.nodes.find(node => node.id === 'map-e').degree, 1)
  assert.equal(graph.nodes.find(node => node.id === 'person-a').degree, 3)
})

test('candidate 只看 state', () => {
  const graph = buildGraph([
    ...cards,
    { id: 'event-shelf', type: 'event', title: '在待上架但已是正式', state: 'current', path: '00_待上架/event-shelf.md', related: [] },
  ])
  assert.equal(graph.nodes.find(node => node.id === 'dec-d').candidate, true)
  assert.equal(graph.nodes.find(node => node.id === 'person-a').candidate, false)
  assert.equal(graph.nodes.find(node => node.id === 'event-shelf').candidate, false)
  assert.equal(graph.nodes.find(node => node.id === 'dec-d').state, 'candidate')
})

test('類型篩選拿掉節點與接到它們的邊', () => {
  const graph = filterGraph(buildGraph(cards), ['person', 'dec'])
  assert.deepEqual(graph.nodes.map(node => node.id), ['dec-d', 'person-a'])
  assert.deepEqual(graph.edges, [{ source: 'dec-d', target: 'person-a' }])
  assert.equal(graph.nodes.find(node => node.id === 'person-a').degree, 1)
  assert.equal(graph.nodes.find(node => node.id === 'dec-d').candidate, true)
  assert.equal(filterGraph(buildGraph(cards), []).nodes.length, 0)
})

test('局部圖只有中心與直接相連的卡', () => {
  const graph = buildGraph(cards)
  const local = localGraph(graph, 'person-a')
  assert.equal(local.missingCenter, false)
  assert.deepEqual(local.nodes.map(node => node.id), ['dec-d', 'event-c', 'know-b', 'person-a'])
  assert.equal(local.nodes.find(node => node.center).id, 'person-a')
  assert.equal(local.nodes.some(node => node.id === 'map-e'), false)
  assert.equal(local.edges.some(edge => edge.source === 'know-b' && edge.target === 'map-e'), false)
  assert.equal(local.edges.some(edge => edge.source === 'event-c' && edge.target === 'know-b'), true)
  const hidden = localGraph(filterGraph(graph, ['person', 'event']), 'know-b')
  assert.equal(hidden.missingCenter, true)
  assert.deepEqual(hidden.nodes, [])
  const alone = localGraph(graph, 'map-e')
  assert.deepEqual(alone.nodes.map(node => node.id), ['know-b', 'map-e'])
  assert.equal(alone.nodes.find(node => node.id === 'map-e').center, true)
})

test('力導向把中心釘在中間且結果穩定', () => {
  const graph = buildGraph(cards)
  const options = { width: 800, height: 600, centerId: 'person-a', iterations: 30 }
  const once = simulateLayout(graph.nodes, graph.edges, options)
  const twice = simulateLayout(graph.nodes, graph.edges, options)
  assert.deepEqual(once, twice)
  assert.deepEqual(once.find(point => point.id === 'person-a'), { id: 'person-a', x: 400, y: 300 })
  assert.equal(once.length, graph.nodes.length)
  for (const point of once) {
    assert.equal(Number.isFinite(point.x), true)
    assert.equal(Number.isFinite(point.y), true)
  }
  const spread = once.filter(point => Math.hypot(point.x - 400, point.y - 300) > 20)
  assert.equal(spread.length, once.length - 1)
})

test('關係圖畫面不送寫入', () => {
  const page = readFileSync(new URL('../src/pages/Obsidian.jsx', import.meta.url), 'utf8')
  const view = readFileSync(new URL('../src/pages/ObsidianGraph.jsx', import.meta.url), 'utf8')
  const lib = readFileSync(new URL('../src/lib/obsidianGraph.js', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/pages/obsidian.css', import.meta.url), 'utf8')
  for (const source of [page, view, lib]) {
    assert.doesNotMatch(source, /X-Brain-Write-Key|HY_BRAIN_WRITE_KEY|alias-map/)
    assert.doesNotMatch(source, /method:\s*['"]PUT['"]/)
  }
  assert.match(page, /queryParams\.view = 'graph'/)
  assert.match(page, /關係圖/)
  assert.match(page, /看局部圖/)
  assert.match(view, /顯示總索引/)
  assert.match(view, /七維/)
  assert.match(view, /ob-candidate-badge/)
  assert.match(css, /ob-candidate-badge-bg/)
  assert.equal([...lib.matchAll(/map-second-brain-v1-index/g)].length, 1)
  assert.doesNotMatch(view, /map-second-brain-v1-index/)
})

test('預設隱藏總索引，打開開關後出現；局部中心是索引時仍顯示', () => {
  const withIndex = [
    { id: INDEX_CARD_ID, type: 'map', title: '總索引', related: ['[[person-a]]', '[[know-b]]'], backlinks: ['event-c'] },
    ...cards,
  ]
  const graph = buildGraph(withIndex)
  assert.equal(graph.nodes.some(node => node.id === INDEX_CARD_ID), true)
  const hidden = applyIndexVisibility(graph, { showIndex: false })
  assert.equal(hidden.nodes.some(node => node.id === INDEX_CARD_ID), false)
  assert.equal(hidden.edges.some(edge => edge.source === INDEX_CARD_ID || edge.target === INDEX_CARD_ID), false)
  assert.equal(hidden.nodes.length, graph.nodes.length - 1)
  const shown = applyIndexVisibility(graph, { showIndex: true })
  assert.equal(shown.nodes.some(node => node.id === INDEX_CARD_ID), true)
  assert.equal(shown.nodes.find(node => node.id === INDEX_CARD_ID).degree > 0, true)
  const asCenter = applyIndexVisibility(graph, { showIndex: false, centerId: INDEX_CARD_ID })
  assert.equal(asCenter.nodes.some(node => node.id === INDEX_CARD_ID), true)
  const local = localGraph(asCenter, INDEX_CARD_ID)
  assert.equal(local.missingCenter, false)
  assert.equal(local.nodes.find(node => node.center).id, INDEX_CARD_ID)
  const neighbor = localGraph(hidden, 'person-a')
  assert.equal(neighbor.nodes.some(node => node.id === INDEX_CARD_ID), false)
})

test('七維對照表與欄位優先順序、多維與未標', () => {
  assert.deepEqual(DIMENSION_TAG_MAP, {
    職涯: '事業',
    職涯年表: '事業',
    新創: '事業',
    商業規劃: '事業',
    績效: '事業',
    升等: '事業',
    主管: '事業',
    履歷: '事業',
    理財: '財務',
    購屋: '財務',
    不動產: '財務',
    健康: '健康',
    家庭: '家庭',
    子女: '家庭',
    工研院: '本業',
    生活: '休閒',
    旅行: '休閒',
    求學: '成長',
    台大: '成長',
    寫作方法: '成長',
    人生規劃: '成長',
    人生地圖: '成長',
    人生大事: '成長',
  })
  assert.equal(Object.hasOwn(DIMENSION_TAG_MAP, '專利'), false)
  assert.equal(Object.hasOwn(DIMENSION_TAG_MAP, '觸覺回饋'), false)
  assert.deepEqual(dimensionsOf({ tags: ['職涯', '履歷'] }), ['事業'])
  assert.deepEqual(dimensionsOf({ tags: ['理財', '家庭'] }), ['財務', '家庭'])
  assert.deepEqual(dimensionsOf({ tags: ['工研院', '專利'] }), ['本業'])
  assert.deepEqual(dimensionsOf({ tags: ['第二大腦v1', '規則'] }), [UNLABELED_DIMENSION])
  assert.deepEqual(dimensionsOf({ '七維': ['健康', '成長'], tags: ['職涯'] }), ['健康', '成長'])
  assert.deepEqual(dimensionsOf({ dimensions: '財務', tags: ['職涯'] }), ['財務'])
  assert.deepEqual(dimensionsOf({ dimension: ['休閒'] }), ['休閒'])
  assert.deepEqual(dimensionsOf({ category: '本業' }), ['本業'])
  assert.deepEqual(dimensionsOf({ category: '不是七維', tags: ['職涯'] }), [UNLABELED_DIMENSION])
  assert.deepEqual(dimensionsOf({ category: ['事業', '家庭', '事業'] }), ['事業', '家庭'])
})

test('七維篩選為多選聯集，未標七維可單獨勾選', () => {
  const dimCards = [
    { id: 'career', type: 'event', title: '職涯卡', tags: ['職涯'], related: ['[[home]]'] },
    { id: 'home', type: 'dec', title: '家庭財務卡', tags: ['家庭', '理財'], related: [] },
    { id: 'job', type: 'know', title: '本業卡', tags: ['工研院'], related: [] },
    { id: 'rules', type: 'map', title: '規則卡', tags: ['規則'], related: [] },
    { id: 'explicit', type: 'dec', title: '明示卡', '七維': ['健康'], tags: ['職涯'], related: [] },
  ]
  const graph = buildGraph(dimCards)
  assert.deepEqual(graph.nodes.find(node => node.id === 'home').dimensions, ['財務', '家庭'])
  assert.equal(graph.nodes.find(node => node.id === 'rules').dimensions[0], UNLABELED_DIMENSION)
  const family = filterByDimensions(graph, ['家庭'])
  assert.deepEqual(family.nodes.map(node => node.id), ['home'])
  const familyOrUnlabeled = filterByDimensions(graph, ['家庭', UNLABELED_DIMENSION])
  assert.deepEqual(familyOrUnlabeled.nodes.map(node => node.id), ['home', 'rules'])
  const career = filterByDimensions(graph, ['事業'])
  assert.deepEqual(career.nodes.map(node => node.id), ['career'])
  const health = filterByDimensions(graph, ['健康'])
  assert.deepEqual(health.nodes.map(node => node.id), ['explicit'])
  assert.equal(filterByDimensions(graph, []).nodes.length, 0)
  const typed = filterGraph(filterByDimensions(graph, ['本業', '事業']), ['know'])
  assert.deepEqual(typed.nodes.map(node => node.id), ['job'])
})

test('主要節點標題：少於等於 18 張全標，多時只標前幾名與中心', () => {
  assert.equal(shortTitle('一二三四五六七八九'), '一二三四五六七八…')
  assert.equal(shortTitle('短'), '短')
  const few = buildGraph(cards)
  assert.deepEqual(majorLabelIds(few.nodes), few.nodes.map(node => node.id).sort())
  const crowd = []
  for (let index = 0; index < 25; index += 1) {
    const id = `card-${String(index).padStart(2, '0')}`
    const related = []
    if (index === 0) {
      for (let other = 1; other < 25; other += 1) related.push(`[[card-${String(other).padStart(2, '0')}]]`)
    } else if (index <= 4) {
      related.push('[[card-00]]', `[[card-0${index + 4}]]`)
    }
    crowd.push({ id, type: 'know', title: `標題${index}`, related, center: index === 24 })
  }
  const graph = buildGraph(crowd)
  const nodes = graph.nodes.map(node => ({ ...node, center: node.id === 'card-24' }))
  const labeled = majorLabelIds(nodes)
  assert.equal(labeled.includes('card-24'), true)
  assert.equal(labeled.includes('card-00'), true)
  assert.equal(labeled.length, MAJOR_LABEL_LIMIT)
  assert.equal(labeled.includes('card-20'), false)
  const top = [...nodes].sort((a, b) => (b.degree || 0) - (a.degree || 0) || a.id.localeCompare(b.id))
  for (const node of top.slice(0, MAJOR_LABEL_LIMIT - 1)) {
    if (node.id === 'card-24') continue
    assert.equal(labeled.includes(node.id), true)
  }
})

test('斷鏈列出不存在的目標 id 並去重', () => {
  const graph = buildGraph(cards)
  assert.deepEqual(graph.brokenIds, ['ghost', 'missing-z', 'nope'])
  assert.equal(graph.broken, 3)
  const repeats = buildGraph([
    { id: 'a', type: 'know', title: 'A', related: ['[[gone-1]]', '[[gone-1]]', '[[gone-2]]'], backlinks: ['gone-1'] },
    { id: 'b', type: 'know', title: 'B', related: ['[[gone-2|別名]]'], backlinks: [] },
  ])
  assert.deepEqual(repeats.brokenIds, ['gone-1', 'gone-2'])
  assert.equal(repeats.broken, 5)
})
