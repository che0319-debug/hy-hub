import test from 'node:test'
import assert from 'node:assert/strict'
import {agentGroups,isStalled,commandDraft,legacySnapshot} from '../src/lib/commandCenterModel.js'
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
 for(const expected of ['950157','Research Agent','research','p1','w1','讀取來源'])assert.ok(draft.includes(expected))
 const projectDraft=commandDraft({bot:'sam',project:'p2'},[],[],'review')
 assert.ok(projectDraft.includes('p2'))
})

test('fallback uses actual legacy work and never fabricates execution events',()=>{
 const core={workItems:[{id:'old',owner:'950157',status:'running',updatedAt:'2026-09-14T00:00:00Z'}]}
 const before=JSON.stringify(core),view=legacySnapshot(core,[])
 assert.equal(view.work[0].agent,null);assert.equal(view.work[0].current_activity,undefined)
 assert.deepEqual(view.events,[]);assert.equal(JSON.stringify(core),before)
})
