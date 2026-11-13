import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { advanceFollowUpLabel, loadBotOffice, mapOffice, OFFICE_TABS, projectStageBody, projectStageFailureMessage, projectStageRequestId, safeDriveUrl, setProjectStage } from '../src/botOfficeData.js'
import { canReturnToPlanning } from '../src/lib/officeFlow.mjs'

const state = { updated: '2026-10-24T00:00:00Z', islands: [{ id: 'central', name: '中央' }], buildings: [
  { id: 'a', title: '專案 A', island: 'central', stage: 'running', executor: 'gpt', last_review: 'pass' },
  { id: 'b', title: '專案 B', island: 'central', stage: 'hy_decision', executor: 'grok-build' },
], decisions: [{ id: 'd1', status: 'open', ref: 'b', title: '待決定' }, { id: 'd2', status: 'answered', ref: 'a', title: '已回答' }] }
const index = { updated: state.updated, cards: ['meeting', 'execution', 'output', 'log', 'decision'].map(type => ({ id: type, project: 'a', type, title: type, summary: '摘要', drive_url: 'https://drive.google.com/file/d/demo/view' })) }

test('mapping uses the v0 project field, five tabs, and only open decisions', () => {
  const out = mapOffice(state, index)
  assert.equal(out.projects[0].id, 'b')
  assert.deepEqual(out.decisions.map(d => d.id), ['d1'])
  const a = out.projects.find(p => p.id === 'a')
  for (const [tab] of OFFICE_TABS) assert.equal(a.cards[tab].length, 1)
  assert.equal(a.island, '中央')
  assert.equal(a.executor, 'gpt')
  assert.equal(out.projects.find(p => p.id === 'b').cards.overview.length, 0)
  assert.equal('last_review' in a, false)
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
  assert.equal(result.updatedAt, '2026-10-24T12:00:00+08:00')
  assert.equal(result.updatedRaw, state.updated)
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


test('bare project without plan, milestones or owner maps as a normal card', () => {
  const out = mapOffice({
    updated: state.updated,
    buildings: [{ id: 'p-bare', title: '週六記帳時段', stage: 'assigned', revision: 0, milestones: [] }],
    decisions: [{ id: 'd-bare', project: 'p-bare', status: 'open', title: '這週六要不要一起整理？', questions: [{ no: 1, q: '這週六要不要一起整理？' }] }],
  }, { cards: [] })
  const project = out.projects[0]
  assert.equal(project.id, 'p-bare')
  assert.equal(project.title, '週六記帳時段')
  assert.equal(project.ownerBot, '')
  assert.equal(project.planCard, null)
  assert.equal(project.planUrl, null)
  assert.equal(project.decisions.length, 1)
  assert.equal(project.decisions[0].id, 'd-bare')
  assert.equal(out.totals.needsYou, 1)
  assert.equal(out.totals.all, 1)
  assert.equal(out.items.length, 0)
  const panels = readFileSync(new URL('../src/components/BotOfficePanels.jsx', import.meta.url), 'utf8')
  assert.match(panels, /milestones\.length\?`\$\{done\}／\$\{milestones\.length\} 個里程碑完成`:'尚未提供'/)
  assert.match(panels, /<Empty>里程碑尚未提供<\/Empty>/)
  const page = readFileSync(new URL('../src/pages/BotOffice.jsx', import.meta.url), 'utf8')
  assert.match(page, /progressEmpty="里程碑尚未提供"/)
  assert.match(page, /shownMilestones\.length \? `\$\{headerCount\.done\}／\$\{shownMilestones\.length\}` : '尚未提供'/)
  assert.doesNotMatch(page, /小案標籤/)
})

test('mapOffice keeps optional kanban_source and reads old closed light cards without making projects', () => {
  const out = mapOffice({
    ...state,
    buildings: [
      { id: 'p-002', title: '川泱購物', island: 'central', stage: 'running', owner_bot: 'sam',
        kanban_source: { bot: '950157', project_id: 'APB', project_name: 'A+ BP' } },
    ],
    decisions: [
      { id: 'd-open', project: 'p-002', status: 'open', title: '核示' },
      { id: 'd-d0ff25fe499944e186710542df91766d', project: null, status: 'closed', light: true, title: '舊小案', owner_bot: 'hy' },
      { id: 'd-open-item', project: null, status: 'open', light: true, title: '未掛專案的舊卡', owner_bot: 'hy' },
    ],
  }, { cards: [] })
  assert.deepEqual(out.projects.map(p => p.id), ['p-002'])
  assert.deepEqual(out.projects[0].kanbanSource, { bot: '950157', project_id: 'APB', project_name: 'A+ BP' })
  assert.equal(out.projects[0].ownerBot, 'sam')
  assert.equal(out.decisions.map(d => d.id).join(), 'd-open,d-open-item')
  assert.equal(out.totals.needsYou, 1)
  assert.equal(out.projects[0].decisions.length, 1)
  assert.equal(out.items.find(i => i.id === 'd-open-item').light, true)
  assert.equal(out.items.some(i => i.id === 'd-d0ff25fe499944e186710542df91766d'), false)
})

test('decisions accept project, card and legacy ref with project > card > ref priority', () => {
  const decisions = [
    { id: 'project', project: 'b' }, { id: 'card', card: 'meeting' },
    { id: 'ref-project', ref: 'b' }, { id: 'ref-card', ref: 'log' },
    { id: 'project-wins', project: 'b', card: 'meeting', ref: 'a' },
    { id: 'card-wins', card: 'meeting', ref: 'b' },
    { id: 'project-missing', project: 'unknown', card: 'meeting', ref: 'b' },
    { id: 'card-missing', card: 'unknown', ref: 'b' },
    { id: 'unresolved', project: 'unknown', card: 'unknown', ref: 'unknown' },
  ].map(d => ({ ...d, status: 'open' }))
  const result = mapOffice({ ...state, decisions }, index)
  assert.deepEqual(result.decisions.map(d => d.projectId), ['b', 'a', 'b', 'a', 'b', 'a', 'a', 'b', null])
  assert.deepEqual(result.projects.find(p => p.id === 'a').decisions.map(d => d.id), ['card', 'ref-card', 'card-wins', 'project-missing'])
})

test('missing index keeps state projects and direct decisions visible with empty cards', async () => {
  const result = await loadBotOffice({ fetcher: async url => url.endsWith('state')
    ? new Response(JSON.stringify({ ...state, decisions: [{ id: 'open', project: 'b', status: 'open' }] }), { headers: { 'X-Brain-Stale': '1' } })
    : new Response('{"error":"brain_data_not_ready"}', { status: 404 }) })
  assert.equal(result.projects.length, 2)
  assert.equal(result.projects[0].id, 'b')
  assert.equal(result.projects[0].decisions.length, 1)
  assert.ok(result.projects.every(p => OFFICE_TABS.every(([tab]) => p.cards[tab].length === 0)))
  assert.equal(result.stale, true)
  assert.equal(result.indexUpdated, '尚未提供')
})

test('missing state remains empty even when the index exists', async () => {
  await assert.rejects(loadBotOffice({ fetcher: async url => url.endsWith('state')
    ? new Response('{"error":"brain_data_not_ready"}', { status: 404 })
    : new Response(JSON.stringify(index)) }), e => e.kind === 'empty')
})

test('index errors other than not-ready stay errors', async () => {
  for (const status of [401, 404, 502]) {
    await assert.rejects(loadBotOffice({ fetcher: async url => url.endsWith('state')
      ? new Response(JSON.stringify(state)) : new Response('{"error":"different_error"}', { status }) }),
    e => e.kind === (status === 401 ? 'auth' : 'error'))
  }
})

test('v1 question mapping keeps attribution distinct from verified answer source', () => {
  const out = mapOffice({ ...state, decisions: [{ id: 'v1', project: 'a', status: 'open', kind: 'intake', revision: 3,
    questions: [{ no: 1, q: '內部流程？', why: '先對齊', options: ['A', 'B'], recommend: 'A', answer: 'A', answered_by: 'hy',
      answer_source: 'proxy', basis: '既有紀錄', confidence: 'high', confirmed_by: 'hy' }], future: 'ignored' }] }, index)
  assert.equal(out.decisions[0].revision, 3)
  assert.equal(out.decisions[0].questions[0].answerSource, 'proxy')
  assert.equal(out.decisions[0].questions[0].answeredBy, 'hy')
  assert.equal(out.decisions[0].questions[0].confirmed, true)
  assert.equal('future' in out.decisions[0], false)
})


test('P1 tabs, review activity, intake waiting, figures, review links and answered history', () => {
  const out = mapOffice({updated:state.updated, buildings:[{id:'p',owner_bot:'sam',stage:'assigned',last_review:'fail',returned_count:2,review_card:'review',required_changes:['補證據']}],
    figures:[{id:'pi',owner:'sam',project:'p',island:'side',look_as:'PI',status:'waiting'}],
    decisions:[{id:'open',project:'p',kind:'intake',status:'open'}, {id:'closed',project:'p',status:'answered',revision:17,card:'decision',questions:[{no:1,q:'主力？',answer:'已確認',answered_by:'sam',answer_source:'proxy',confirmed_by:'hy',confirmed_at:'now',bot_suggestions:[{answer:'參考',answered_by:'sam',basis:'紀錄',confidence:'high'}]}],history:[{actor:'hy',action:'confirm'}]}]},
    {cards:[{id:'review',project:'p',type:'review',drive_url:'https://drive.google.com/report'}, {id:'decision',project:'p',type:'decision',summary:'過期摘要'}]})
  assert.deepEqual(OFFICE_TABS.map(t=>t[1]),['報告','會議室','日誌'])
  // 階段標籤只顯示 5 種名稱：有 intake 待答也仍是「規劃中」，待答題目另外顯示「N 項待你處理」。
  assert.equal(out.projects[0].stageLabel,'規劃中'); assert.equal(out.projects[0].pending,true)
  assert.equal(out.projects[0].review.verdict,'fail'); assert.equal(out.projects[0].review.returnedCount,2)
  assert.deepEqual(out.projects[0].review.requiredChanges,['補證據']);assert.equal(out.projects[0].review.url,'https://drive.google.com/report')
  assert.equal(out.projects[0].figures[0].lookAs,'PI');assert.equal(out.allDecisions[1].revision,17)
  assert.equal(out.allDecisions[1].questions[0].suggestions[0].answer,'參考')
  assert.match(out.projects[0].cards.overview.find(c=>c.id==='decision').summary,/已確認/)
  assert.doesNotMatch(out.projects[0].cards.overview.find(c=>c.id==='decision').summary,/過期/)
  const review=mapOffice({buildings:[{id:'r',stage:'review'}]})
  assert.equal(review.totals.running,1)
})


test('team is derived from explicit project roles, includes reviewer and deduplicates task figures', () => {
  const out=mapOffice({buildings:[{id:'p',owner_bot:'sam',executor:'grok-build',reviewer:'claude'}],figures:[
    {id:'claude',name:'Claude',role:'reviewer'}, {id:'sam',name:'Sam',role:'owner'},
    {id:'pi-p',name:'工程 PI',role:'pi',project:'p',owner:'sam',island:'ignored',look_as:'sam'},
    {id:'pi-p',name:'工程 PI',role:'pi',project:'p'},
    ...[1,2,3].map(i=>({id:'gb-'+i,name:'Grok Build',role:'executor',project:'p',look_as:'grok-build'})),
    {id:'pi-other',name:'別案 PI',role:'pi',project:'other'},
  ]})
  assert.deepEqual(out.projects[0].team.map(m=>[m.role,m.name]),[['負責 Bot','Sam'],['PI','工程 PI'],['執行者','Grok Build'],['審查者','Claude']])
  assert.ok(out.projects[0].team.every(m=>!('island' in m)))
  assert.equal(mapOffice({buildings:[{id:'none'}],figures:[{id:'claude',role:'reviewer'}]}).projects[0].team.length,0)
})

test('review note cards follow explicit review_card links and output plans are available in execution', () => {
  const out=mapOffice({buildings:[{id:'p',plan_card:'plan',review_card:'review'}],decisions:[{id:'d',project:'p',card:'intake',status:'answered',questions:[{no:1,q:'問題',answer:'新答案'}]}]},
    {cards:[{id:'plan',project:'p',type:'output',review_card:'review',drive_url:'https://drive.google.com/file/d/plan/view'},
      {id:'review',project:'p',type:'note',summary:'獨立審查'}, {id:'intake',project:'p',type:'note',summary:'舊摘要'}, {id:'chat',project:'p',type:'note',summary:'討論'}]})
  const p=out.projects[0]
  assert.equal(p.planCard.id,'plan')
  assert.equal(p.cards.outputs.find(c=>c.id==='review').isReview,true)
  assert.deepEqual(p.cards.meeting.map(c=>c.id),['chat'])
  assert.match(p.cards.overview[0].summary,/新答案/)
})


test('follow-ups and advancement markers are displayed without changing stage; review time uses Drive metadata only', () => {
 const out=mapOffice({buildings:[{id:'p',stage:'hy_decision',follow_ups:[{id:'f',text:'先補資料',status:'open',source:'r'}],review_card:'r'}],decisions:[
   {id:'d',project:'p',status:'answered',needs_advance:true,advance:{stage:'done',decision_revision:17}},
   {id:'run',project:'p',status:'answered',needs_advance:true,advance:{stage:'running'}},
 ]},
   {cards:[{id:'r',project:'p',type:'note',title:'review_20261024-2215',created_at:'2026-10-24T22:15:00+08:00',drive_created_at:'2026-10-24T13:15:42.509Z',drive_url:'https://drive.google.com/file/d/r/view'}]})
 const p=out.projects[0]
 assert.equal(p.stage,'hy_decision');assert.equal(p.finished,false)
 assert.equal(p.pendingAdvances[0].advance.stage,'done')
 assert.equal(p.pendingAdvances[1].advance.stage,'running')
 assert.equal(advanceFollowUpLabel(p.pendingAdvances[0].advance.stage),'已核准（舊規則，待推進）。')
 assert.equal(advanceFollowUpLabel(p.pendingAdvances[1].advance.stage),'已核准規劃，待推進為執行中。')
 assert.equal(advanceFollowUpLabel('assigned'),'已退回規劃，待推進回規劃中。')
 assert.equal(advanceFollowUpLabel('returned'),'已退回規劃，待推進回規劃中。')
 assert.equal(advanceFollowUpLabel(undefined),'決策已作答，待推進。')
 assert.doesNotMatch(advanceFollowUpLabel('done'),/待推進完成/)
 assert.equal(p.followUps[0].sourceUrl,'https://drive.google.com/file/d/r/view')
 assert.match(p.cards.outputs[0].date,/21:15:42/);assert.doesNotMatch(p.cards.outputs[0].date,/22:15/)
 assert.equal(mapOffice({buildings:[{id:'p',review_card:'r'}]},{cards:[{id:'r',project:'p',type:'note',created_at:'2026-10-24T22:15:00+08:00'}]}).projects[0].cards.outputs[0].date,'Drive 建立時間待補')
})

test('project stage body uses owner_bot, defaults revision to 0, and posts without a write token', async () => {
  const done = projectStageBody({ owner_bot: 'sam' }, { stage: 'done', closure_summary: '全部里程碑已結束。' }, projectStageRequestId('p', 1710000000000))
  assert.deepEqual(done, {
    request_id: 'hy-stage-p-1710000000000',
    answered_by: 'sam',
    expected_revision: 0,
    patch: { stage: 'done', closure_summary: '全部里程碑已結束。' },
  })
  const reopen = projectStageBody({ ownerBot: 'family', revision: 4 }, { stage: 'running' }, 'hy-stage-q-2')
  assert.equal(reopen.answered_by, 'family')
  assert.equal(reopen.expected_revision, 4)
  assert.deepEqual(reopen.patch, { stage: 'running' })
  assert.equal('closure_summary' in reopen.patch, false)
  assert.equal(projectStageBody({ owner_bot: 'hy', revision: -1 }, { stage: 'running' }, 'id').expected_revision, 0)
  assert.equal(projectStageBody({ revision: 1.5 }, { stage: 'running' }, 'id').expected_revision, 0)
  assert.equal(projectStageBody({}, { stage: 'running' }, 'id').answered_by, '')

  let call
  await setProjectStage('p/006', done, {
    base: 'https://api.example/',
    headers: { Authorization: 'Bearer test-session' },
    fetcher: async (...args) => {
      call = args
      return new Response(JSON.stringify({ project: { id: 'p/006', stage: 'done', revision: 1 } }))
    },
  })
  assert.equal(call[0], 'https://api.example/api/office/owner/projects/p%2F006/status')
  assert.equal(call[1].method, 'POST')
  assert.equal(call[1].cache, 'no-store')
  assert.equal(call[1].headers.Authorization, 'Bearer test-session')
  assert.equal(call[1].headers['Content-Type'], 'application/json')
  assert.equal(call[1].headers['X-Brain-Write-Token'], undefined)
  assert.deepEqual(JSON.parse(call[1].body), done)
})

test('project stage error codes map to Chinese messages', async () => {
  const cases = [
    [400, { error: 'office_closure_summary_required' }, '結案摘要不符合規定，沒有設為完成。', 'error'],
    [409, { error: 'office_revision_conflict' }, '資料已被更新，請重新讀取。沒有改階段。', 'conflict'],
    [403, { error: 'office_stage_owner_only' }, '只有 HY 本人可以改專案階段。沒有寫入。', 'error'],
    [400, { error: 'office_stage_transition_denied' }, '這個階段不能這樣改。沒有寫入。', 'error'],
    [401, { error: 'unauthorized' }, '登入已過期，請重新登入。', 'auth'],
  ]
  const payload = projectStageBody({ owner_bot: 'sam', revision: 0 }, { stage: 'running' }, 'hy-stage-p-1')
  for (const [status, body, message, kind] of cases) {
    assert.equal(projectStageFailureMessage(status, body), message)
    await assert.rejects(
      setProjectStage('p', payload, { fetcher: async () => new Response(JSON.stringify(body), { status }) }),
      error => error.message === message && error.kind === kind && error.code === body.error,
    )
  }
  assert.equal(projectStageFailureMessage(0, {}), '無法連線，請稍後重試。請重新讀取確認階段。')
  assert.equal(projectStageFailureMessage(400, { error: 'office_stage_transition_denied' }, 'return'), '這個階段不能退回規劃中。沒有寫入。')
  assert.equal(projectStageFailureMessage(409, { error: 'office_revision_conflict' }, 'return'), '資料已被更新，請重新讀取。沒有改階段。')
  await assert.rejects(
    setProjectStage('p', payload, { fetcher: async () => { throw new Error('offline') } }),
    error => error.kind === 'network' && /無法連線/.test(error.message),
  )
})

test('Bot Office wires stage labels and the HY-only control', () => {
  const page = readFileSync(new URL('../src/pages/BotOffice.jsx', import.meta.url), 'utf8')
  const control = readFileSync(new URL('../src/components/OfficeStageControl.jsx', import.meta.url), 'utf8')
  // 決策後續搬到會議室第一區（唯讀）。
  const panels = readFileSync(new URL('../src/components/BotOfficePanels.jsx', import.meta.url), 'utf8')
  assert.match(panels, /advanceFollowUpLabel\(d\.advance\?\.stage\)/)
  assert.doesNotMatch(panels, /待推進完成/)
  assert.doesNotMatch(page, /待推進完成/)
  assert.match(page, /\{hy && <OfficeStageControl /)
  assert.match(page, /allMilestones=\{view\._flow\?\.milestones \|\| milestoneRows\}/)
  assert.match(control, /先交 GPT 結案審查，再由 HY 核准結案。/)
  assert.match(control, /重新開啟（改回執行中）/)
  assert.match(control, /退回規劃中/)
  assert.match(control, /退回後這個專案會回到規劃中，負責 Bot 要重送規劃書，經審查後才會開核准卡給你。/)
  assert.match(control, /確認退回/)
  assert.match(control, /closure_request: true, closure_summary: closure/)
  assert.match(control, /stage: 'running'/)
  assert.match(control, /stage: 'assigned'/)
  assert.match(control, /authHeaders\(\)/)
  assert.doesNotMatch(control, /X-Brain-Write-Token|localStorage|sessionStorage|window\.confirm/)
  assert.equal(control.includes('returned'), false)
  assert.doesNotMatch(page, /等 HY 回答|activeTileLabel/)
  assert.match(page, /<Pill project=\{project\}\/>/)
})

test('canReturnToPlanning is only for hy_decision with no plan review and no later milestones', () => {
  const decision = { id: 'p-003', stage: 'hy_decision' }
  assert.equal(canReturnToPlanning(decision, []), true)
  assert.equal(canReturnToPlanning(decision, undefined), true)
  assert.equal(canReturnToPlanning(decision, [{ id: 'M0', kind: 'plan', step: 'running' }]), true)
  assert.equal(canReturnToPlanning(decision, [{ id: 'm0', step: 'waiting' }]), true)
  assert.equal(canReturnToPlanning(decision, [{ id: 'M0', step: 'done' }]), true)
  assert.equal(canReturnToPlanning(decision, [{ kind: 'plan', step: 'cancelled' }]), true)
  assert.equal(canReturnToPlanning(decision, [{ id: 'M0', step: 'review' }]), false)
  assert.equal(canReturnToPlanning(decision, [{ id: 'M0', kind: 'plan', step: 'hy_decision' }]), false)
  assert.equal(canReturnToPlanning(decision, [{ id: 'plan', kind: 'plan', step: 'review' }]), false)
  assert.equal(canReturnToPlanning(decision, [{ id: 'M0', step: 'running' }, { id: 'note', kind: 'plan', step: 'hy_decision' }]), false)
  assert.equal(canReturnToPlanning(decision, [{ id: 'M1', step: 'waiting' }]), false)
  assert.equal(canReturnToPlanning(decision, [{ id: 'G1', kind: 'gate', step: 'running' }]), false)
  assert.equal(canReturnToPlanning(decision, [{ id: 'M0', step: 'running' }, { id: 'M1', step: 'done' }]), false)
  assert.equal(canReturnToPlanning(decision, [null, 'M1', { id: 'M2', step: 'waiting' }]), false)
  assert.equal(canReturnToPlanning({ stage: 'running' }, []), false)
  assert.equal(canReturnToPlanning({ stage: 'assigned' }, []), false)
  assert.equal(canReturnToPlanning({ stage: 'review' }, [{ id: 'M0', step: 'running' }]), false)
  assert.equal(canReturnToPlanning({ stage: 'done' }, []), false)
  assert.equal(canReturnToPlanning(null, []), false)
})

test('project stage body for return to planning sends assigned and no closure summary', () => {
  const back = projectStageBody({ owner_bot: 'sam', revision: 2 }, { stage: 'assigned' }, projectStageRequestId('p-003', 1710000000000))
  assert.deepEqual(back, {
    request_id: 'hy-stage-p-003-1710000000000',
    answered_by: 'sam',
    expected_revision: 2,
    patch: { stage: 'assigned' },
  })
  assert.equal('closure_summary' in back.patch, false)
})

test('five project stages: labels, tones, legacy normalization at read time', async () => {
  const { PROJECT_STAGES, normalizeStage } = await import('../src/lib/projectStages.mjs')
  assert.deepEqual(PROJECT_STAGES.map(s => [s.key, s.label, s.tone]), [
    ['assigned','規劃中','wait'], ['hy_decision','待你決定','you'], ['running','執行中','ai'], ['review','待審','ai'], ['done','完成','done']])
  assert.equal(normalizeStage('returned', 'sam'), 'assigned')
  assert.equal(normalizeStage('returned', ''), 'assigned')
  assert.equal(normalizeStage('unassigned', 'sam'), 'assigned')
  assert.equal(normalizeStage('unassigned', ''), '')
  assert.equal(normalizeStage('weird', 'sam'), '')
  const out = mapOffice({updated:state.updated, buildings:[
    {id:'r',owner_bot:'sam',stage:'returned',returned_count:3},
    {id:'u',owner_bot:'sam',stage:'unassigned'},
    {id:'n',stage:'unassigned'}]}, {cards:[]})
  assert.deepEqual(out.projects.map(p => [p.id, p.stage, p.stageLabel]), [['r','assigned','規劃中'],['u','assigned','規劃中'],['n','','狀態待確認']])
  assert.equal(out.projects[0].finished, false)
})

test('HY Hub home summary uses the five stage names from mapOffice totals', () => {
  const out = mapOffice({updated:state.updated, buildings:[
    {id:'a',owner_bot:'sam',stage:'assigned'},{id:'r',owner_bot:'sam',stage:'returned'},{id:'d',owner_bot:'sam',stage:'hy_decision'},
    {id:'x',owner_bot:'sam',stage:'running'},{id:'v',owner_bot:'sam',stage:'review'},{id:'f',owner_bot:'sam',stage:'done'}]}, {cards:[]})
  assert.deepEqual(out.totals.stages, {assigned:2, hy_decision:1, running:1, review:1, done:1})
  assert.equal(out.totals.all, 6)
  const summary = readFileSync(new URL('../src/components/OfficeHomeSummary.jsx', import.meta.url), 'utf8')
  assert.match(summary, /PROJECT_STAGES\.map/)
  assert.match(summary, /'專案總數'/)
  assert.doesNotMatch(summary, /進行中|已完成|全部專案/)
})

test('Bot Office home uses only the five stage names; no returned-count badge anywhere', () => {
  const home = readFileSync(new URL('../src/pages/OfficeHome.jsx', import.meta.url), 'utf8')
  assert.match(home, /\['all','全部'\],\.\.\.PROJECT_STAGES/)
  assert.match(home, /shownStage\(p\)/)
  assert.match(home, /負責 Bot/)
  assert.match(home, /aria-label="屬性"/)
  assert.match(home, /pendingLabel\(open\)/)
  assert.doesNotMatch(home, /進行中|已完成|小案/)
  const page = readFileSync(new URL('../src/pages/BotOffice.jsx', import.meta.url), 'utf8')
  assert.match(page, /displayLabel/)
  assert.match(page, /displayTone/)
  assert.match(page, /項待你處理/)
  assert.match(page, /onOpenMeeting/)
  assert.doesNotMatch(page, /OfficeInbox|office-inbox/)
  const control = readFileSync(new URL('../src/components/OfficeStageControl.jsx', import.meta.url), 'utf8')
  assert.match(control, /project\?\.stage/)
  assert.doesNotMatch(control, /displayStage/)
  for (const file of ['../src/components/BotOfficePanels.jsx','../src/components/OfficeActions.jsx','../src/components/BotRosterCards.jsx','../src/life-island/worldData.js','../src/life-island/projectBuilding.mjs']) {
    const src = readFileSync(new URL(file, import.meta.url), 'utf8')
    assert.doesNotMatch(src, /被退回|退回次數|退回 \{|returnedCount/, file)
  }
})

test('closure approval cards say 結案 and 退回; other flow approvals keep 核准 and 退回（附意見）', () => {
  const src = readFileSync(new URL('../src/components/OfficeDecisions.jsx', import.meta.url), 'utf8')
  const start = src.indexOf("!item.questions.length && item.kind === 'approval'")
  const end = src.indexOf('item.history', start)
  assert.ok(start > 0 && end > start)
  const toolbar = src.slice(start, end)
  // 結案卡主按鈕是「結案」，action 仍是 approve；退回仍在沒有意見時停用。
  assert.match(toolbar, /onClick=\{\(\) => submit\('approve'\)\}>\{item\.flow\?\.kind === 'closure' \? '結案' : '核准'\}/)
  assert.match(toolbar, /disabled=\{disabled \|\| !feedback\.trim\(\)\} onClick=\{\(\) => submit\('return'\)\}>\{item\.flow\?\.kind === 'closure' \? '退回' : '退回（附意見）'\}/)
  assert.match(toolbar, />退回修改</)
  assert.doesNotMatch(toolbar, /submit\('approve'\)\}>核准</)
  assert.doesNotMatch(toolbar, /submit\('approve'\)\}>結案</)
  assert.doesNotMatch(toolbar, /submit\('return'\)\}>退回</)
  assert.doesNotMatch(toolbar, /submit\('return'\)\}>退回（附意見）</)
})
