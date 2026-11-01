import test from 'node:test'
import assert from 'node:assert/strict'
import { isMilestoneDone } from '../src/lib/reportSummary.mjs'
import { mapOffice } from '../src/botOfficeData.js'
import {
  annotateMilestones, closureReason, compareId, decisionReviewView, diagramModel, isMilestoneOrGateFlow,
  needsYouCount, openProjectBody, projectFlow, verdictLabel,
} from '../src/lib/officeFlow.mjs'

const ms = (id, extra = {}) => ({ id, name: `【示意資料】${id}`, ...extra })

test('compareId sorts by number, then M before G', () => {
  assert.deepEqual(['M5', 'G1', 'M1', 'G2', 'M2'].sort(compareId), ['M1', 'G1', 'M2', 'G2', 'M5'])
  assert.ok(compareId('G1', 'M5') < 0)
  assert.ok(compareId('M2', 'G2') < 0)
})

test('old status infers done, cancelled, running, or waiting; 通過 stays out of isMilestoneDone', () => {
  assert.equal(isMilestoneDone({ status: '通過' }), false)
  assert.equal(isMilestoneDone({ status: '已通過' }), false)
  const rows = annotateMilestones([
    ms('M1', { status: '已完成' }),
    ms('M2', { status: '通過' }),
    ms('M3', { status: '已取消' }),
    ms('M4', { status: 'pending' }),
    ms('M5', { status: 'pending', depends_on: ['M4'] }),
    ms('G1'),
    ms('M0', { status: 'review' }),
  ])
  const step = id => rows.find(item => item.id === id).step
  assert.equal(step('M1'), 'done')
  assert.equal(step('M2'), 'done')
  assert.equal(step('M3'), 'cancelled')
  assert.equal(step('M4'), 'running')
  assert.equal(step('M5'), 'waiting')
  assert.equal(rows.find(item => item.id === 'G1').kind, 'gate')
  assert.equal(rows.find(item => item.id === 'M0').kind, 'plan')
  assert.equal(step('G1'), 'running')
})

test('decision dependencies and cycles', () => {
  const open = [{ id: 'd1', status: 'open' }]
  const answered = [{ id: 'd1', status: 'answered' }]
  assert.equal(annotateMilestones([ms('M1', { depends_on: ['d1'] })], open)[0].step, 'waiting')
  assert.equal(annotateMilestones([ms('M1', { depends_on: ['d1'] })], answered)[0].step, 'running')
  const loop = annotateMilestones([
    ms('M1', { depends_on: ['M2'] }),
    ms('M2', { depends_on: ['M1'] }),
  ])
  assert.equal(loop[0].step, 'waiting')
  assert.equal(loop[1].step, 'waiting')
  assert.equal(annotateMilestones([ms('M1', { depends_on: [] })])[0].step, 'running')
})

test('scenario A is planning and lights the review cell from M0', () => {
  const flow = projectFlow({
    stage: 'review',
    plan: { version: 1 },
    milestones: [ms('M0', { step: 'review', kind: 'plan' })],
  })
  assert.equal(flow.flow_phase, 'planning')
  assert.equal(flow.plan_step, 'review')
  assert.deepEqual(flow.lead_step, { milestone_id: 'M0', step: 'review', label: '待審' })
  assert.deepEqual(flow.step_board.review, [])
  const model = diagramModel(flow, 'review')
  assert.equal(model.planning.find(item => item.name === '規劃中').state, 'passed')
  assert.equal(model.planning.find(item => item.name === '審查中').state, 'on')
  assert.equal(model.planning.find(item => item.name === '核定中').state, 'idle')
  assert.ok(model.execution.every(item => item.state === 'idle'))
  assert.equal(model.nodes.at(-1).state, 'idle')
  assert.equal(model.nodes[0].state, 'passed')
  assert.equal(model.planCaption, '規劃書 v1')
  assert.match(model.aria, /亮著：規劃審查中/)
  assert.match(model.waitingText, /等前置：無/)
})

