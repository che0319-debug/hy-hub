import test from 'node:test'
import assert from 'node:assert/strict'
import { demoOffice, loadBotOffice, mapOffice, OFFICE_TABS, REFRESH_MS, safeDriveUrl } from '../src/botOfficeData.js'

const state = { updated: '2026-10-24T00:00:00Z', islands: [{ id: 'central', name: '中央' }], buildings: [
  { id: 'a', title: '專案 A', island: 'central', stage: 'running', executor: 'gpt', last_review: 'pass' },
  { id: 'b', title: '專案 B', island: 'central', stage: 'hy_decision', executor: 'grok-build' },
], decisions: [{ id: 'd1', status: 'open', ref: 'b', title: '待決定' }, { id: 'd2', status: 'answered', ref: 'a', title: '已回答' }] }
const index = { updated: state.updated, cards: ['meeting', 'execution', 'output', 'log', 'decision'].map(type => ({ id: type, project: 'a', type, title: type, summary: '摘要', drive_url: 'https://drive.google.com/file/d/demo/view' })) }

test('mapping uses the v0 project field, all five groups, and only open decisions', () => {
  const out = mapOffice(state, index)
  assert.equal(out.projects[0].id, 'b')
  assert.deepEqual(out.decisions.map(d => d.id), ['d1'])
  const a = out.projects.find(p => p.id === 'a')
  for (const [tab] of OFFICE_TABS) assert.equal(a.cards[tab].length, 1)
  assert.equal(a.island, '中央')
  assert.equal(a.executor, 'gpt')
  assert.equal(out.projects.find(p => p.id === 'b').cards.meeting.length, 0)
  assert.equal('last_review' in a, false)
})

test('demo is separate, includes all canonical stages, each card type, and an open decision', () => {
  const out = demoOffice()
  assert.ok(out.projects.length >= 3)
  assert.deepEqual(new Set(out.projects.map(p => p.stage)), new Set(['unassigned', 'assigned', 'running', 'review', 'hy_decision', 'done', 'returned']))
  assert.equal(out.decisions.length, 1)
  assert.ok(out.projects.every(p => OFFICE_TABS.every(([tab]) => p.cards[tab].length > 0)))
  assert.equal(REFRESH_MS, 30000)
})

test('data layer uses only the two GET office endpoints with auth and no-store', async () => {
  const calls = []
  const signal = new AbortController().signal
  const result = await loadBotOffice({ base: 'https://api.example/', headers: { Authorization: 'test-only' }, signal,
    fetcher: async (url, options) => { calls.push([url, options]); return new Response(JSON.stringify(url.endsWith('state') ? state : index), { headers: { 'X-Brain-Updated': state.updated } }) } })
  assert.deepEqual(calls.map(c => c[0]).sort(), ['https://api.example/api/office/index', 'https://api.example/api/office/state'])
  assert.ok(calls.every(([, o]) => o.method === 'GET' && o.cache === 'no-store' && o.signal === signal && o.headers.Authorization === 'test-only'))
  assert.equal(result.projects.length, 2)
})

test('stale header from either file propagates and updated headers override payload', async () => {
  const result = await loadBotOffice({ fetcher: async url => new Response(JSON.stringify(url.endsWith('state') ? state : index), {
    headers: { 'X-Brain-Stale': url.endsWith('index') ? '1' : '0', 'X-Brain-Updated': '2026-10-24T12:00:00+08:00' },
  }) })
  assert.equal(result.stale, true)
  assert.match(result.updated, /12:00:00/)
})

test('404 is explicit empty data, never replaced with demo content', async () => {
  await assert.rejects(loadBotOffice({ fetcher: async () => new Response('{"error":"brain_data_not_ready"}', { status: 404 }) }), e => e.kind === 'empty')
})

test('401 prompts login even without a JSON error body', async () => {
  await assert.rejects(loadBotOffice({ fetcher: async () => new Response('Unauthorized', { status: 401 }) }), e => e.kind === 'auth')
})

test('service and malformed JSON errors stay errors', async () => {
  for (const response of [() => new Response('{}', { status: 503 }), () => new Response('{broken')]) {
    await assert.rejects(loadBotOffice({ fetcher: async () => response() }), e => e.kind === 'error')
  }
})

test('unknown stages and extra fields are tolerated, unsafe links are not active', () => {
  const out = mapOffice({ ...state, schema_version: 55, buildings: [{ id: 'new', stage: 'future', future: 1 }] }, { cards: [] })
  assert.equal(out.projects[0].stageLabel, '狀態待確認')
  assert.equal(safeDriveUrl('javascript:alert(1)'), null)
  assert.equal(safeDriveUrl('data:text/html,test'), null)
  assert.equal(safeDriveUrl('https://drive.google.com/'), 'https://drive.google.com/')
})
