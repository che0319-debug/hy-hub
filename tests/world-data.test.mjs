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
