import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildGraph, filterGraph, localGraph, parseWikiTarget, simulateLayout,
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
  for (const source of [page, view, lib]) {
    assert.doesNotMatch(source, /X-Brain-Write-Key|HY_BRAIN_WRITE_KEY|alias-map/)
    assert.doesNotMatch(source, /method:\s*['"]PUT['"]/)
  }
  assert.match(page, /queryParams\.view = 'graph'/)
  assert.match(page, /關係圖/)
  assert.match(page, /看局部圖/)
})
