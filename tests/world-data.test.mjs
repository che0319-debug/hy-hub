import test from 'node:test'
import assert from 'node:assert/strict'
import { botStatus, deriveBots, deriveSummary, FIG_AGENT } from '../src/life-island/worldData.js'

test('狀態判定與首頁像素視圖同一套', () => {
  assert.equal(botStatus({ mobileStatus: 'attention' }), 'you')
  assert.equal(botStatus({ waiting: 1 }), 'you')
  assert.equal(botStatus({ risks: 2 }), 'you')
  assert.equal(botStatus({ mobileStatus: 'running' }), 'ai')
  assert.equal(botStatus({ working: 3 }), 'ai')
  assert.equal(botStatus({ mobileStatus: 'idle' }), 'wait')
  // 需要你處理優先於 AI 執行中
  assert.equal(botStatus({ mobileStatus: 'running', waiting: 1 }), 'you')
})

test('deriveBots：四位有資料、其他沒有', () => {
  const mobile = { bots: [
    { id: 'hy', status: 'idle', current: '' },
    { id: '950157', status: 'running', current: '整理月報初稿' },
    { id: 'family', status: 'attention', current: '接送時間要確認' },
    { id: 'sam', status: 'idle', current: '' },
  ] }
  const daily = { agents: { sam: { waitingApproval: 1, working: 0, proposals: { counts: { risks: 0 }, results: [{ outcome: '整理了手機店的庫存' }] } } } }
  const r = deriveBots(mobile, daily)
  assert.deepEqual(Object.keys(r).sort(), Object.keys(FIG_AGENT).sort())
  assert.equal(r.p950157.status, 'ai'); assert.equal(r.p950157.doing, '整理月報初稿')
  assert.equal(r.xiaoyin.status, 'you')
  assert.equal(r.sam.status, 'you'); assert.equal(r.sam.doing, '1 項提案等你核准'); assert.equal(r.sam.last, '整理了手機店的庫存')
  assert.equal(r.hy.status, 'wait'); assert.equal(r.hy.doing, '目前沒有進行中的工作'); assert.equal(r.hy.last, '尚無完成紀錄')
})

test('deriveBots：沒資料就是 null，不編造', () => {
  assert.deepEqual(deriveBots(null, null), { hy: null, p950157: null, xiaoyin: null, sam: null })
  const only = deriveBots(null, { agents: { hy: { waitingApproval: 0, working: 2, proposals: { counts: {}, results: [] } } } })
  assert.equal(only.hy.status, 'ai'); assert.equal(only.sam, null)
})

test('deriveSummary：待你確認取 openTotal；系統數讀取失敗的來源', () => {
  assert.deepEqual(deriveSummary({ aiWork: { openTotal: 4 }, loaded: true }), { needsYou: 4, systemIssues: 0 })
  assert.deepEqual(deriveSummary({ aiWork: null, loaded: false }), { needsYou: null, systemIssues: null })
  assert.equal(deriveSummary({ aiWork: null, aiWorkError: true, mobileFailed: true, dailyFailed: false, loaded: true }).systemIssues, 2)
})

import { deriveRunners, RUNNER_FIG, LIVE_FIGS } from '../src/life-island/worldData.js'

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
  assert.equal(r.atlas, undefined)   // Atlas 沒有 runner 對應，不編造
  assert.equal(r.gpt.last, null)
})

test('deriveRunners：沒有資料就是空物件；未知 runner 與 lane: 開頭的忽略', () => {
  assert.deepEqual(deriveRunners(null), {})
  assert.deepEqual(deriveRunners({}), {})
  const r = deriveRunners({ runners: { 'lane:CODEX': { running: 5, ready: 0 }, 'owner-bot:hy': { running: 1 } } })
  assert.equal(r.gpt.status, 'wait'); assert.equal(r.claude.status, 'wait')
})

test('LIVE_FIGS 包含四位小幫手與三位執行者，不含 Atlas', () => {
  for (const id of ['hy', 'p950157', 'xiaoyin', 'sam', 'gpt', 'claude', 'grokbuild']) assert.ok(LIVE_FIGS.has(id), id)
  assert.ok(!LIVE_FIGS.has('atlas'))
  assert.equal(RUNNER_FIG['chatgpt-work'], 'gpt')
})
