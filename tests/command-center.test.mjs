import test from 'node:test'
import assert from 'node:assert/strict'
import {agentGroups,isStalled,commandDraft,commandMode,legacySnapshot} from '../src/lib/commandCenterModel.js'
test('one Bot supports four agents and multiple works per agent',()=>{
 const work=Array.from({length:4},(_,i)=>({bot:'950157',agent:`a${i}`,work:`w${i}`}));work.push({...work[0],work:'w4'})
 assert.equal(agentGroups(work).length,4);assert.equal(agentGroups(work)[0].work.length,2)
 assert.equal(agentGroups([{work:'old',run_id:'run1'}])[0].assigned,false)
})
test('stale detection does not fabricate backend status',()=>{
 const w={status:'running',updated_at:'2026-09-14T00:00:00Z'}
 assert.equal(isStalled(w,Date.parse('2026-09-16T00:00:00Z')),true)
 assert.equal(w.status,'running');assert.equal(isStalled({...w,status:'succeeded'}),false)
 assert.equal(isStalled({...w,updated_at:null}),false)
})
test('context handoff retains selected Bot Agent Project and Work IDs',()=>{
 const selection={bot:'950157',agent:'research',agent_name:'Research Agent',work:'w1'}
 const work=[{work:'w1',project:'p1',project_name:'Project One',title:'Work One'}]
 const draft=commandDraft(selection,[{id:'950157',name:'950157'}],work,'讀取來源')
 for(const expected of ['dispatch_bot_command','confirmed=true','claim','complete','950157','Research Agent','research','p1','w1','讀取來源'])assert.ok(draft.includes(expected))
 const projectDraft=commandDraft({bot:'sam',project:'p2'},[],[],'review')
 assert.ok(projectDraft.includes('p2'))
})

test('command bar selects a safe canonical write path for each work state',()=>{
 const waiting={work:'wait',status:'waiting',lifecycle_status:'needs_clarification'}
 const review={work:'review',status:'review',lifecycle_status:'succeeded'}
 const running={work:'run',status:'running',lifecycle_status:'running'}
 assert.equal(commandMode({bot:'hy'},[]).kind,'create')
 assert.equal(commandMode({bot:'hy',work:'wait'},[waiting]).kind,'clarification')
 assert.equal(commandMode({bot:'hy',work:'review'},[review]).kind,'feedback')
 assert.equal(commandMode({bot:'hy',work:'run'},[running]).kind,'blocked')
})

test('fallback uses actual legacy work and never fabricates execution events',()=>{
 const core={workItems:[{id:'old',owner:'950157',status:'running',updatedAt:'2026-09-14T00:00:00Z'}]}
 const before=JSON.stringify(core),view=legacySnapshot(core,[])
 assert.equal(view.work[0].agent,null);assert.equal(view.work[0].current_activity,undefined)
 assert.deepEqual(view.events,[]);assert.equal(JSON.stringify(core),before)
})

import {officeMotion} from '../src/lib/officeMotion.js'
test('busy motion requires live, fresh, explicit execution telemetry',()=>{
 const now=Date.parse('2026-09-17T08:00:00Z')
 const w={status:'reading',updated_at:'2026-09-17T07:59:00Z',current_activity:'讀取來源',telemetry_available:true}
 assert.equal(officeMotion([w],'live',now).mode,'reading')
 for(const connection of ['connecting','disconnected','snapshot','stale','paused'])assert.equal(officeMotion([w],connection,now).moving,false)
 assert.equal(officeMotion([{...w,updated_at:'2026-09-14T00:00:00Z'}],'live',now).mode,'stalled')
 assert.equal(officeMotion([{...w,updated_at:null}],'live',now).moving,false)
 assert.equal(officeMotion([{...w,telemetry_available:false}],'live',now).moving,false)
 assert.equal(officeMotion([{...w,current_activity:null}],'live',now).moving,false)
 for(const status of ['waiting','review','failed','queued'])assert.equal(officeMotion([{...w,status}],'live',now).moving,false)
 assert.equal(officeMotion([],'live',now).mode,'idle')
})
test('one idle or waiting work cannot hide another agents fresh activity',()=>{
 const now=Date.parse('2026-09-17T08:00:00Z')
 const work=[{status:'review'},{status:'analyzing',updated_at:'2026-09-17T07:59:00Z',current_activity:'比較來源',telemetry_available:true}]
 assert.equal(officeMotion(work,'live',now).mode,'analyzing')
})

import {HOMES,officeRoute,canTravel,routeLength,pointOnRoute} from '../src/lib/officeRoutes.js'
test('all four offices connect through walkways around the central planter',()=>{
 for(const from of Object.keys(HOMES))for(const to of Object.keys(HOMES)){
  const route=officeRoute(from,to);assert.deepEqual(route[0],HOMES[from]);assert.deepEqual(route.at(-1),HOMES[to]);assert.deepEqual(pointOnRoute(route,routeLength(route)),HOMES[to])
  for(let d=0;d<routeLength(route);d+=5){const [x,y]=pointOnRoute(route,d);assert.equal(x>530&&x<620&&y>320&&y<425,false)}
 }
})
test('travel pauses for disconnected, queued and busy work without changing work',()=>{
 const work=[{status:'running'}],before=JSON.stringify(work)
 assert.equal(canTravel(work,'live'),false);assert.equal(JSON.stringify(work),before)
 assert.equal(canTravel([],'disconnected'),false);assert.equal(canTravel([{status:'queued'}],'live'),false)
 assert.equal(canTravel([{status:'review'}],'live'),true);assert.equal(canTravel([],'live'),true)
})

import {collectHandoffs} from '../src/lib/handoffEvents.js'
test('handoff movement skips baseline, replays, stale and superseded owners',()=>{
 const now=Date.parse('2026-09-17T12:00:00Z'),work=[{work:'w',bot:'sam'}]
 const event={id:'e',sequence:8,eventType:'execution',occurredAt:'2026-09-17T11:59:55Z',data:{work:'w',handoff:{from_bot:'950157',to_bot:'sam',reason:'owner_changed'}}}
 assert.equal(collectHandoffs([event],null,work,now).moves.length,0)
 assert.equal(collectHandoffs([event],7,work,now).moves.length,1)
 assert.equal(collectHandoffs([event],8,work,now).moves.length,0)
 assert.equal(collectHandoffs([event],7,[{work:'w',bot:'hy'}],now).moves.length,0)
 assert.equal(collectHandoffs([event],7,work,now+180000).moves.length,0)
 assert.equal(collectHandoffs([{...event,data:{work:'w',status:'review'}}],7,work,now).moves.length,0)
})

import {workspaceStatus} from '../src/workspaceStatus.js'
test('Workspace and home status use canonical Project after reload', () => {
 const project={workspaceStatus:'confirmation',latestWork:{status:'queued'},planAnalysis:{status:'running'},statusChangedAt:'2026-09-24T02:00:00Z'}
 assert.equal(workspaceStatus(project).key,'confirmation')
 assert.equal(workspaceStatus(structuredClone(project)).meta[0],'等待確認')
 assert.equal(workspaceStatus({...project,workspaceStatus:'completed',latestWork:{status:'queued'}}).key,'completed')
})
