import test from 'node:test'
import assert from 'node:assert/strict'
import { BufferGeometry } from 'three'
import { B, box } from '../src/life-island/geo.js'
import { makeShop } from '../src/life-island/chuan.js'
import { treeGeos } from '../src/life-island/props.js'
import {
  FLOOR_CAP, TYPE_REGISTRY, alertChip, composeBuilding, currentMilestone, findProjectForBuilding, floorPlan,
  hasOverdue, meshKind, milestoneGate, officeProjectPath, placeholderParts, projectAlert,
  resolveBuildingType, stageParts,
} from '../src/life-island/projectBuilding.mjs'

const TODAY = '2026-10-31'

function miles(n, { done = 0, due = '2026-12-01', depends = false } = {}) {
  return Array.from({ length: n }, (_, i) => {
    const id = 'M' + (i + 1)
    const row = {
      id,
      title: '步驟' + (i + 1),
      status: i < done ? 'done' : i === done ? 'running' : 'pending',
      due: i < done ? '2026-01-01' : due,
    }
    if (depends) {
      row.depends_on = i === 0 ? [] : ['M' + i]
      row.ready = i <= done
    }
    return row
  })
}

function project(extra = {}) {
  return {
    id: 'p-002',
    title: '川泱購物',
    stage: 'running',
    owner_bot: 'sam',
    milestones: miles(8),
    decisions: [],
    ...extra,
  }
}

test('階段對應零件：地基、半成品、完整、旗子與燈', () => {
  const assigned = stageParts('assigned', floorPlan('assigned', 3), null)
  assert.equal(assigned.scaffold, true)
  assert.equal(assigned.desaturate, true)
  assert.equal(assigned.body, false)
  assert.equal(assigned.crane, false)
  assert.equal(assigned.roof, false)
  assert.equal(assigned.fence, false)

  const running = stageParts('running', floorPlan('running', 0), null)
  assert.equal(running.half, true)
  assert.equal(running.floors, 0)
  assert.equal(running.crane, true)
  assert.equal(running.fence, true)
  assert.equal(running.roof, false)
  assert.equal(running.sign, false)
  assert.equal(running.lit, false)

  const review = stageParts('review', floorPlan('review', 3), null)
  assert.equal(review.roof, true)
  assert.equal(review.sign, true)
  assert.equal(review.flag, 'blue')
  assert.equal(review.crane, false)
  assert.equal(review.fence, false)
  assert.equal(review.lit, false)

  const done = stageParts('done', floorPlan('done', 8), null)
  assert.equal(done.flag, 'green')
  assert.equal(done.lit, true)
  assert.equal(done.crane, false)
  assert.equal(done.fence, false)
  assert.equal(done.roof, true)

  const decision = stageParts('hy_decision', floorPlan('hy_decision', 2), null)
  assert.equal(decision.alert, 'amber')
  assert.equal(decision.roof, true)
  assert.equal(decision.flag, null)

  const returned = stageParts('returned', floorPlan('returned', 0), null)
  assert.equal(returned.alert, 'red')
  assert.equal(returned.crane, true)
  assert.equal(returned.roof, false)
})

test('樓層＝已完成里程碑，超過上限就封頂；執行中 0 棟是半層', () => {
  assert.equal(FLOOR_CAP, 5)
  assert.deepEqual(floorPlan('running', 0), { floors: 0, half: true, complete: false })
  assert.deepEqual(floorPlan('running', 3), { floors: 3, half: false, complete: false })
  assert.equal(floorPlan('running', 8).floors, 5)
  assert.equal(floorPlan('running', 6).floors, 5)
  assert.deepEqual(floorPlan('assigned', 4), { floors: 0, half: false, complete: false })
  assert.equal(floorPlan('unassigned', 2).floors, 0)
  assert.equal(floorPlan('review', 3).floors, 3)
  assert.equal(floorPlan('review', 3).complete, true)
  assert.equal(floorPlan('review', 0).floors, 0)
  assert.equal(floorPlan('review', 1).floors, 1)
  assert.equal(floorPlan('done', 0).floors, 0)
  assert.equal(floorPlan('done', 1).floors, 1)
  assert.equal(floorPlan('hy_decision', 0).floors, 0)
  assert.equal(floorPlan('hy_decision', 6).floors, 5)
  assert.equal(floorPlan('done', 8).floors, 5)
  const view = composeBuilding(project({ milestones: miles(8, { done: 3 }) }), { today: TODAY })
  assert.equal(view.parts.floors, 3)
  assert.equal(view.parts.half, false)
  assert.equal(view.parts.roof, false)
  assert.equal(view.label.text, '3／8')
  assert.equal(view.label.tag, 'M4')
})

