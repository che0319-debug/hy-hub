export const DAY = 86400000;
export const states = {wait:'等待／追蹤中',ai:'執行中',you:'待你確認',done:'完成',bad:'逾期／失敗'};
export const types = {contract:'合約規格',major:'內部重大規格',general:'內部一般規格'};
export const day = s => Date.parse(s+'T00:00:00Z') / DAY;
export const iso = n => new Date(n*DAY).toISOString().slice(0,10);
export const shift = (s,n) => iso(day(s)+n);
export const projectColor = 'var(--hy-brand)';
// Identity is the normalized owner string: stable across projects, devices and reloads.
// Continuous hue plus a secondary lightness avoids a small palette repeating after N owners.
export function ownerColor(owner) {
  if (!owner.trim()) return 'var(--hy-dim)';
  let h=2166136261;
  for (const c of owner.trim().normalize('NFC')) h=Math.imul(h^c.codePointAt(0),16777619)>>>0;
  return `hsl(${((h*137.508)%360).toFixed(3)} 58% ${32+(Math.floor(h/360)%12)}%)`;
}
export function ordered(items,parent=null) {
  return items.filter(r=>r.parent_id===parent).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
}
export function descendants(items,id) {
  const found=new Set([id]), stack=[id], children=new Map();
  for(const r of items){if(!children.has(r.parent_id))children.set(r.parent_id,[]);children.get(r.parent_id).push(r.id);}
  while(stack.length)for(const child of children.get(stack.pop())||[])if(!found.has(child)){found.add(child);stack.push(child);}
  return found;
}
const APLUS_LINE=/^aplus-line-[1-5]$/;
// Inline checkpoints stay on the parent bar. `inline: true` is explicit; A+ milestone ids and
// anything under the five lines stay inline even after the API drops unknown keys.
export function inlineCheckpointIds(items) {
  const byId=new Map(items.map(r=>[r.id,r])), out=new Set();
  for(const r of items){
    if(r.kind!=='checkpoint')continue;
    if(r.inline===true||(typeof r.id==='string'&&r.id.startsWith('aplus-ms-'))){out.add(r.id);continue;}
    let cur=r, guard=0;
    while(cur&&guard++<10000){
      if(typeof cur.id==='string'&&APLUS_LINE.test(cur.id)){out.add(r.id);break;}
      cur=cur.parent_id?byId.get(cur.parent_id):null;
    }
  }
  return out;
}
export function isInlineCheckpoint(row,items) {
  if(!row||row.kind!=='checkpoint')return false;
  if(row.inline===true||(typeof row.id==='string'&&row.id.startsWith('aplus-ms-')))return true;
  return items?inlineCheckpointIds(items).has(row.id):false;
}
// Host is the A+ line when the checkpoint sits anywhere under that line; otherwise the parent row.
export function inlineMarksByHost(items) {
  const inline=inlineCheckpointIds(items), byId=new Map(items.map(r=>[r.id,r])), map=new Map();
  for(const id of inline){
    const row=byId.get(id);
    if(!row?.date)continue;
    let host=row.parent_id, cur=byId.get(row.parent_id), guard=0, line=null;
    while(cur&&guard++<10000){
      if(APLUS_LINE.test(cur.id)){line=cur.id;break;}
      host=cur.id;
      cur=cur.parent_id?byId.get(cur.parent_id):null;
    }
    host=line||host;
    if(!host)continue;
    if(!map.has(host))map.set(host,[]);
    map.get(host).push(row);
  }
  for(const list of map.values())list.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.order-b.order)||a.id.localeCompare(b.id));
  return map;
}
export function visible(items,collapsed=new Set()) {
  const inline=inlineCheckpointIds(items), children=new Map();
  for(const r of items){if(inline.has(r.id))continue;if(!children.has(r.parent_id))children.set(r.parent_id,[]);children.get(r.parent_id).push(r);}
  for(const a of children.values())a.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const stack=(children.get(null)||[]).map((r,i)=>({r,depth:0,number:String(i+1)})).reverse(), out=[];
  while(stack.length){const v=stack.pop();out.push(v);if(!collapsed.has(v.r.id)){
    const cs=children.get(v.r.id)||[];for(let i=cs.length-1;i>=0;i--)stack.push({r:cs[i],depth:v.depth+1,number:v.number+'.'+(i+1)});
  }}return out;
}
// Only A+ starts collapsed, together with its direct children, so the first click shows the five lines.
export function initialCollapsed(items) {
  const set=new Set();
  if(!items?.some(r=>r.id==='aplus'&&r.kind==='project'))return set;
  set.add('aplus');
  for(const r of items)if(r.parent_id==='aplus')set.add(r.id);
  return set;
}
export function nextCheckpoint(items,rootId,today) {
  if(!rootId||!today)return null;
  const ids=descendants(items,rootId);
  const upcoming=items.filter(r=>r.kind==='checkpoint'&&r.date&&r.id!==rootId&&ids.has(r.id)&&r.date>=today);
  upcoming.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.order-b.order)||a.id.localeCompare(b.id));
  return upcoming[0]||null;
}
export function formatNextNode(node) {
  if(!node?.date||!node.name)return '';
  return `下一個節點：${node.name} ${Number(node.date.slice(5,7))}/${Number(node.date.slice(8,10))}`;
}
export function nameIsDelayed(row) {
  return !!row&&row.kind!=='checkpoint'&&row.delayed===true;
}
export function barTone(row) {
  if(!row)return null;
  if(row.tone)return String(row.tone);
  if(row.id==='aplus')return 'aplus';
  const m=/^aplus-line-([1-5])$/.exec(row.id||'');
  return m?m[1]:null;
}
function monthStart(isoDate){return isoDate.slice(0,8)+'01';}
function monthEnd(isoDate){
  const y=+isoDate.slice(0,4), m=+isoDate.slice(5,7), last=new Date(Date.UTC(y,m,0)).getUTCDate();
  return `${isoDate.slice(0,7)}-${String(last).padStart(2,'0')}`;
}
export function spanRange(items,rows) {
  let min=null,max=null;
  const take=(a,b)=>{if(a&&(!min||a<min))min=a;if(b&&(!max||b>max))max=b;};
  if(!rows?.length)return null;
  const marks=inlineMarksByHost(items);
  for(const entry of rows){
    const r=entry.r||entry, [a,b]=bounds(items,r);
    take(a,b);
    if(r.kind==='checkpoint'&&r.date)take(r.date,r.date);
    for(const c of marks.get(r.id)||[])take(c.date,c.date);
  }
  if(!min||!max)return null;
  return [monthStart(min),monthEnd(max)];
}
export function viewWindow(mode,anchor,items,rows,timelinePx=0,minUnit=0) {
  if(mode==='week')return {mode,unit:30,days:28,start:day(anchor),startIso:anchor};
  if(mode!=='span')return {mode:'month',unit:9,days:93,start:day(anchor),startIso:anchor};
  const range=spanRange(items,rows);
  if(!range)return {mode,unit:9,days:93,start:day(anchor),startIso:anchor};
  const start=day(range[0]), days=Math.max(1,day(range[1])-start+1);
  const px=timelinePx>0?timelinePx:Math.max(480,days*2);
  return {mode:'span',unit:Math.max(minUnit||0,px/days),days,start,startIso:range[0],endIso:range[1]};
}
function labelWidth(label){let w=0;for(const ch of label)w+=ch.codePointAt(0)>255?11:6.5;return Math.max(18,w+4);}
// Same-day marks share one label (BT2/BT3). Diamonds stay on the date; labels may dodge.
export function layoutMarkLabels(marks,originDay,unit,width) {
  const groups=[];
  const sorted=[...marks].sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:(a.order-b.order)||a.id.localeCompare(b.id));
  for(const m of sorted){
    const g=groups.at(-1);
    if(g&&g.date===m.date)g.items.push(m);
    else groups.push({date:m.date,items:[m],x:(day(m.date)-originDay)*unit+unit/2});
  }
  const placed=[];
  for(const g of groups){
    g.label=g.items.map(i=>i.name).join('/');
    g.ids=g.items.map(i=>i.id);
    const w=labelWidth(g.label);
    const hit=(lane,center)=>{const left=center-w/2,right=center+w/2;return placed.some(p=>p.lane===lane&&left<p.right+2&&right>p.left-2);};
    let lane=0, center=g.x, found=false;
    for(const shift of [0,14,-14,28,-28,42,-42]){
      const candidate=Math.max(w/2,Math.min(Math.max(w/2,width-w/2),g.x+shift));
      for(const laneTry of [0,1])if(!hit(laneTry,candidate)){lane=laneTry;center=candidate;found=true;break;}
      if(found)break;
    }
    const left=center-w/2;
    placed.push({lane,left,right:left+w});
    g.lane=lane;g.center=center;
  }
  return groups;
}
export function bounds(items,row) {
  if(row.kind==='checkpoint')return [row.date,row.date];
  if(row.kind!=='project')return [row.start,row.end];
  let start=null,end=null;
  for(const r of items)if(r.project_id===row.id&&r.id!==row.id){const a=r.kind==='checkpoint'?r.date:r.start,b=r.kind==='checkpoint'?r.date:r.end;if(a&&(!start||a<start))start=a;if(b&&(!end||b>end))end=b;}
  return [start,end];
}
export function drag(row,mode,delta){
  const min=day('1900-01-01'),max=day('2200-12-31');
  if(row.kind==='checkpoint')return {...row,date:iso(Math.max(min,Math.min(max,day(row.date)+delta)))};
  let a=day(row.start),b=day(row.end);
  if(mode==='move'){delta=Math.max(min-a,Math.min(max-b,delta));a+=delta;b+=delta;}
  if(mode==='start')a=Math.max(min,Math.min(b,a+delta));
  if(mode==='end')b=Math.min(max,Math.max(a,b+delta));
  return {...row,start:iso(a),end:iso(b)};
}
export function moveParent(items,id,parentId){
  const row=items.find(r=>r.id===id), parent=items.find(r=>r.id===parentId), subtree=descendants(items,id);
  if(!row||row.kind==='project'||!parent||parent.kind==='checkpoint'||subtree.has(parentId))throw Error('無效階層');
  const project=parent.kind==='project'?parent.id:parent.project_id;
  return items.map(r=>subtree.has(r.id)?{...r,project_id:project,...(r.id===id?{parent_id:parentId,order:ordered(items,parentId).length?Math.max(...ordered(items,parentId).map(x=>x.order))+1:0}:{})}:r);
}
