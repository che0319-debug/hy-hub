import {day,iso,types,ownerColor,projectColor,ordered,descendants,visible,bounds,drag,moveParent,initialCollapsed,nextCheckpoint,formatNextNode,nameIsDelayed,barTone,viewWindow,inlineMarksByHost,layoutMarkLabels,inlineCheckpointIds,spanTickLabel,extendTaskParents,diffOps,historyCanUndo} from './gantt-model.mjs';
const root=document.querySelector('#gantt');
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=window.API+'/api/950157-gantt';
const taipeiToday=()=>{const forced=window.GANTT_TODAY;return typeof forced==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(forced)?forced:new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});};
const saveDelay=()=>typeof window.GANTT_SAVE_MS==='number'?window.GANTT_SAVE_MS:600;
let doc=null,savedDoc=null,dirty=false,busy=false,selected=null,collapsed=new Set(),mode='month',anchor=taipeiToday(),loaded=false,editing=null,view={mode:'month',unit:9,days:93,start:day(anchor)};
let pendingReasons={},saveTimer=null,localBefore=null;
const today=anchor;
root.innerHTML=`<div class="g-toolbar"><div class="g-actions"><button class="hy-btn is-primary" data-action="project">新增主專案</button><button class="hy-btn" data-action="task">新增子工作</button><button class="hy-btn" data-action="sibling">新增同層</button><button class="hy-btn" data-action="checkpoint">新增查核點</button><button class="hy-btn" data-action="edit">編輯／階層</button><button class="hy-btn" data-action="up" aria-label="工作上移">↑</button><button class="hy-btn" data-action="down" aria-label="工作下移">↓</button><button class="hy-btn is-danger" data-action="delete">刪除</button></div><div class="g-actions"><button class="hy-btn" data-action="undo">復原上一步</button><button class="hy-btn" data-action="load">重新讀取</button><button class="hy-btn is-primary" data-action="save">儲存甘特圖</button><button class="hy-btn" data-action="export">匯出變更</button></div></div>
<div class="g-toolbar"><div class="g-actions"><button class="hy-btn" data-action="prev" aria-label="上一期">‹</button><label>時間起點 <input type="date" id="g-anchor" min="1900-01-01" max="2200-12-31" value="${anchor}"></label><button class="hy-btn" data-action="next" aria-label="下一期">›</button><button class="hy-btn" data-action="today">今天</button><label>檢視 <select id="g-mode"><option value="month">月</option><option value="week">週</option><option value="span">全期</option></select></label><button class="hy-btn" data-action="end">跳到期末</button><button class="hy-btn" data-action="expand">全部展開</button><button class="hy-btn" data-action="collapse">全部收合</button><span class="g-range" id="g-range"></span></div><span class="g-note">選取後可新增子層或同層；時間條中央平移、兩端調日期，◆ 可拖曳。改完會自動儲存。勾完成或刪除會永久移除該列，可復原上一步。全期可看到起訖年份並跳到期末。</span></div>
<div class="g-message" role="status" aria-live="polite">開啟分頁後載入甘特圖。</div><div class="g-history" aria-live="polite"></div><div class="g-legend"></div><div class="g-scroll" tabindex="0" aria-label="多專案甘特圖，可水平及垂直捲動"><div class="g-grid"></div></div>
<dialog class="g-dialog"><form class="g-form"><h2></h2><label>名稱<input name="name" required maxlength="200"></label><label>主要負責人<input name="owner" maxlength="100" list="g-owners"></label><label data-field="parent">所屬階層<select name="parent"></select></label><label data-field="start">開始日<input name="start" type="date" min="1900-01-01" max="2200-12-31"></label><label data-field="end">結束日<input name="end" type="date" min="1900-01-01" max="2200-12-31"></label><label data-field="date">查核日期<input name="date" type="date" min="1900-01-01" max="2200-12-31"></label><label data-field="type">查核點類型<select name="checkpoint_type">${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><div class="g-form-error" role="alert"></div><footer><button type="button" class="hy-btn" data-action="cancel">取消</button><button class="hy-btn is-primary" type="submit">套用變更</button></footer></form></dialog><datalist id="g-owners"></datalist>`;
const grid=root.querySelector('.g-grid'),message=root.querySelector('.g-message'),dialog=root.querySelector('dialog'),form=dialog.querySelector('form');
const toneName={aplus:'A+',1:'技資',2:'體感',3:'系統',4:'藍芽',5:'展品'};
function say(text,isError=false){message.textContent=text;message.dataset.error=isError?'true':'false';}
function canUndo(){return !!(localBefore||historyCanUndo(doc?.history));}
function controls(){
  const row=doc?.items.find(r=>r.id===selected);
  root.querySelectorAll('[data-action]').forEach(b=>{
    const a=b.dataset.action;
    b.disabled=busy||(!loaded&&!['load',...(doc?['export']:[])].includes(a))||(['edit','up','down','delete','task','checkpoint','sibling'].includes(a)&&!row)||(['task','checkpoint'].includes(a)&&row?.kind==='checkpoint')||(a==='sibling'&&row?.kind==='project')||(a==='save'&&!dirty)||(a==='undo'&&!canUndo());
  });
  root.querySelector('#g-anchor').disabled=busy;root.querySelector('#g-mode').disabled=busy;
  grid.querySelectorAll('input,select,button').forEach(el=>el.disabled=busy);
}
function remember(){if(doc)localBefore=structuredClone(doc.items);}
function changed(){dirty=true;say('變更將自動儲存。');scheduleSave();controls();}
function scheduleSave(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{save();},saveDelay());
}
function measureLeft(){
  const scroll=root.querySelector('.g-scroll'),probe=document.createElement('div');
  probe.className='g-row';probe.style.visibility='hidden';probe.innerHTML='<div class="g-cell g-number"></div><div class="g-cell g-name"></div><div class="g-cell g-owner g-col-meta"></div><div class="g-cell g-start g-col-meta"></div><div class="g-cell g-end g-col-meta"></div>';
  grid.append(probe);const left=probe.lastElementChild.offsetLeft;probe.remove();return left||scroll.clientWidth;
}
function todayMark(withLabel){
  const x=(day(today)-view.start)*view.unit;
  if(x<0||x>view.unit*view.days)return '';
  return `<span class="g-today" style="left:${x}px">${withLabel?`<span class="g-today-label">今天 ${today.slice(5).replace('-','/')}</span>`:''}</span>`;
}
function tickHtml(){
  if(view.mode==='span'){
    let html='', t=view.start, end=view.start+view.days, guard=0;
    while(t<end&&guard++<400){
      const d=iso(t), y=+d.slice(0,4), m=+d.slice(5,7);
      const ny=m===12?y+1:y, nm=m===12?1:m+1, next=day(`${ny}-${String(nm).padStart(2,'0')}-01`);
      const x=(t-view.start)*view.unit, w=(Math.min(next,end)-t)*view.unit;
      const label=spanTickLabel(y,m,w);
      html+=`<span class="g-tick" style="left:${x}px">${label}</span>`;
      if(next<=t)break;t=next;
    }
    return html;
  }
  let ticks='';
  for(let i=0;i<view.days;i++){const d=iso(view.start+i);if(i===0||(view.mode==='month'?d.slice(8)==='01':i%7===0))ticks+=`<span class="g-tick" style="left:${i*view.unit}px">${view.mode==='month'?d.slice(0,7):d.slice(5)+' 週'}</span>`;if(view.mode==='week'||i%7===0)ticks+=`<span class="g-tick g-date" style="left:${i*view.unit}px">${view.mode==='month'?d.slice(5):d.slice(8)}</span>`;}
  return ticks;
}
function renderHistory(){
  const box=root.querySelector('.g-history');
  const hist=doc?.history||[];
  if(!hist.length){box.innerHTML='';return;}
  const recent=hist.slice(-5).reverse();
  box.innerHTML='<div class="g-history-title">最近修改</div>'+recent.map(h=>`<div class="g-history-row">${e(h.at||'')}　${e(h.actor||'已登入使用者')}　${e(h.summary||h.action||'')}</div>`).join('');
}
function deleteMessage(row,ids,kind){
  const n=ids.size;
  const extra=n>1?`連同 ${n-1} 筆子列，共 ${n} 筆。`:'';
  const head=kind==='complete'
    ?`這列會從甘特永久刪除，不會進封存，月報之後也查不到。${extra}\n確定把「${row.name}」標為完成並刪除？`
    :`刪除「${row.name}」${n>1?`及其子項，共 ${n} 筆`:''}？這列會從甘特永久刪除，不會進封存，月報之後也查不到。`;
  return head;
}
function removeRows(row,reason){
  const ids=descendants(doc.items,row.id);
  for(const id of ids)pendingReasons[id]=reason;
  doc.items=doc.items.filter(r=>!ids.has(r.id));
  if(selected&&ids.has(selected))selected=null;
}
function render(){
  const scroll=root.querySelector('.g-scroll'),sx=scroll.scrollLeft,sy=scroll.scrollTop;
  const rows=doc?.items||[], shown=visible(rows,collapsed);
  const mobile=window.matchMedia('(max-width:640px)').matches;
  const left=measureLeft(), timelinePx=scroll.clientWidth>left+80?scroll.clientWidth-left-2:0;
  view=viewWindow(mode,anchor,rows,shown,timelinePx,mode==='span'&&mobile?0.85:0);
  const width=view.unit*view.days;
  grid.style.setProperty('--g-width',width+'px');grid.style.setProperty('--g-unit',view.unit+'px');
  grid.classList.toggle('is-span',view.mode==='span');
  const range=root.querySelector('#g-range');
  if(view.mode==='span'&&view.startIso&&view.endIso){range.hidden=false;range.textContent=`${view.startIso.slice(0,7)} – ${view.endIso.slice(0,7)}`;}
  else {range.hidden=true;range.textContent='';}
  const markMap=inlineMarksByHost(rows), inline=inlineCheckpointIds(rows);
  grid.innerHTML=`<div class="g-row g-head"><div class="g-cell g-number">序次</div><div class="g-cell g-name">專案／工作項目</div><div class="g-cell g-owner g-col-meta">負責人</div><div class="g-cell g-start g-col-meta">開始日</div><div class="g-cell g-end g-col-meta">結束日</div><div class="g-cell g-timeline">${tickHtml()}${todayMark(true)}</div></div>`;
  for(const {r,depth,number} of shown){
    const [a,b]=bounds(rows,r), children=rows.some(x=>x.parent_id===r.id&&!inline.has(x.id));
    const delayed=nameIsDelayed(r,today,rows);
    const tone=barTone(r), color=tone?`var(--g-tone-${tone})`:r.kind==='project'?projectColor:ownerColor(r.owner||'');
    const row=document.createElement('div');row.className=`g-row${r.kind==='project'?' is-project':''}${r.id===selected?' is-selected':''}`;row.dataset.id=r.id;row.setAttribute('aria-label',r.name);
    const dateInput=(key,v)=>r.kind==='task'?`<input type="date" min="1900-01-01" max="2200-12-31" data-key="${key}" aria-label="${e(r.name)} ${key==='start'?'開始日':'結束日'}" value="${e(v)}">`:r.kind==='checkpoint'&&key==='start'?`<input type="date" min="1900-01-01" max="2200-12-31" data-key="date" aria-label="${e(r.name)} 查核日期" value="${e(r.date)}">`:e(v||'—');
    const nextText=r.id==='aplus'&&r.kind==='project'?formatNextNode(nextCheckpoint(rows,r.id,today)):'';
    row.innerHTML=`<div class="g-cell g-number" title="${e(number)}">${e(number)}</div><div class="g-cell g-name${delayed?' is-delayed':''}"><span class="g-indent" style="width:${Math.min(depth,10)*12}px" title="第 ${depth+1} 層"></span><button type="button" class="g-toggle" data-toggle="${e(r.id)}" aria-label="${collapsed.has(r.id)?'展開':'收合'} ${e(r.name)}" ${children?'aria-expanded="'+!collapsed.has(r.id)+'"':'disabled'}>${children?(collapsed.has(r.id)?'▸':'▾'):'·'}</button><label class="g-complete"><input type="checkbox" data-key="complete" aria-label="完成 ${e(r.name)}"></label><span class="g-name-main"><input data-key="name" aria-label="工作名稱" value="${e(r.name)}" maxlength="200" title="${e(r.name)}">${nextText?`<span class="g-next" title="${e(nextText)}">${e(nextText)}</span>`:''}</span></div><div class="g-cell g-owner g-col-meta"><input data-key="owner" aria-label="${e(r.name)} 負責人" value="${e(r.owner)}" maxlength="100" list="g-owners" style="border-left:4px solid ${color}"></div><div class="g-cell g-start g-col-meta">${dateInput('start',a)}</div><div class="g-cell g-end g-col-meta${delayed?' g-date-red':''}" title="${delayed?'今天已超過結束日，且尚未完成':''}">${r.kind==='checkpoint'?'◆ '+e(types[r.checkpoint_type]):dateInput('end',b)}</div><div class="g-cell g-timeline"></div>`;
    const lane=row.lastElementChild;
    let laneHtml='';
    if(a&&b){const leftPos=(day(a)-view.start)*view.unit,right=(day(b)-view.start+1)*view.unit;
      if(r.kind==='checkpoint'&&leftPos>=-view.unit&&leftPos<width)laneHtml+=`<button type="button" class="g-mark" data-drag="move" data-id="${e(r.id)}" style="left:${leftPos+view.unit/2}px;color:var(--g-${r.checkpoint_type})" title="${e(r.name)} · ${e(r.date)} · ${e(types[r.checkpoint_type])}" aria-label="${e(r.name)} ${e(r.date)} ${e(types[r.checkpoint_type])}；方向鍵調整一天">◆</button>`;
      else if(r.kind!=='checkpoint'&&right>0&&leftPos<width){const l=Math.max(0,leftPos),w=Math.min(width,right)-l;
        laneHtml+=`<${r.kind==='project'?'div':'button'} class="g-bar${r.kind==='project'?' is-project':''}" ${r.kind==='project'?'':`type="button" data-drag="move"`} style="left:${l}px;width:${w}px;background:${color}" title="${e(r.name)} · ${a} — ${b}" aria-label="${e(r.name)} ${a} 至 ${b}${r.kind==='task'?'；方向鍵平移，Shift 加方向鍵調整結束日，Alt 加方向鍵調整開始日':''}">${r.kind==='task'?`${leftPos>=0?'<span class="g-handle left" data-drag="start"></span>':''}${right<=width?'<span class="g-handle right" data-drag="end"></span>':''}`:''}</${r.kind==='project'?'div':'button'}>`;}
    }
    const marks=markMap.get(r.id)||[];
    if(marks.length){
      for(const group of layoutMarkLabels(marks,view.start,view.unit,width)){
        group.items.forEach((item,i)=>{const x=(day(item.date)-view.start)*view.unit+view.unit/2;if(x<-8||x>width+8)return;
          laneHtml+=`<button type="button" class="g-mark is-inline${item.id===selected?' is-picked':''}" data-drag="move" data-id="${e(item.id)}" style="left:${x}px;top:${8+i*12}px;color:var(--g-${item.checkpoint_type||'general'})" title="${e(item.name)} · ${e(item.date)}" aria-label="${e(item.name)} ${e(item.date)}">◆</button>`;});
        if(group.center>=0&&group.center<=width)laneHtml+=`<span class="g-node lane-${group.lane}" style="left:${group.center}px">${e(group.label)}</span>`;
      }
    }
    laneHtml+=todayMark(false);
    lane.innerHTML=laneHtml;
    grid.append(row);
  }
  if(!rows.length)grid.insertAdjacentHTML('beforeend','<div class="g-empty">尚無甘特圖資料。按「新增主專案」，再新增工作與查核點。</div>');
  const owners=[...new Set(rows.map(r=>r.owner.trim()).filter(Boolean))].sort();
  const tones=[...new Set(rows.map(barTone).filter(Boolean))];
  root.querySelector('.g-legend').innerHTML=`<span class="g-key"><i class="g-swatch" style="background:${projectColor}"></i>主專案</span>${tones.map(t=>`<span class="g-key"><i class="g-swatch" style="background:var(--g-tone-${t})"></i>${e(toneName[t]||t)}</span>`).join('')}${owners.map(o=>`<span class="g-key"><i class="g-swatch" style="background:${ownerColor(o)}"></i>${e(o)}</span>`).join('')}<span class="g-key"><b class="g-date-label">名稱紅字</b>今天已超過結束日且未完成</span><span class="g-key"><i class="g-today-key"></i>今天</span><span class="g-key"><b class="g-diamond" style="color:var(--g-contract)">◆</b>合約規格</span><span class="g-key"><b class="g-diamond" style="color:var(--g-major)">◆</b>內部重大規格</span><span class="g-key"><b class="g-diamond" style="color:var(--g-general)">◆</b>內部一般規格</span>`;
  root.querySelector('#g-owners').innerHTML=owners.map(o=>`<option value="${e(o)}"></option>`).join('');
  if(mobile)grid.querySelectorAll('.g-col-meta').forEach(el=>el.setAttribute('inert',''));
  renderHistory();
  controls();scroll.scrollLeft=sx;scroll.scrollTop=sy;
}
async function load(){
  if(busy||dirty&&!confirm('重新讀取會放棄尚未儲存的變更。確定繼續？'))return;
  busy=true;loaded=false;controls();say('正在讀取甘特圖…');
  try{
    const res=await fetch(api,{headers:window.GET_HEADERS,cache:'no-store'});
    if(!res.ok)throw Error(res.status===401?'登入已逾時，請重新登入後重試。':'讀取失敗，請重試；原有資料不會被空白覆寫。');
    const data=await res.json();
    if(typeof data.revision!=='string'||!Array.isArray(data.items))throw Error('資料格式錯誤，請重試。');
    doc=data;if(!Array.isArray(doc.history))doc.history=[];
    savedDoc=structuredClone(doc);pendingReasons={};localBefore=null;
    loaded=true;dirty=false;selected=null;collapsed=initialCollapsed(doc.items);
    say('已讀取獨立甘特圖。所有專案在同一張總表。');
  }catch(err){say(err.message,true);}finally{busy=false;render();}
}
async function save(){
  if(!loaded||busy||!dirty)return;
  clearTimeout(saveTimer);
  const ops=diffOps(savedDoc?.items||[],doc.items,pendingReasons);
  if(!ops.length){dirty=false;localBefore=null;controls();return;}
  busy=true;controls();say('正在儲存甘特圖…');
  try{
    const res=await fetch(api,{method:'PATCH',headers:window.HEADERS,body:JSON.stringify({revision:doc.revision,ops}),cache:'no-store'});
    if(!res.ok){
      if(res.status===409)throw Error('其他裝置已修改。你的變更仍在畫面，請先「匯出變更」，再重新讀取並核對。');
      if(res.status===401)throw Error('登入已逾時。變更仍在畫面，請先匯出，再重新登入。');
      throw Error('儲存失敗，變更仍在畫面，請重試。');
    }
    const data=await res.json();
    if(typeof data.revision!=='string'||!Array.isArray(data.items))throw Error('儲存回應錯誤。變更仍在畫面，請先匯出，再重新讀取確認。');
    doc=data;if(!Array.isArray(doc.history))doc.history=[];
    savedDoc=structuredClone(doc);pendingReasons={};localBefore=null;dirty=false;
    say('甘特圖已儲存，可於其他裝置登入後讀取。');
  }catch(err){say(err.message,true);}finally{busy=false;render();}
}
async function undo(){
  if(busy||!loaded)return;
  if(dirty&&localBefore){
    doc.items=structuredClone(localBefore);
    pendingReasons={};localBefore=null;changed();render();return;
  }
  if(!historyCanUndo(doc?.history)){say('沒有可復原的上一步。',true);return;}
  clearTimeout(saveTimer);
  busy=true;controls();say('正在復原上一步…');
  try{
    const res=await fetch(api,{method:'PATCH',headers:window.HEADERS,body:JSON.stringify({revision:doc.revision,ops:[{op:'undo'}]}),cache:'no-store'});
    if(!res.ok){
      if(res.status===409)throw Error('其他裝置已修改。請先重新讀取再試復原。');
      throw Error('復原失敗，請重試。');
    }
    const data=await res.json();
    if(typeof data.revision!=='string'||!Array.isArray(data.items))throw Error('復原回應錯誤，請重新讀取。');
    doc=data;if(!Array.isArray(doc.history))doc.history=[];
    savedDoc=structuredClone(doc);pendingReasons={};localBefore=null;dirty=false;
    say('已復原上一步。');
  }catch(err){say(err.message,true);}finally{busy=false;render();}
}
function editor(kind,id,opts={}){
  const r=id?doc.items.find(r=>r.id===id):null,parent=doc.items.find(r=>r.id===selected);
  if(!r&&kind!=='project'&&!opts.parent&&(!parent||parent.kind==='checkpoint'))return;
  editing={id,kind:r?.kind||kind};const k=editing.kind;
  form.reset();form.querySelector('h2').textContent=(r?'編輯':'新增')+({project:'主專案',task:'工作項目',checkpoint:'查核點'}[k]);
  form.querySelector('.g-form-error').textContent='';
  const blocked=r?descendants(doc.items,r.id):new Set();
  form.elements.parent.innerHTML=visible(doc.items).filter(x=>x.r.kind!=='checkpoint'&&!blocked.has(x.r.id)).map(({r,depth})=>`<option value="${e(r.id)}">${'　'.repeat(Math.min(depth,15))}${e(r.name)}</option>`).join('');
  const parentValue=r?.parent_id||opts.parent||selected;
  for(const [key,value] of Object.entries({name:r?.name||'',owner:r?.owner||'',parent:parentValue,start:r?.start||today,end:r?.end||today,date:r?.date||today,checkpoint_type:r?.checkpoint_type||'contract'}))form.elements[key].value=value??'';
  for(const [field,show] of Object.entries({parent:k!=='project',start:k==='task',end:k==='task',date:k==='checkpoint',type:k==='checkpoint'})){
    form.querySelector(`[data-field=${field}]`).hidden=!show;const input=form.querySelector(`[data-field=${field}] input`);if(input)input.required=show;
  }
  dialog.showModal();form.elements.name.focus();
}
form.addEventListener('submit',ev=>{
  ev.preventDefault();if(busy||!loaded)return;const f=form.elements,k=editing.kind,name=f.name.value.trim();if(!name)return;
  if(k==='task'&&f.end.value<f.start.value){form.querySelector('.g-form-error').textContent='結束日期不可早於開始日期。';return;}
  remember();
  let id=editing.id||crypto.randomUUID(),row=doc.items.find(r=>r.id===id),parentId=k==='project'?null:f.parent.value;
  if(!row){const p=doc.items.find(r=>r.id===parentId);row={id,project_id:k==='project'?id:(p?.kind==='project'?p.id:p?.project_id),parent_id:parentId,order:Math.max(-1,...ordered(doc.items,parentId).map(r=>r.order))+1,kind:k,status:'wait'};doc.items.push(row);}
  else if(k!=='project'&&row.parent_id!==parentId){doc.items=moveParent(doc.items,id,parentId);row=doc.items.find(r=>r.id===id);}
  Object.assign(row,{name,owner:f.owner.value.trim(),start:k==='task'?f.start.value:null,end:k==='task'?f.end.value:null,date:k==='checkpoint'?f.date.value:null,checkpoint_type:k==='checkpoint'?f.checkpoint_type.value:null});
  if(k!=='project')doc.items=extendTaskParents(doc.items,id);
  if(parentId)collapsed.delete(parentId);selected=id;dialog.close();changed();render();
});
root.addEventListener('click',ev=>{
  const action=ev.target.closest('[data-action]')?.dataset.action;
  if(action==='cancel'){dialog.close();return;}if(!action||busy)return;
  if(action==='load'){load();return;}if(!loaded&&action!=='export')return;
  const row=doc.items.find(r=>r.id===selected);
  if(['project','task','checkpoint'].includes(action))editor(action);
  if(action==='sibling'&&row&&row.kind!=='project')editor(row.kind,null,{parent:row.parent_id});
  if(action==='edit'&&row)editor(row.kind,row.id);
  if(action==='save')save();
  if(action==='undo')undo();
  if(action==='export'){const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='950157-gantt-changes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  if(action==='delete'&&row){const ids=descendants(doc.items,row.id);if(confirm(deleteMessage(row,ids,'delete'))){remember();removeRows(row,'manual');changed();render();}}
  if(['up','down'].includes(action)&&row){const list=ordered(doc.items,row.parent_id),index=list.findIndex(r=>r.id===row.id),to=index+(action==='up'?-1:1);if(to>=0&&to<list.length){remember();[list[index],list[to]]=[list[to],list[index]];list.forEach((r,i)=>r.order=i);changed();render();}}
  if(action==='expand'){collapsed.clear();render();}if(action==='collapse'){collapsed=new Set(doc.items.filter(r=>r.kind!=='checkpoint').map(r=>r.id));render();}
  if(['prev','next','today'].includes(action)){if(!(mode==='span'&&action!=='today')){anchor=action==='today'?today:iso(Math.max(day('1900-01-01'),Math.min(day('2200-09-30'),day(anchor)+(action==='prev'?-1:1)*(mode==='month'?31:7))));root.querySelector('#g-anchor').value=anchor;}render();}
  if(action==='end'){root.querySelector('.g-scroll').scrollLeft=1e9;}
});
root.querySelector('#g-anchor').addEventListener('change',ev=>{if(ev.target.validity.valid&&ev.target.value){anchor=ev.target.value;render();}});
root.querySelector('#g-mode').addEventListener('change',ev=>{mode=ev.target.value;render();});
grid.addEventListener('click',ev=>{
  const rowEl=ev.target.closest('.g-row[data-id]');if(!rowEl||busy||!loaded)return;
  const mark=ev.target.closest('.g-mark[data-id]');
  if(mark){selected=mark.dataset.id;grid.querySelectorAll('.is-selected').forEach(r=>r.classList.remove('is-selected'));rowEl.classList.add('is-selected');controls();return;}
  selected=rowEl.dataset.id;
  const toggle=ev.target.closest('[data-toggle]');if(toggle&&!toggle.disabled){collapsed.has(selected)?collapsed.delete(selected):collapsed.add(selected);render();}else{grid.querySelectorAll('.is-selected').forEach(r=>r.classList.remove('is-selected'));rowEl.classList.add('is-selected');controls();}
});
grid.addEventListener('change',ev=>{
  const el=ev.target,key=el.dataset.key,row=doc?.items.find(r=>r.id===el.closest('[data-id]')?.dataset.id);
  if(!row||!key||busy||!loaded)return;
  if(key==='complete'){
    if(!el.checked)return;
    const ids=descendants(doc.items,row.id);
    if(!confirm(deleteMessage(row,ids,'complete'))){el.checked=false;return;}
    remember();removeRows(row,'complete');changed();render();return;
  }
  let v=el.value.trim();if((!v&&key!=='owner')||!el.validity.valid){say('請輸入有效的名稱或日期。',true);render();return;}
  if((key==='start'&&v>row.end)||(key==='end'&&v<row.start)){say('結束日期不可早於開始日期。',true);render();return;}
  remember();row[key]=v;if(key==='start'||key==='end'||key==='date')doc.items=extendTaskParents(doc.items,row.id);changed();render();
});
grid.addEventListener('pointerdown',ev=>{
  const target=ev.target.closest('[data-drag]');if(!target||busy||!loaded||ev.button!==0)return;
  const id=target.dataset.id||target.closest('[data-id]')?.dataset.id, row=doc?.items.find(r=>r.id===id);if(!row)return;
  ev.preventDefault();const bar=target.closest('.g-bar,.g-mark'),unit=view.unit,x=ev.clientX,scroll=root.querySelector('.g-scroll'),scrollX=scroll.scrollLeft,original={...row};let delta=0;const action=target.dataset.drag;selected=row.id;target.setPointerCapture(ev.pointerId);
  const move=e=>{delta=Math.round((e.clientX-x+scroll.scrollLeft-scrollX)/unit);const next=drag(original,action,delta);say(next.kind==='checkpoint'?`${next.name}：${next.date}`:`${next.name}：${next.start} — ${next.end}`);bar.style.opacity='.6';const origin=view.start,limit=view.days*unit;if(next.kind==='checkpoint')bar.style.left=((day(next.date)-origin)*unit+unit/2)+'px';else{const leftPos=Math.max(0,(day(next.start)-origin)*unit),right=Math.min(limit,(day(next.end)-origin+1)*unit);bar.style.left=leftPos+'px';bar.style.width=Math.max(0,right-leftPos)+'px';}};
  const finish=e=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',finish);if(e.type==='pointerup'&&delta){remember();Object.assign(row,drag(original,action,delta));doc.items=extendTaskParents(doc.items,row.id);changed();}else say(dirty?'有尚未儲存的變更。':'拖曳已取消，日期未變更。');render();};
  target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',finish);
});
grid.addEventListener('keydown',ev=>{
  const t=ev.target.closest('[data-drag]');if(!t||!['ArrowLeft','ArrowRight'].includes(ev.key)||busy||!loaded)return;ev.preventDefault();const id=t.dataset.id||t.closest('[data-id]')?.dataset.id,row=doc.items.find(r=>r.id===id);remember();Object.assign(row,drag(row,ev.altKey?'start':ev.shiftKey?'end':'move',ev.key==='ArrowRight'?1:-1));doc.items=extendTaskParents(doc.items,row.id);changed();render();(grid.querySelector(`[data-drag][data-id="${CSS.escape(id)}"]`)||grid.querySelector(`[data-id="${CSS.escape(id)}"] [data-drag]`))?.focus();
});
window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue='';}});
window.matchMedia('(max-width:640px)').addEventListener('change',()=>{if(doc)render();});
document.querySelector('[data-tab=gantt]').addEventListener('click',()=>{if(!doc&&!busy)load();});
for(const id of ['saveBtn','refreshBtn'])document.getElementById(id).addEventListener('click',ev=>{if(document.querySelector('#tab-gantt').classList.contains('active')){ev.stopImmediatePropagation();id==='saveBtn'?save():load();}},true);
if(new URLSearchParams(location.search).get('tab')==='gantt'){document.querySelector('[data-tab=gantt]').click();}
controls();
