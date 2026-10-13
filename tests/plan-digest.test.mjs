import test from 'node:test'
import assert from 'node:assert/strict'
import { digestPlan, splitSections, docStats, capacityView } from '../src/lib/planDigest.mjs'

test('digestPlan summarizes structured plan', () => {
  const d = digestPlan({ goal: '目標', scope: ['A', 'B'], risks: ['R1'], missing_inputs: [], required_inputs: ['X'],
    milestones: [{ id: 'M1', name: '起步', goal: 'g', deliverables: ['d'], acceptance_criteria: ['a1', 'a2'], dependencies: [], is_major: true,
      packages: [{ key: 'k1', task: '做事', executor: 'CODEX', dependencies: [] }, { key: 'k2', task: '審', dependencies: ['k1'] }] },
      { id: 'M2', packages: [] }], closure: { task: '結案', acceptance_criteria: ['ok'] } })
  assert.deepEqual(d.stats, { milestones: 2, packages: 2, risks: 1, missing: 0 })
  assert.equal(d.milestones[0].isMajor, true)
  assert.equal(d.milestones[0].packages[1].executor, 'GPT_CHAT')
  assert.equal(d.milestones[1].name, 'M2')
  assert.deepEqual(d.closure, { task: '結案', acceptance: ['ok'] })
})

test('digestPlan tolerates missing or odd data', () => {
  assert.equal(digestPlan(null), null)
  const d = digestPlan({ scope: '單一字串', risks: [{ text: '物件風險' }, 3], milestones: 'bad' })
  assert.deepEqual(d.scope, ['單一字串'])
  assert.deepEqual(d.risks, ['物件風險', '3'])
  assert.equal(d.stats.milestones, 0)
})

test('splitSections splits on H2 and ignores fenced code', () => {
  const md = '# 標題\n\n前言文字\n\n## 目標\n內容1\n\n```\n## 不是標題\n```\n\n## M1 起步\n內容2'
  const s = splitSections(md)
  assert.deepEqual(s.map(x => x.title), ['前言', '目標', 'M1 起步'])
  assert.ok(s[1].body.includes('## 不是標題'))
  assert.equal(docStats(md).sections, 2)
})

test('splitSections handles empty and heading-only documents', () => {
  assert.deepEqual(splitSections(''), [])
  assert.deepEqual(splitSections(undefined), [])
  assert.deepEqual(splitSections('## 只有標題').map(x => x.title), ['只有標題'])
})

test('capacityView warns only from 70%', () => {
  assert.equal(capacityView(null), null)
  assert.equal(capacityView({ percent: 19.4, warn: false, full: false }), null)
  assert.equal(capacityView({ percent: 72, warn: true, full: false }).tone, 'you')
  assert.equal(capacityView({ percent: 101, warn: true, full: true }).tone, 'bad')
})