test('scenario B lights every execution cell and leads with G1', () => {
  const flow = projectFlow({
    stage: 'running',
    milestones: [
      ms('M1', { step: 'done' }),
      ms('M2', { step: 'done' }),
      ms('M3', { step: 'running' }),
      ms('M5', { step: 'review' }),
      ms('M4', { step: 'review' }),
      ms('G1', { step: 'hy_decision', kind: 'gate' }),
      ms('M6', { step: 'waiting', depends_on: ['M5', 'G1'] }),
      ms('M7', { step: 'cancelled' }),
      ms('M0', { step: 'done', kind: 'plan' }),
    ],
  })
  assert.equal(flow.flow_phase, 'execution')
  assert.equal(flow.plan_redo, false)
  assert.deepEqual(flow.lead_step, { milestone_id: 'G1', step: 'hy_decision', label: 'G1 核定中' })
  assert.deepEqual(flow.step_board.review, ['M4', 'M5'])
  assert.deepEqual(flow.step_board.hy_decision, ['G1'])
  assert.deepEqual(flow.step_board.waiting, ['M6'])
  assert.deepEqual(flow.step_board.done, ['M1', 'M2'])
  assert.deepEqual(flow.step_board.cancelled, ['M7'])
  assert.equal(flow.step_board.running.includes('M0'), false)
  const model = diagramModel(flow, 'running')
  assert.ok(model.planning.every(item => item.state === 'passed'))
  assert.equal(model.execution.find(item => item.name === '執行中').idText, 'M3')
  assert.equal(model.execution.find(item => item.name === '審查中').idText, 'M4、M5')
  assert.equal(model.execution.find(item => item.name === '核定中').idText, 'G1')
  assert.ok(model.execution.every(item => item.state === 'on'))
  assert.equal(model.nodes.at(-1).state, 'idle')
  assert.equal(model.waitingText, '等前置：M6')
  assert.equal(model.doneText, '已完成 2')
  assert.equal(model.cancelledText, '已取消 1')
  assert.match(model.aria, /執行核定中（G1）/)
})

test('scenario C lights planning review again while execution is underway', () => {
  const flow = projectFlow({
    stage: 'running',
    plan: { version: 2 },
    milestones: [
      ms('M0', { step: 'review', kind: 'plan' }),
      ms('M1', { step: 'done' }),
      ms('M2', { step: 'running' }),
    ],
  })
  assert.equal(flow.flow_phase, 'execution')
  assert.equal(flow.plan_step, 'review')
  assert.equal(flow.plan_redo, true)
  const model = diagramModel(flow, 'running')
  assert.equal(model.planCaption, '規劃書 v2')
  assert.equal(model.planning.find(item => item.name === '審查中').state, 'on')
  assert.equal(model.planning.find(item => item.name === '規劃中').state, 'passed')
  assert.equal(model.execution.find(item => item.name === '執行中').state, 'on')
  assert.equal(model.nodes.at(-1).state, 'idle')
})

test('done project lights only 完成, and backend fields win when present', () => {
  const computed = projectFlow({ stage: 'done', milestones: [ms('M1', { step: 'running' })] })
  assert.equal(computed.flow_phase, 'done')
  assert.equal(computed.lead_step.label, '完成')
  assert.equal(diagramModel(computed, 'done').nodes.at(-1).state, 'on')
  const given = projectFlow({
    stage: 'running',
    flow_phase: 'execution',
    plan_step: 'done',
    step_board: { hy_decision: ['M9'], waiting: [], running: [], review: [], done: [], cancelled: [] },
    lead_step: { milestone_id: 'M9', step: 'hy_decision', label: 'M9 核定中' },
    milestones: [ms('M1', { step: 'running' })],
  })
  assert.equal(given.flow_phase, 'execution')
  assert.equal(given.plan_step, 'done')
  assert.equal(given.lead_step.label, 'M9 核定中')
  assert.deepEqual(given.step_board.hy_decision, ['M9'])
})

test('all milestones closed but the project is not done', () => {
  const flow = projectFlow({ stage: 'running', milestones: [ms('M1', { step: 'done' }), ms('G1', { step: 'cancelled' })] })
  assert.equal(flow.lead_step.label, '里程碑已全部完成')
  assert.equal(flow.closure_reason, '')
})

