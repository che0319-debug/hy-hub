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
export function visible(items,collapsed=new Set()) {
  const children=new Map();
  for(const r of items){if(!children.has(r.parent_id))children.set(r.parent_id,[]);children.get(r.parent_id).push(r);}
  for(const a of children.values())a.sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id));
  const stack=(children.get(null)||[]).map((r,i)=>({r,depth:0,number:String(i+1)})).reverse(), out=[];
  while(stack.length){const v=stack.pop();out.push(v);if(!collapsed.has(v.r.id)){
    const cs=children.get(v.r.id)||[];for(let i=cs.length-1;i>=0;i--)stack.push({r:cs[i],depth:v.depth+1,number:v.number+'.'+(i+1)});
  }}return out;
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

export function viewConfig(mode) {
  return {day:{unit:48,days:14,step:7},week:{unit:30,days:28,step:7},month:{unit:9,days:93,step:31}}[mode] || {unit:9,days:93,step:31};
}
export function dateMarkers(events,anchor,unit,width) {
  const end=[-1,-1,-1],labels=[],lines=[];let hidden=0;
  for(const event of [...events].sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name))){
    const x=(day(event.date)-day(anchor)+.5)*unit;if(x<0||x>=width)continue;
    lines.push({...event,x});const left=Math.max(0,Math.min(width-150,x)),lane=end.findIndex(n=>n<left);
    if(lane<0){hidden++;continue;}end[lane]=left+150;labels.push({...event,x,left,lane});
  }
  return {labels,lines,hidden,height:lines.length?28*(Math.max(0,...labels.map(x=>x.lane))+1):0};
}
