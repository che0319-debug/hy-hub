import test from 'node:test';import assert from 'node:assert/strict';
import {defaultDoc,taipeiYears,deptTimeline,bpCell,bpTotal,pendingCards,applyOpsLocal,validateProgram} from '../public/koffice-model.mjs';
const p={id:'test',dept:'K100',name:'測試資料',start_year:2026,end_year:2028,next_name:'下一期測試',next_start_year:2030,next_end_year:2032,note:''};
test('台北跨年',()=>assert.equal(taipeiYears(new Date('2026-12-31T16:30:00Z')).thisYear,2027));
test('時間軸現期／斷層／下一期／未知',()=>{const a=deptTimeline([p],'K100');assert.equal(a[0].kind,'current');assert.equal(a[3].kind,'gap');assert.equal(a[4].kind,'next');assert.equal(deptTimeline([],'K200')[0].kind,'unknown');});
test('空值與合計',()=>{assert.equal(bpCell(null),'??');assert.equal(bpTotal([1,null]),'??');assert.equal(bpTotal([1,2]),'3');});
test('待決卡過濾',()=>assert.deepEqual(pendingCards({decisions:[{id:'x',status:'open',owner_bot:'950157',title:'測試',project:'p'},{id:'y',status:'answered',owner_bot:'950157'}]}).map(x=>x.id),['x']));
test('ops 本地套用',()=>{assert.equal(validateProgram(p),true);let d=applyOpsLocal(defaultDoc(),[{op:'upsert_program',program:p},{op:'set_bp',year:'2026',dept:'K100',field:'received',value:0}]);assert.equal(d.programs.length,1);assert.equal(d.bp.years['2026'].K100.received,0);assert.equal(applyOpsLocal(d,[{op:'delete_program',id:'test'}]).programs.length,0);});

test('最後一期結束後到 2036 沒接上算斷層',()=>{const a=deptTimeline([p],'K100');assert.equal(a[7].kind,'gap');assert.equal(a[10].kind,'gap');assert.equal(deptTimeline([{...p,start_year:2028}],'K100')[0].kind,'unknown');});