test('提醒紅優於琥珀', () => {
  const open = [{ id: 'd1', status: 'open', title: '招牌顏色' }]
  const future = miles(8)
  const late = miles(8, { due: '2020-01-15' })
  assert.equal(projectAlert({ stage: 'running', milestones: future, open: 1, today: TODAY }).level, 'amber')
  const both = projectAlert({ stage: 'running', milestones: late, open: 1, today: TODAY })
  assert.equal(both.level, 'red')
  assert.equal(both.reason, 'overdue')
  assert.equal(projectAlert({ stage: 'returned', milestones: future, open: 2, today: TODAY }).reason, 'returned')
  assert.equal(projectAlert({ stage: 'hy_decision', milestones: future, open: 0, today: TODAY }).level, 'amber')
  assert.equal(projectAlert({ stage: 'running', milestones: future, open: 0, today: TODAY }), null)
  assert.equal(alertChip(both).text, '逾期')
  assert.equal(alertChip({ level: 'red', reason: 'returned', count: 1 }).text, '被退回')
  assert.equal(alertChip({ level: 'amber', reason: 'decision', count: 2 }).text, '待你決定 2')

  const amber = composeBuilding(project({ decisions: open }), { today: TODAY })
  const red = composeBuilding(project({ milestones: late, decisions: open }), { today: TODAY })
  assert.equal(amber.parts.alert, 'amber')
  assert.equal(red.parts.alert, 'red')
  assert.notEqual(amber.signature, red.signature)
  assert.equal(red.label.chip.text, '逾期')
  assert.equal(amber.label.chip.tone, 'you')
})

test('逾期只看未完成且到期日已過', () => {
  assert.equal(hasOverdue([{ status: 'done', due: '2020-01-01' }], TODAY), false)
  assert.equal(hasOverdue([{ status: 'running', due: '2026-10-31' }], TODAY), false)
  assert.equal(hasOverdue([{ status: 'running', due: '2026-10-30' }], TODAY), true)
  assert.equal(hasOverdue([{ status: 'pending', due: '2026/10/01' }], TODAY), true)
  assert.equal(hasOverdue([{ status: 'running', due: '' }], TODAY), false)
  assert.equal(hasOverdue([{ status: 'running', due: '2020-01-01' }], ''), false)
})

test('建築類型：明寫優先，否則 Sam 用商店，未知類型退回', () => {
  assert.equal(resolveBuildingType({ building_type: 'lab', owner_bot: 'sam' }), 'lab')
  assert.equal(resolveBuildingType({ owner_bot: 'sam' }), 'shop')
  assert.equal(resolveBuildingType({ ownerBot: 'sam' }), 'shop')
  assert.equal(resolveBuildingType({ source: { building_type: 'gym', owner_bot: 'sam' } }), 'gym')
  assert.equal(resolveBuildingType({ owner_bot: 'hy' }, 'shop'), 'shop')
  assert.equal(resolveBuildingType({ building_type: 'castle', owner_bot: 'sam' }), 'shop')
  assert.equal(TYPE_REGISTRY.shop.built, true)
  assert.equal(TYPE_REGISTRY.office.built, false)
  assert.equal(TYPE_REGISTRY.factory.built, false)
  assert.equal(TYPE_REGISTRY.lab.built, false)
  assert.equal(TYPE_REGISTRY.home.built, false)
  assert.equal(TYPE_REGISTRY.gym.built, false)
  assert.equal(meshKind('lab'), 'shop')
  assert.equal(meshKind('shop'), 'shop')
  const view = composeBuilding(project(), { today: TODAY })
  assert.equal(view.type, 'shop')
  assert.equal(view.mesh, 'shop')
})

