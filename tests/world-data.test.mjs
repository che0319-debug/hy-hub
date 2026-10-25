import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveOffice, deriveTodos, deriveRunners, deriveSummary, RUNNER_FIG, LIVE_FIGS } from '../src/life-island/worldData.js'
import { ROSTER, HELPERS } from '../src/botRoster.js'
import { mapOffice } from '../src/botOfficeData.js'

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

test('名冊：四位小幫手＋四位執行者，id 不重複', () => {
  assert.equal(HELPERS.length, 4)
  assert.equal(ROSTER.length, 8)
  assert.equal(new Set(ROSTER.map(r => r.id)).size, 8)
  assert.deepEqual(HELPERS.map(h => h.agent), ['hy', '950157', 'family', 'sam'])
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

test('LIVE_FIGS：四位小幫手與三位執行者，不含 Atlas', () => {
  for (const id of ['hy', 'p950157', 'xiaoyin', 'sam', 'gpt', 'claude', 'grokbuild']) assert.ok(LIVE_FIGS.has(id), id)
  assert.ok(!LIVE_FIGS.has('atlas'))
  assert.equal(RUNNER_FIG['chatgpt-work'], 'gpt')
})

test('deriveSummary：待你確認取 Bot Office；系統數讀取失敗的來源', () => {
  assert.deepEqual(deriveSummary({ pending: 4, failedCount: 0, loaded: true }), { needsYou: 4, systemIssues: 0 })
  assert.deepEqual(deriveSummary({ pending: null, failedCount: 0, loaded: false }), { needsYou: null, systemIssues: null })
  assert.equal(deriveSummary({ pending: 0, failedCount: 2, loaded: true }).systemIssues, 2)
})
