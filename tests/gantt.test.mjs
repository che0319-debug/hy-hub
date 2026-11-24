import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownerColor,projectColor,visible,bounds,drag,moveParent,descendants,initialCollapsed,nextCheckpoint,formatNextNode,nameIsDelayed,spanRange,viewWindow,inlineMarksByHost,layoutMarkLabels,day,spanTickLabel,extendTaskParents,diffOps,historyCanUndo} from '../public/gantt-model.mjs';
import {buildAplusItems,mergeGantt} from '../scripts/merge-aplus-gantt.mjs';
const p={id:'p',kind:'project',parent_id:null,project_id:'p',order:0};
const t={id:'t',kind:'task',parent_id:'p',project_id:'p',order:0,owner:'HY',start:'2026-10-10',end:'2026-10-20'};
const c={id:'c',kind:'checkpoint',parent_id:'t',project_id:'p',order:0,date:'2026-10-25'};
test('one grid supports projects, arbitrary nesting, collapse, order and moving subtrees',()=>{
 const p2={...p,id:'p2',project_id:'p2',order:1},items=[p,t,c,p2];
 assert.equal(visible(items).length,4);assert.equal(visible(items,new Set(['t'])).length,3);
 const moved=moveParent(items,'t','p2');assert.equal(moved[1].parent_id,'p2');assert.equal(moved[2].project_id,'p2');assert.equal(descendants(items,'t').size,2);
 assert.throws(()=>moveParent(items,'t','c'));assert.throws(()=>moveParent(items,'t','t'));
 const deep=[p];for(let i=0;i<1100;i++)deep.push({...t,id:'d'+i,parent_id:i?'d'+(i-1):'p'});
 assert.equal(visible(deep).at(-1).depth,1100);assert.equal(visible(deep,new Set(['d500'])).length,502);
});
test('colors stay stable across projects and reloads; all projects one color',async()=>{
 const again=await import('../public/gantt-model.mjs?reload');assert.equal(ownerColor('HY'),again.ownerColor('HY'));
 assert.notEqual(ownerColor('HY'),ownerColor('Sam'));assert.equal(projectColor,'var(--hy-brand)');
 const css=readFileSync(new URL('../public/gantt-950157.css',import.meta.url),'utf8');assert.match(css,/--g-contract:var\(--hy-done\)/);assert.match(css,/--g-major:var\(--hy-bad\)/);assert.match(css,/--g-general:#000/);
});
test('project bounds include all descendants and checkpoints',()=>{
 assert.deepEqual(bounds([p,t,c],p),['2026-10-10','2026-10-25']);assert.deepEqual(bounds([p],p),[null,null]);
 assert.deepEqual(bounds([p,{...t,start:'2026-09-10'},c],p),['2026-09-10','2026-10-25']);
});
test('drag move, resize and checkpoint dates clamp safely',()=>{
 assert.equal(drag(t,'move',3).start,'2026-10-13');assert.equal(drag(t,'move',3).end,'2026-10-23');
 assert.equal(drag(t,'start',30).start,t.end);assert.equal(drag(t,'end',-30).end,t.start);
 assert.equal(drag(c,'move',-7).date,'2026-10-18');assert.equal(drag(c,'move',999999).date,'2200-12-31');
});
test('existing tabs remain and gantt never calls progress storage',()=>{
 const html=readFileSync(new URL('../public/950157-dashboard.html',import.meta.url),'utf8');for(const tab of ['progress','weekly','radar','gantt'])assert.match(html,new RegExp('id="tab-'+tab+'"'));
 assert.match(html,/data-tab="radar"/);
 assert.match(html,/技術雷達/);
 assert.match(html,/\?tab=research|tab === 'research'|want === 'research'/);
 assert.match(html,/get\('tab'\) !== 'gantt'/);
 const js=readFileSync(new URL('../public/gantt-950157.mjs',import.meta.url),'utf8');assert.doesNotMatch(js,/\/api\/950157-progress/);assert.match(js,/\/api\/950157-gantt/);
 assert.match(js,/method:'PATCH'/);
 assert.doesNotMatch(js,/name="started"|name="delayed"/);
});

test('schedule has five metadata columns and no status editor',()=>{
 const js=readFileSync(new URL('../public/gantt-950157.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(js,/data-key="status"|name="status"|g-cell">狀態/);
});

const aplus=JSON.parse(readFileSync(new URL('../docs/quality/gantt/aplus-items.json',import.meta.url),'utf8'));
const milestoneDates={
 '技資1':'2027-03-31','技資2':'2027-06-30','技資3':'2027-09-30','技資4':'2027-11-30',
 'C2.9':'2027-03-31','C2.10':'2027-09-30','C2.11':'2028-03-31',
 'C3.4':'2026-12-31','C3.6':'2027-06-30','C3.8':'2027-09-30','C3.9':'2028-06-30','C3.10':'2028-09-30',
 'BT1':'2026-12-14','BT2':'2027-01-25','BT3':'2027-01-25','BT4':'2028-03-27','BT5':'2028-09-25',
 'V0.5':'2027-02-08','V1':'2027-03-29','V1.3':'2027-06-28','V2':'2027-09-27','V3':'2028-03-27','V4':'2028-09-25',
};
test('A+ stays one row until opened, then five lines, and week tasks stay under a line',()=>{
 const collapsed=initialCollapsed(aplus);
 assert.deepEqual(visible(aplus,collapsed).map(v=>v.r.id),['aplus']);
 assert.equal(initialCollapsed([p,t,c]).size,0);
 const layer1=new Set(collapsed);layer1.delete('aplus');
 const lines=visible(aplus,layer1);
 assert.deepEqual(lines.map(v=>v.r.id),['aplus','aplus-line-1','aplus-line-2','aplus-line-3','aplus-line-4','aplus-line-5']);
 assert.ok(lines.every(v=>v.r.kind!=='checkpoint'));
 const layer2=new Set(layer1);layer2.delete('aplus-line-4');
 const opened=visible(aplus,layer2);
 assert.ok(opened.some(v=>v.r.name==='開發板取得'&&v.r.owner==='Tiffany'&&v.r.start==='2026-11-16'));
 assert.ok(opened.some(v=>v.r.parent_id==='aplus-line-4'));
 assert.equal(opened.filter(v=>v.r.kind==='checkpoint').length,0);
 const leaves=aplus.filter(r=>r.kind==='task'&&r.id.startsWith('aplus-r')&&!aplus.some(c=>c.parent_id===r.id));
 assert.equal(leaves.length,69);
 assert.ok(!aplus.some(r=>r.name==='123'||r.name?.includes('123')));
});
test('next checkpoint, milestone dates, delay name and full-span window',()=>{
 assert.equal(nextCheckpoint(aplus,'aplus','2026-11-17').name,'BT1');
 assert.equal(formatNextNode(nextCheckpoint(aplus,'aplus','2026-11-17')),'下一個節點：BT1 12/14');
 assert.equal(nextCheckpoint(aplus,'aplus','2026-12-14').id,'aplus-ms-bt1');
 assert.equal(nextCheckpoint(aplus,'aplus','2026-12-15').id,'aplus-ms-c3-4');
 assert.equal(nextCheckpoint(aplus,'aplus','2027-01-25').id,'aplus-ms-bt2');
 assert.equal(nextCheckpoint(aplus,'aplus','2029-01-01'),null);
 assert.equal(formatNextNode(null),'');
 const byName=Object.fromEntries(aplus.filter(r=>r.kind==='checkpoint').map(r=>[r.name,r.date]));
 assert.deepEqual(byName,milestoneDates);
 assert.equal(aplus.filter(r=>r.kind==='checkpoint'&&r.inline===true).length,23);
 assert.equal(nameIsDelayed({kind:'task',end:'2026-11-01',delayed:false},'2026-11-23'),true);
 assert.equal(nameIsDelayed({kind:'task',end:'2026-11-23'},'2026-11-23'),false);
 assert.equal(nameIsDelayed({kind:'task',end:'2026-11-24',delayed:true},'2026-11-23'),false);
 assert.equal(nameIsDelayed({kind:'checkpoint',date:'2026-11-01'},'2026-11-23'),true);
 assert.equal(nameIsDelayed({kind:'checkpoint',date:'2026-11-23'},'2026-11-23'),false);
 assert.equal(nameIsDelayed(p,'2026-11-23',[p,{...t,end:'2026-11-01'}]),true);
 assert.equal(nameIsDelayed(p,'2026-11-23',[p,{...t,end:'2026-12-01'}]),false);
 assert.equal(aplus.find(r=>r.id==='aplus').delayed,false);
 assert.equal(aplus.find(r=>r.id==='aplus-line-5').start,'2026-11-09');
 assert.equal(aplus.find(r=>r.id==='aplus-line-5').end,'2028-09-25');
 const closed=visible(aplus,initialCollapsed(aplus));
 assert.deepEqual(spanRange(aplus,closed),['2026-10-01','2028-09-30']);
 const month=viewWindow('month','2026-11-01',aplus,closed,400);
 assert.equal(month.unit,9);assert.equal(month.days,93);
 const week=viewWindow('week','2026-11-01',aplus,closed,400);
 assert.equal(week.unit,30);assert.equal(week.days,28);
 const stripped=aplus.map(({inline,...row})=>row);
 const open=initialCollapsed(stripped);open.delete('aplus');
 assert.equal(visible(stripped,open).length,6);
 assert.equal(inlineMarksByHost(stripped).get('aplus-line-4').map(r=>r.name).join(','),'BT1,BT2,BT3,BT4,BT5');
 const laid=layoutMarkLabels(inlineMarksByHost(stripped).get('aplus-line-4').filter(r=>r.date==='2027-01-25'),day('2026-10-01'),2,2000);
 assert.equal(laid.length,1);assert.equal(laid[0].label,'BT2/BT3');assert.equal(laid[0].items.length,2);
});
test('merge appends A+ once and replaces only that tree',()=>{
 const oldProject={id:'p',kind:'project',parent_id:null,project_id:'p',order:0,name:'舊專案',owner:'',start:null,end:null,status:'wait',checkpoint_type:null,date:null,started:true};
 const oldTask={id:'t',kind:'task',parent_id:'p',project_id:'p',order:0,name:'舊工作',owner:'HY',start:'2026-11-01',end:'2026-11-05',status:'wait',checkpoint_type:null,date:null};
 const merged=mergeGantt({revision:'rev1',items:[oldProject,oldTask]},aplus);
 assert.equal(merged.revision,'rev1');
 assert.equal(merged.items.find(r=>r.id==='p').name,'舊專案');
 assert.equal(merged.items.find(r=>r.id==='t').owner,'HY');
 assert.equal(merged.items.find(r=>r.id==='aplus').order,1);
 assert.ok(merged.items.every(r=>!('inline' in r)&&!('tone' in r)));
 assert.equal(merged.items.filter(r=>r.id==='aplus'||r.project_id==='aplus').length,aplus.length);
 const renamed=aplus.map(r=>r.id==='aplus'?{...r,name:'A+ 改名'}:r);
 const again=mergeGantt(merged,renamed);
 assert.equal(again.items.find(r=>r.id==='aplus').name,'A+ 改名');
 assert.equal(again.items.find(r=>r.id==='aplus').order,1);
 assert.equal(again.items.filter(r=>r.project_id==='p').length,2);
 assert.equal(again.items.filter(r=>r.id==='aplus'||String(r.id).startsWith('aplus-')).length,aplus.length);
 const script=readFileSync(new URL('../scripts/merge-aplus-gantt.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(script,/onrender|fetch\(|XMLHttpRequest|process\.env/);
});
test('builder skips the noise row and marks line checkpoints inline',()=>{
 const built=buildAplusItems({project:{id:'aplus',name:'A+'},lines:[{id:'aplus-line-1',name:'1 技資報告',start:'2026-12-07',end:'2027-11-30',milestones:[{id:'aplus-ms-tech-1',name:'技資1',date:'2027-03-31'}],tasks:[{excel_row:833,name:'123',owner:'',start:'2026-12-07',end:'2026-12-13'},{excel_row:6,name:'簡報規劃',owner:'Tiffany',start:'2026-12-07',end:'2027-01-03',children:[]}]}]});
 assert.ok(built.find(r=>r.id==='aplus-ms-tech-1').inline);
 assert.ok(!built.some(r=>r.name==='123'));
 assert.equal(built.find(r=>r.id==='aplus-r6').owner,'Tiffany');
});

test('span tick uses 2027/01 instead of 27/1',()=>{
 assert.equal(spanTickLabel(2027,1,40),'2027/01');
 assert.equal(spanTickLabel(2027,1,20),'2027/01');
 assert.equal(spanTickLabel(2027,1,60),'2027-01');
 assert.equal(spanTickLabel(2027,2,40),'2月');
 assert.equal(spanTickLabel(2027,2,20),'2');
 const js=readFileSync(new URL('../public/gantt-950157.mjs',import.meta.url),'utf8');
 assert.match(js,/spanTickLabel/);
 assert.doesNotMatch(js,/String\(y\)\.slice\(2\)/);
});
test('task parent end extends to the latest child and project dates stay computed',()=>{
 const parent={id:'t',kind:'task',parent_id:'p',project_id:'p',order:0,start:'2026-10-10',end:'2026-10-20'};
 const child={id:'s',kind:'task',parent_id:'t',project_id:'p',order:0,start:'2026-10-12',end:'2026-11-30'};
 const items=[p,parent,child];
 const out=extendTaskParents(items,'s');
 assert.equal(out.find(r=>r.id==='t').end,'2026-11-30');
 assert.equal(out.find(r=>r.id==='p').start,undefined);
});
test('diff ops describe add, update, complete delete and undo availability',()=>{
 const before=[p,t,c];
 const after=[{...p,name:'改名'},{...t,end:'2026-11-01'}];
 const ops=diffOps(before,after,{c:'complete'});
 assert.ok(ops.some(op=>op.op==='complete'&&op.id==='c'));
 assert.ok(ops.some(op=>op.op==='update'&&op.id==='p'&&op.fields.name==='改名'));
 assert.ok(ops.some(op=>op.op==='update'&&op.id==='t'&&op.fields.end==='2026-11-01'));
 const added=diffOps([p],[p,{...t}]);
 assert.ok(added.some(op=>op.op==='add'&&op.item.id==='t'));
 assert.equal(historyCanUndo([]),false);
 assert.equal(historyCanUndo([{undoable:false},{undoable:true}]),true);
 assert.equal(historyCanUndo([{undoable:true},{undoable:false}]),false);
});
