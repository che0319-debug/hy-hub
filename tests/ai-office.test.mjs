import test from 'node:test'
import assert from 'node:assert/strict'
import { OFFICE_TABS,progress,milestones,journal,safeUrl,driveFile } from '../src/lib/aiOffice.mjs'

test('five approved pages, progress is a package count and excludes report bookkeeping',()=>{
 assert.deepEqual(OFFICE_TABS.map(x=>x[1]),['專案概況','PI 會議室','執行計畫','成果與審查','工作日誌'])
 assert.deepEqual(progress({packages:[{type:'TASK',status:'COMPLETED'},{type:'TASK',status:'WAITING'},{type:'PROJECT_REPORT',status:'COMPLETED'}]}),{done:1,total:2})
 assert.deepEqual(progress({packages:[]}),{done:0,total:0})
})
test('variable milestone count and canonical package mapping without invented cycles',()=>{
 const project={plan:{milestones:[{id:'M1',name:'One'}]},packages:[{id:'p1',milestone_id:'M1'},{id:'parked',milestone_id:'PARKED:M1'}]}
 assert.equal(milestones(project).length,1);assert.equal(milestones(project)[0].packages[0].id,'p1')
 assert.deepEqual(milestones({packages:[]}),[])
})
test('journal preserves original action actors and resolution timestamps',()=>{
 const events=journal({packages:[],actions:[{action_id:'a',created_at:1,resolved_at:4,requested_by:'PI',resolved_by:'delegate',title:'Decision',answer:'Approved',package_id:'w'}],files:[{file_id:'f',created_at:3,filename:'Report',source:'GPT_CHAT'}],notes:[],suggestions:[]})
 assert.equal(events[0].actor,'delegate');assert.equal(events[0].at,4);assert.equal(events[2].actor,'PI')
 assert.equal(events[0].action,'a');assert.equal(events[1].file,'f')
})
test('untrusted links cannot execute script or use ambiguous Drive IDs',()=>{
 assert.equal(safeUrl('javascript:alert(1)'),null);assert.equal(safeUrl('data:text/html,x'),null)
 assert.equal(driveFile('../x'),null);assert.equal(driveFile('canonical_file'),'https://drive.google.com/file/d/canonical_file/view')
})
