import test from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVITY, DIMENSIONS, BUILDING_DIMENSIONS, activityOf, dimensionView, dimensionForBuilding, validateGoals, safeEvidenceUrl } from '../src/life-goals/model.mjs'
import { createGoalsStore } from '../src/life-goals/store.mjs'
import { makeVault, makeLakeside } from '../src/life-island/goalBuildings.js'
import { ALL_BUILDINGS, BUILDING_BLOCK } from '../src/life-island/data.js'
const now=Date.parse('2026-11-08T13:00:00Z')
const fixture=()=>({dimensions:Object.keys(DIMENSIONS).map((id,i)=>({id,name:id,progress:i,layer:['engine','engine','base','base','base','sustain','sustain'][i],totalGoal:'synthetic draft',unknown:'keep'}))})

test('七維到七棟唯一對應，保留原資料與未評分舊分',()=>{
 const f=fixture();validateGoals(f)
 assert.equal(new Set(Object.values(BUILDING_DIMENSIONS)).size,7)
 for(const d of f.dimensions){
  const v=dimensionView(d,now),building=DIMENSIONS[d.id].building
  assert.equal(v.score,null);assert.equal(v.progress,d.progress);assert.equal(v.unknown,'keep')
  assert.equal(v.vision.confirmedByUser,false)
  assert.equal(dimensionForBuilding(f,building,now).id,d.id)
  assert.ok(ALL_BUILDINGS.some(b=>b.id===building))
 }
})
test('燈號與後端台北日邊界一致，日期未知不顯示紅燈',()=>{
 for(const [days,expected] of [[0,'green'],[7,'green'],[8,'yellow'],[21,'yellow'],[22,'red']]) assert.equal(activityOf(new Date(now-days*86400000).toISOString(),now),expected)
 for(const at of [null,undefined,'',123,'invalid','2026-11-10T01:00:00Z'])assert.equal(activityOf(at,now),'unknown')
 assert.equal(activityOf('2026-11-01',now),'green')
 assert.equal(ACTIVITY.yellow.tone,'you')
})
test('首評零分與未評分不同，未知層不被重新分類',()=>{
 const d=fixture().dimensions[0];d.progress=0;d.initializedAt='2026-11-01T00:00:00Z';d.layer='original-layer'
 const v=dimensionView(d,now);assert.equal(v.score,0);assert.equal(v.scoreText,'0 / 100');assert.equal(v.layer,'original-layer')
})
test('首評與評分紀錄只取最近三筆，來源狀態獨立',()=>{
 const d=fixture().dimensions[0];d.history=[{id:'i',kind:'initial'},...Array.from({length:5},(_,i)=>({id:String(i),kind:'action',delta:1}))];d.evidenceStatus='source_down'
 const v=dimensionView(d,now);assert.equal(v.recent.length,3);assert.deepEqual(v.recent.map(h=>h.id),['4','3','2']);assert.equal(v.evidenceStatus,'source_down');assert.equal(v.score,0)
})
test('七維缺失或重複拒絕，危險來源網址不成為連結',()=>{
 const d=fixture();d.dimensions.pop();assert.throws(()=>validateGoals(d))
 const f=fixture();f.dimensions.push(f.dimensions[0]);assert.throws(()=>validateGoals(f))
 assert.equal(safeEvidenceUrl('javascript:alert(1)'),null);assert.equal(safeEvidenceUrl('source:ref'),null);assert.equal(safeEvidenceUrl('https://example.com/evidence'),'https://example.com/evidence')
})
test('錯誤資料類型與未知分層明確拒絕，不靜默遺漏一維',()=>{
 assert.throws(()=>validateGoals({dimensions:{}}),/七維資料不完整/)
 const d=fixture();d.dimensions[0].layer='unknown';assert.throws(()=>validateGoals(d),/七維分層資料待核對/)
 const badHistory={...fixture().dimensions[0],history:[null,{},'bad']};assert.equal(dimensionView(badHistory,now).score,null)
})
test('共同讀取合併同時呼叫，沒有額外輪詢，失敗保留上次資料',async()=>{
 let count=0,fail=false
 const store=createGoalsStore(async()=>{count++;if(fail)throw Error('synthetic outage');return fixture()})
 await Promise.all([store.ensure(),store.ensure(),store.refresh()]);assert.equal(count,1)
 assert.equal(store.getSnapshot().status,'loaded')
 const previous=store.getSnapshot().document;fail=true;await store.refresh()
 assert.equal(store.getSnapshot().status,'failed');assert.equal(store.getSnapshot().document,previous)
 await store.ensure();assert.equal(count,2)
})
test('儲存後強制重讀不採用已開始的舊讀取',async()=>{
 let release,count=0
 const store=createGoalsStore(()=>{count++;return count===1?new Promise(r=>{release=r}):{revision:2}})
 const first=store.refresh();await Promise.resolve()
 const afterWrite=store.refresh({force:true});release({revision:1});await Promise.all([first,afterWrite])
 assert.equal(store.getSnapshot().document.revision,2);assert.equal(count,2)
})
test('新建築只占 3×3 格，沒有非有限座標或獨立動態效果',()=>{
 const vertices={}
 for(const [name,make] of [['vault',makeVault],['lakeside',makeLakeside]]){
  const model=make(),b=model.geo.boundingBox
  assert.ok(b.min.x>=-1.5&&b.max.x<=1.5&&b.min.z>=-1.5&&b.max.z<=1.5)
  assert.ok([...model.geo.attributes.position.array].every(Number.isFinite))
  assert.deepEqual(model.smoke,[]);vertices[name]=model.geo.attributes.position.count;model.geo.dispose()
 }
 console.log('p003 synthetic geometry vertices',vertices)
 assert.notDeepEqual(BUILDING_BLOCK.vault,BUILDING_BLOCK.sidehq)
 assert.notDeepEqual(BUILDING_BLOCK.lakeside,BUILDING_BLOCK.brain)
})
