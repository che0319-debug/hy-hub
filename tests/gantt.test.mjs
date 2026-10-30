import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownerColor,projectColor,visible,bounds,drag,moveParent,descendants} from '../public/gantt-model.mjs';
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
 const html=readFileSync(new URL('../public/950157-dashboard.html',import.meta.url),'utf8');for(const tab of ['progress','weekly','research','gantt'])assert.match(html,new RegExp('id="tab-'+tab+'"'));
 const js=readFileSync(new URL('../public/gantt-950157.mjs',import.meta.url),'utf8');assert.doesNotMatch(js,/\/api\/950157-progress/);assert.match(js,/\/api\/950157-gantt/);
});

test('schedule has five metadata columns and no status editor',()=>{
 const js=readFileSync(new URL('../public/gantt-950157.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(js,/data-key="status"|name="status"|g-cell">狀態/);
});
