import test from 'node:test'
import assert from 'node:assert/strict'
import { loadBotOffice, mapOffice, OFFICE_TABS, REFRESH_MS, safeDriveUrl } from '../src/botOfficeData.js'

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
  assert.deepEqual(OFFICE_TABS.map(t=>t[1]),['概況','會議室','執行計畫','成果與審查','工作日誌'])
  assert.equal(out.projects[0].stageLabel,'等 HY 回答')
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
 const out=mapOffice({buildings:[{id:'p',stage:'hy_decision',follow_ups:[{id:'f',text:'先補資料',status:'open',source:'r'}],review_card:'r'}],decisions:[{id:'d',project:'p',status:'answered',needs_advance:true,advance:{stage:'done',decision_revision:17}}]},
   {cards:[{id:'r',project:'p',type:'note',title:'review_20261024-2215',created_at:'2026-10-24T22:15:00+08:00',drive_created_at:'2026-10-24T13:15:42.509Z',drive_url:'https://drive.google.com/file/d/r/view'}]})
 const p=out.projects[0]
 assert.equal(p.stage,'hy_decision');assert.equal(p.finished,false);assert.equal(p.pendingAdvances[0].advance.stage,'done')
 assert.equal(p.followUps[0].sourceUrl,'https://drive.google.com/file/d/r/view')
 assert.match(p.cards.outputs[0].date,/21:15:42/);assert.doesNotMatch(p.cards.outputs[0].date,/22:15/)
 assert.equal(mapOffice({buildings:[{id:'p',review_card:'r'}]},{cards:[{id:'r',project:'p',type:'note',created_at:'2026-10-24T22:15:00+08:00'}]}).projects[0].cards.outputs[0].date,'Drive 建立時間待補')
})
