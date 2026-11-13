import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { mapOffice } from '../src/botOfficeData.js'
import { meetingZones, waitingLabel, decisionOwner, closedLabel } from '../src/lib/botOfficeView.mjs'

const state = {
  updated: '2026-11-01T12:00:00+08:00',
  buildings: [{ id: 'p-002', title: '川泱購物', stage: 'running', owner_bot: 'sam', follow_ups: [{ id: 'f1', text: '營業項目待會計確認', status: 'open' }, '正式收款前請會計確認', '  '] }],
  decisions: [
    { id: 'new', project: 'p-002', kind: 'pi_decision', status: 'open', title: '要你拍板', created_by: 'sam', created_at: '2026-11-01T03:00:00Z' },
    { id: 'old', project: 'p-002', kind: 'intake', status: 'open', title: '要你提供資料', asked_at: '2026-10-30T03:00:00Z' },
    { id: 'a1', project: 'p-002', kind: 'intake', status: 'answered', title: '較早結案', answered_at: '2026-10-24T11:52:30Z' },
    { id: 'a2', project: 'p-002', kind: 'approval', status: 'answered', title: '較晚結案', answered_at: '2026-11-01T05:07:56Z' },
    { id: 'x', project: 'p-002', status: 'withdrawn', title: '不顯示' },
  ],
}

test('會議室第一區：決策卡與補資料卡同一層、最久的排前面，件數等於頁首「N 項待你處理」', () => {
  const [project] = mapOffice(state, { cards: [] }).projects
  const zones = meetingZones(project)
  assert.deepEqual(zones.pending.map(d => d.id), ['old', 'new'])
  assert.equal(zones.pending.length, project.decisions.length)
  assert.deepEqual(zones.closed.map(d => d.id), ['a2', 'a1'])
  assert.equal(project.allDecisions.find(d => d.id === 'new').askedAt, '2026-11-01T03:00:00Z')
  assert.deepEqual(project.followUps.map(f => [f.text, f.status]), [['營業項目待會計確認', 'open'], ['正式收款前請會計確認', 'open']])
})

test('會議室卡片顯示負責 Bot 與等待時間', () => {
  const now = Date.parse('2026-11-01T12:00:00Z')
  assert.equal(waitingLabel('2026-11-01T11:30:00Z', now), '已等 30 分鐘')
  assert.equal(waitingLabel('2026-11-01T07:00:00Z', now), '已等 5 小時')
  assert.equal(waitingLabel('2026-10-30T09:00:00Z', now), '已等 2 天 3 小時')
  assert.equal(waitingLabel('2026-10-30T12:00:00Z', now), '已等 2 天')
  assert.equal(waitingLabel('', now), '等待時間待補')
  assert.equal(decisionOwner({ createdBy: 'sam' }, { ownerBot: 'hy' }), 'Sam')
  assert.equal(decisionOwner({}, { ownerBot: 'family' }), '小因')
  assert.equal(decisionOwner({}, { ownerBot: 'english' }), 'Emma')
  assert.equal(decisionOwner({}, { ownerBot: 'fitness' }), 'Wade')
  assert.equal(decisionOwner({}, { ownerBot: 'nana' }), 'Nana')
  assert.equal(decisionOwner({}, {}), '負責 Bot 待補')
  assert.equal(closedLabel('bad'), '結案時間待補')
  const closed = closedLabel('2026-11-01T05:07:56Z'); assert(closed.startsWith('結案 ') && closed.includes('13:07'), closed)
})

test('概況不再放待處理項目；會議室三區順序固定，執行前待辦只能看', async () => {
  const page = await readFile(new URL('../src/pages/BotOffice.jsx', import.meta.url), 'utf8')
  const overview = page.slice(page.indexOf("hidden={tab!=='overview'}"), page.indexOf("hidden={tab!=='meeting'}"))
  assert(!/DecisionList|Decisions|OfficeFollowUps|pendingAdvances/.test(overview))
  assert(!/<OfficeFollowUps/.test(page))
  assert.match(page, /key==='meeting'&&project\.decisions\.length>0/)
  const panels = await readFile(new URL('../src/components/BotOfficePanels.jsx', import.meta.url), 'utf8')
  const meeting = panels.slice(panels.indexOf('export function OfficeMeeting('), panels.indexOf('export function OfficeExecution('))
  const order = ['<MeetingPending', 'aria-label="參考資料與建議"', '<OfficeAttachments', '<MeetingClosed'].map(token => meeting.indexOf(token))
  assert(order.every(i => i > 0)); assert.deepEqual([...order].sort((a, b) => a - b), order)
  const readonly = panels.slice(panels.indexOf('function MeetingPending('), panels.indexOf('function MeetingClosed('))
  assert(!/writeOffice|deleteOffice|onDelete|<button|<form|<textarea/.test(readonly))
  const actions = await readFile(new URL('../src/components/OfficeActions.jsx', import.meta.url), 'utf8')
  const followUps = actions.slice(actions.indexOf('export function OfficeFollowUps('), actions.indexOf('export function OfficeReview('))
  assert(followUps.length > 0 && !/<button|<form|<textarea|<input|onClick/.test(followUps))
})
