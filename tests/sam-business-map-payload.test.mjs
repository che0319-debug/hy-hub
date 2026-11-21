import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const fixtureUrl = new URL('./fixtures/sam-business-map-before-b1.js', import.meta.url)
const fixtureCode = readFileSync(fixtureUrl, 'utf8')
let beforeCode = fixtureCode
try {
  const fromGit = execFileSync('git', ['show', 'd4fe330:public/sam-business-map.js'], { cwd: root, encoding: 'utf8' })
  if (fromGit !== fixtureCode) throw new Error('tests/fixtures/sam-business-map-before-b1.js 不是 d4fe330 的 sam-business-map.js')
  beforeCode = fromGit
} catch (error) {
  // CI 淺層 checkout 沒有 d4fe330。fixture 是該版的複本，本機有 git 時上面會核對它沒有走樣。
  if (error && error.message && error.message.includes('不是 d4fe330')) throw error
}
const afterCode = readFileSync(new URL('../public/sam-business-map.js', import.meta.url), 'utf8')

function load(code) {
  const ctx = { crypto: globalThis.crypto }
  new Function('globalThis', code)(ctx)
  return ctx.SamBusinessMap
}
const before = load(beforeCode)
const after = load(afterCode)
const sha = s => createHash('sha256').update(s).digest('hex')
const clone = v => JSON.parse(JSON.stringify(v))

function postBody(M, raw) {
  const data = clone(raw)
  if (!data.business_ops) data.business_ops = { businesses: [], last_updated: '' }
  M.ensureMap(data.business_ops)
  return JSON.stringify(data)
}

function stripPos(json) {
  const data = JSON.parse(json)
  const nodes = data.business_ops && data.business_ops.map_v2 && data.business_ops.map_v2.nodes
  if (nodes) nodes.forEach(n => { delete n.pos })
  return JSON.stringify(data)
}

function dragBody(M, raw, id, dx, dy) {
  const data = clone(raw)
  const { map } = M.ensureMap(data.business_ops)
  const pos = M.layout(map, 1440 / 760)
  const n = M.getNode(map, id)
  n.pos = { x: Math.round(pos[id].x + dx), y: Math.round(pos[id].y + dy) }
  return JSON.stringify(data)
}

const legacy = () => ({
  _kanban: { projects: [{ id: 'p', name: '進度', milestones: [] }] },
  summary: { last_updated: '2026-11-20T21:41:53.122483+00:00' },
  business_ops: {
    businesses: [{ id: 'biz', display_name: '要留著的帳' }],
    graph: { nodes: [{ id: 'sam' }] },
    board: { rows: [{ id: 'r1' }] },
    last_updated: '2026-11-11',
  },
})

test('save body is byte-identical before and after the B1 display change', () => {
  for (const raw of [legacy(), { business_ops: { businesses: [] } }]) {
    const a = postBody(before, raw)
    const b = postBody(after, raw)
    assert.equal(a, b)
    assert.equal(sha(a), sha(b))
  }
  const draggedBefore = dragBody(before, legacy(), 'lechuan', 30, -12)
  const draggedAfter = dragBody(after, legacy(), 'lechuan', 30, -12)
  assert.equal(stripPos(draggedBefore), stripPos(draggedAfter))
  const pinned = raw => {
    const data = clone(raw)
    const { map } = after.ensureMap(data.business_ops)
    after.getNode(map, 'rm').pos = { x: 12, y: -34 }
    const other = clone(raw)
    const { map: map2 } = before.ensureMap(other.business_ops)
    before.getNode(map2, 'rm').pos = { x: 12, y: -34 }
    return [JSON.stringify(other), JSON.stringify(data)]
  }
  const [oldPin, newPin] = pinned(legacy())
  assert.equal(oldPin, newPin)
})

test('live snapshot save body matches the pre-B1 page logic', () => {
  const snapPath = fileURLToPath(new URL('../../ref/live-readonly-20261121.json', import.meta.url))
  if (!existsSync(snapPath)) return
  const raw = JSON.parse(readFileSync(snapPath, 'utf8'))
  const bodyBefore = postBody(before, raw)
  const bodyAfter = postBody(after, raw)
  const hashBefore = sha(bodyBefore)
  const hashAfter = sha(bodyAfter)
  const dragB = dragBody(before, raw, 'shangmiao', 40, 18)
  const dragA = dragBody(after, raw, 'shangmiao', 40, 18)
  const samePos = stripPos(dragB) === stripPos(dragA)
  const shots = fileURLToPath(new URL('../../shots/', import.meta.url))
  mkdirSync(shots, { recursive: true })
  writeFileSync(join(shots, 'payload-before.json'), bodyBefore)
  writeFileSync(join(shots, 'payload-after.json'), bodyAfter)
  const diff = [
    '做法：用 git show d4fe330:public/sam-business-map.js（改版前）與目前 sam-business-map.js（改版後）各跑一次 ensureMap，再 JSON.stringify 整包 data。這就是 sam-dashboard.html saveData 送出的 POST body（loadData 只多呼叫 ensureMap，不改其他欄）。沒有連線、沒有送出。',
    '快照：ref/live-readonly-20261121.json',
    '情境一 載入後不動直接儲存：' + (bodyBefore === bodyAfter ? '逐字相同' : '不相同'),
    'sha256 before ' + hashBefore,
    'sha256 after  ' + hashAfter,
    '情境二 拖一張卡後儲存：前後用各自 layout 起點加上相同位移（上淼 +40,+18）。pos 可能因版面半徑不同而不同；拿掉所有節點 pos 後其餘逐字' + (samePos ? '相同' : '不相同') + '。',
    '另外把同一組 pos {x:12,y:-34} 寫進改版前後的 RM，整包 body 逐字相同（見單元測試 pinned）。',
    '拖曳 sha256 before ' + sha(dragB),
    '拖曳 sha256 after  ' + sha(dragA),
  ].join('\n') + '\n'
  writeFileSync(join(shots, 'payload-diff.txt'), diff)
  assert.equal(bodyBefore, bodyAfter)
  assert.equal(hashBefore, hashAfter)
  assert.equal(samePos, true)
})