test('即時卡片：有 depends_on 才標可開工或等待', () => {
  const withDeps = project({
    milestones: miles(8, { depends: true }),
    decisions: [{ id: 'd1', status: 'open', project: 'p-002', title: '招牌要不要改成橘色' }, { id: 'd0', status: 'answered', title: '不顯示' }],
    cards: { outputs: [
      { id: 'old', type: 'output', title: '舊稿', summary: '不要當結論', createdAt: '2026-01-01' },
      { id: 'new', type: 'output', title: '招牌草案', summary: '主色用橘', createdAt: '2026-10-20' },
      { id: 'rev', type: 'review', tab: 'outputs', title: '審查摘要', summary: '有條件通過', createdAt: '2026-10-30' },
      { id: 'note', type: 'note', tab: 'outputs', title: '審查筆記', summary: '這不是成果', createdAt: '2026-10-31' },
    ] },
  })
  const card = composeBuilding(withDeps, { today: TODAY }).card
  assert.equal(card.live, true)
  assert.deepEqual(card.badges.map(item => item.text), ['執行中', '里程碑 0／8', '執行中 M1', '待你決定 1'])
  assert.equal(card.milestones.length, 8)
  assert.match(card.milestones[0].line, /M1/)
  assert.match(card.milestones[0].line, /可開工/)
  assert.match(card.milestones[1].line, /等待〔M1〕/)
  assert.equal(card.decisions.length, 1)
  assert.equal(card.decisions[0].line, '招牌要不要改成橘色')
  assert.match(card.output, /招牌草案/)
  assert.match(card.output, /主色用橘/)
  assert.doesNotMatch(card.output, /不要當結論/)
  assert.doesNotMatch(card.output, /審查摘要/)
  assert.equal(card.href, '/bot-office?project=p-002')
  assert.equal(officeProjectPath(''), '/bot-office')

  const plain = composeBuilding(project(), { today: TODAY }).card
  assert.ok(plain.milestones.every(item => item.gate == null))
  assert.ok(plain.milestones.every(item => !item.line.includes('可開工') && !item.line.includes('等待')))
  assert.equal(plain.output, '')
  const reviewOnly = composeBuilding(project({
    cards: { outputs: [{ id: 'rev', type: 'review', tab: 'outputs', title: '審查摘要', summary: '有條件通過', createdAt: '2026-10-30' }] },
  }), { today: TODAY })
  assert.equal(reviewOnly.card.output, '')
  assert.equal(milestoneGate({ id: 'M2', dependsOn: undefined, ready: undefined }, []), null)
  assert.equal(milestoneGate({ id: 'M2', dependsOn: ['M1'], ready: undefined }, [{ id: 'M1', status: 'done' }]).text, '可開工')
})

test('同一狀態簽章不變；樓層或提醒變了才變', () => {
  const a = composeBuilding(project(), { today: TODAY })
  const b = composeBuilding(project(), { today: TODAY })
  assert.equal(a.signature, b.signature)
  assert.equal(a.label.title, '川泱購物｜執行中')
  assert.equal(a.label.text, '0／8')
  assert.equal(a.label.tag, 'M1')
  assert.equal(a.label.chip, null)
  const taller = composeBuilding(project({ milestones: miles(8, { done: 3 }) }), { today: TODAY })
  assert.notEqual(a.signature, taller.signature)
  const answered = composeBuilding(project({ decisions: [{ id: 'x', status: 'answered', title: '已回' }] }), { today: TODAY })
  assert.equal(a.signature, answered.signature)
  assert.equal(placeholderParts().crane, true)
  assert.equal(placeholderParts().half, true)
})

test('自由文字的未完成里程碑仍標 M1；有執行中狀態就優先那一列', () => {
  const rows = [
    { id: 'M1', title: '選址', status: '未開始（需另行核准動工）', due: '2026-12-01' },
    { id: 'M2', title: '招牌', status: '閘門後', due: '2026-12-01' },
    { id: 'M3', title: '貨架', status: '需要你', due: '不掛日期' },
  ]
  const view = composeBuilding(project({ milestones: rows }), { today: TODAY })
  assert.equal(currentMilestone(rows).id, 'M1')
  assert.equal(view.label.tag, 'M1')
  assert.equal(view.card.badges.find(item => item.key === 'cur').text, '執行中 M1')
  assert.equal(view.parts.half, true)
  assert.equal(view.parts.floors, 0)

  const prefer = composeBuilding(project({
    milestones: [
      { id: 'M1', title: '選址', status: '未開始（需另行核准動工）' },
      { id: 'M2', title: '招牌', status: 'in_progress' },
    ],
  }), { today: TODAY })
  assert.equal(prefer.label.tag, 'M2')
  assert.equal(prefer.card.badges.find(item => item.key === 'cur').text, '執行中 M2')

  const review = composeBuilding(project({
    stage: 'review',
    milestones: [{ id: 'M1', title: '選址', status: '未開始（需另行核准動工）' }],
  }), { today: TODAY })
  assert.equal(review.label.tag, '')
  assert.equal(review.card.badges.some(item => item.key === 'cur'), false)
  assert.equal(review.parts.floors, 0)
  assert.equal(review.parts.roof, true)
  assert.equal(review.parts.flag, 'blue')
  assert.equal(review.parts.crane, false)
})

