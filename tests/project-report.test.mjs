import test from 'node:test'
import assert from 'node:assert/strict'
import { reportView, refreshMessage, shouldPoll, downloadName, isReportFile, isReportPackage } from '../src/lib/projectReport.js'

const latest = { file_id: 'f1', filename: '00_專案報告.html', revision: 2, created_at: 1 }

test('state → label/tone/buttons for every report state', () => {
  assert.deepEqual([reportView({ state: 'none', latest: null }).label, reportView({ state: 'none', latest: null }).canOpen], ['尚未產生', false])
  assert.equal(reportView({ state: 'running', latest }).label, '整理中')
  assert.equal(reportView({ state: 'running', latest }).canRefresh, false)
  assert.equal(reportView({ state: 'queued', latest: null }).label, '排隊中')
  const stale = reportView({ state: 'idle', latest, stale: true })
  assert.deepEqual([stale.tone, stale.label, stale.canOpen, stale.canRefresh, stale.revision], ['you', '有新進度', true, true, 2])
  assert.equal(reportView({ state: 'idle', latest, stale: false }).tone, 'done')
  assert.equal(reportView({ state: 'failed', latest }).tone, 'bad')
  assert.equal(reportView({ state: 'failed', latest }).canOpen, true)
  const fin = reportView({ state: 'idle', latest, stale: false, final: true })
  assert.deepEqual([fin.title, fin.label], ['結案報告', '已結案'])
})

test('refresh results never spend quota silently and explain themselves', () => {
  assert.equal(refreshMessage({ status: 'queued' }).tone, 'ok')
  assert.match(refreshMessage({ status: 'already_queued' }).text, /整理中/)
  const none = refreshMessage({ status: 'no_change' })
  assert.equal(none.canForce, true)
  assert.match(none.text, /不耗 AI 額度/)
  assert.equal(refreshMessage(null).tone, 'bad')
})

test('polling only while queued or running; report files and packages are recognised', () => {
  assert.deepEqual(['queued', 'running', 'idle', 'failed', 'none'].map(s => shouldPoll({ state: s })), [true, true, false, false, false])
  assert.equal(isReportFile({ filename: '00_專案報告.html' }), true)
  assert.equal(isReportFile({ filename: 'a.md' }), false)
  assert.equal(isReportPackage({ type: 'PROJECT_REPORT' }), true)
})

test('download name is filesystem-safe and versioned', () => {
  assert.equal(downloadName('川嶼/蛋糕:商轉', { latest }), '川嶼_蛋糕_商轉_專案報告_v2.html')
  assert.equal(downloadName('X', { latest, final: true }), 'X_結案報告_v2.html')
})