test('closure reason lists unfinished M and G ids and ignores M0', () => {
  assert.equal(closureReason([
    ms('M0', { step: 'review', kind: 'plan' }),
    ms('G2', { step: 'hy_decision' }),
    ms('M4', { step: 'waiting' }),
    ms('M1', { step: 'done' }),
    ms('M7', { step: 'cancelled' }),
  ]), '還有 2 個里程碑未完成：G2、M4')
  assert.equal(closureReason([]), '')
  assert.equal(closureReason([ms('M1', { status: 'done' }), ms('G1', { status: '已取消' })]), '')
})

test('needsYou counts milestone and gate cards without double-counting a plan card on a hy_decision project', () => {
  const projects = [
    { id: 'p4', stage: 'hy_decision', decisions: [{ id: 'd1', status: 'open', kind: 'approval' }] },
    { id: 'p2', stage: 'running', decisions: [] },
  ]
  assert.equal(needsYouCount(projects, projects.flatMap(item => item.decisions)), 1)
  projects[0].decisions.push({ id: 'g1', status: 'open', flow: { kind: 'gate', target: 'G1' } })
  projects[1].decisions.push({ id: 'm5', status: 'open', flow: { kind: 'milestone', target: 'M5' } })
  projects[0].decisions.push({ id: 'plan', status: 'open', flow: { kind: 'plan', target: 'plan-v1' } })
  assert.equal(isMilestoneOrGateFlow(projects[0].decisions[1]), true)
  assert.equal(isMilestoneOrGateFlow(projects[0].decisions[2]), false)
  assert.equal(needsYouCount(projects), 3)
})

test('mapOffice keeps stage totals and adds needsYou plus flow review', () => {
  const out = mapOffice({
    buildings: [
      { id: 'a', owner_bot: 'sam', stage: 'assigned' },
      { id: 'd', owner_bot: 'sam', stage: 'hy_decision' },
      { id: 'x', owner_bot: 'sam', stage: 'running' },
    ],
    decisions: [
      { id: 'old', ref: 'd', status: 'open', kind: 'approval', title: '舊卡' },
      {
        id: 'gate', project: 'x', status: 'open', kind: 'approval',
        flow: { version: 1, target: 'G1', kind: 'gate' },
        review: { verdict: 'PASS', verdict_text: '可以', must_fix: ['補一項'], report_file_id: 'abc_DEF-123456' },
      },
    ],
  }, { cards: [] })
  assert.deepEqual(out.totals.stages, { assigned: 1, hy_decision: 1, running: 1, review: 0, done: 0 })
  assert.equal(out.totals.needsYou, 2)
  const gate = out.allDecisions.find(item => item.id === 'gate')
  assert.equal(gate.flow.target, 'G1')
  assert.equal(verdictLabel(gate.review.verdict), '通過')
  assert.equal(gate.review.reportUrl, 'https://drive.google.com/file/d/abc_DEF-123456/view')
  assert.deepEqual(gate.review.mustFix, ['補一項'])
  assert.equal(decisionReviewView({ report_url: 'http://evil.example/x' }).reportUrl, null)
  assert.equal(verdictLabel('CONDITIONAL_PASS'), '有條件 PASS')
  assert.equal(verdictLabel('FAIL'), '不通過')
})

test('direct open body matches open_project required keys', () => {
  const body = openProjectBody({ request_id: 'r1', owner_bot: 'sam', title: ' 名稱 ', goal: '目標', content: '' })
  assert.deepEqual(body, {
    request_id: 'r1',
    answered_by: 'sam',
    title: '名稱',
    goal: '目標',
    approved_in: 'HY 在 Bot Office 直接開案',
    project_file: 'gui-open',
  })
  assert.equal('content' in body, false)
  assert.equal('owner_bot' in body, false)
  assert.equal(openProjectBody({ title: 'x'.repeat(90), goal: 'y'.repeat(320), content: 'z'.repeat(210), owner_bot: 'hy', request_id: 'r' }).title.length, 80)
  assert.equal(openProjectBody({ title: 'a', goal: 'b', content: 'z'.repeat(210), owner_bot: 'hy', request_id: 'r' }).approved_in.length, 200)
})