test('待審、完成、待決定 0 棟仍是一層完整樓', () => {
  const done0 = stageParts('done', floorPlan('done', 0), null)
  assert.equal(done0.floors, 0)
  assert.equal(done0.roof, true)
  assert.equal(done0.flag, 'green')
  assert.equal(done0.lit, true)
  assert.equal(done0.crane, false)
  const ask = stageParts('hy_decision', floorPlan('hy_decision', 0), null)
  assert.equal(ask.floors, 0)
  assert.equal(ask.roof, true)
  assert.equal(ask.flag, null)

  const top = parts => makeShop(parts).geo.boundingBox.max.y
  const h0 = top(stageParts('review', floorPlan('review', 0), null))
  const h1 = top(stageParts('review', floorPlan('review', 1), null))
  const h2 = top(stageParts('review', floorPlan('review', 2), null))
  assert.ok(Math.abs(h0 - h1) < 0.05, `0 完成 ${h0} 與 1 完成 ${h1} 應同為一層`)
  assert.ok(h2 > h1 + 0.3, `兩層 ${h2} 應高過一層 ${h1}`)
})

test('合併後丟掉一次性幾何，重複使用的模板與成品留著', () => {
  const disposed = new Set()
  const orig = BufferGeometry.prototype.dispose
  BufferGeometry.prototype.dispose = function () {
    disposed.add(this)
    return orig.call(this)
  }
  try {
    const tile = box(1, 0.16, 1, 0.025, 1)
    const dirt = box(0.9, 0.3, 0.9, 0.03, 1)
    const mark = box(0.2, 0.02, 0.5, 0, 1)
    const b = new B()
    b.add(tile, 0xffffff, { x: 0 })
    b.add(dirt, 0xd9ab7c)
    b.add(mark, 0xffffff)
    b.add(tile, 0xffffff, { x: 2 })
    b.add(dirt, 0xd9ab7c, { x: 2 })
    const merged = b.build()
    assert.equal(disposed.has(tile), false)
    assert.equal(disposed.has(dirt), false)
    assert.equal(disposed.has(mark), true)
    assert.equal(disposed.has(merged), false)
    assert.ok(merged.attributes.position.count > tile.attributes.position.count)
    const again = new B()
    again.add(tile, 0xffffff, { y: 1 })
    again.add(tile, 0xffffff, { y: 2 })
    const second = again.build()
    assert.equal(disposed.has(tile), false)
    assert.equal(disposed.has(second), false)
    assert.ok(second.attributes.position.count > 0)
    const trees = treeGeos()
    assert.equal(disposed.has(trees.round), false)
    assert.ok(trees.round.attributes.position.count > 0)
  } finally {
    BufferGeometry.prototype.dispose = orig
  }
})

test('用專案 id 對建築，對不到不拿標題充數', () => {
  const projects = [{ id: 'p-009', title: '川泱購物' }, { id: 'p-002', title: '別的名字' }]
  assert.equal(findProjectForBuilding({ id: 'chuan', project: 'p-002', title: '川泱購物' }, projects).id, 'p-002')
  assert.equal(findProjectForBuilding({ id: 'chuan', project: 'p-404', title: '川泱購物' }, projects), null)
  assert.equal(findProjectForBuilding({ id: 'chuan', title: '川泱購物' }, [{ id: 'p-002', title: '川泱購物中心' }]).id, 'p-002')
})

test('mapped 專案讀 source 上的里程碑與類型', () => {
  const view = composeBuilding({
    id: 'p-002',
    title: '川泱購物',
    stage: 'review',
    stageLabel: '待審',
    ownerBot: 'sam',
    source: {
      owner_bot: 'sam',
      building_type: 'shop',
      milestones: [{ id: 'M1', title: '選址', status: 'done', due: '2026-01-01' }, { id: 'M2', name: '上架', status: 'pending', due: '2026-12-01', depends_on: ['M1'], ready: true }],
    },
    decisions: [],
    cards: {},
  }, { today: TODAY })
  assert.equal(view.type, 'shop')
  assert.equal(view.stageLabel, '待審')
  assert.equal(view.parts.flag, 'blue')
  assert.equal(view.card.milestones.length, 1)
  assert.match(view.card.milestones[0].line, /上架/)
  assert.match(view.card.milestones[0].line, /可開工/)
})
