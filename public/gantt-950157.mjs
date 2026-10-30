import {day,iso,shift,types,ownerColor,projectColor,ordered,descendants,visible,bounds,drag,moveParent} from './gantt-model.mjs';
const root=document.querySelector('#gantt');
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=window.API+'/api/950157-gantt';
let doc=null,dirty=false,busy=false,selected=null,collapsed=new Set(),mode='month',anchor=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'}),loaded=false,editing=null;
const today=anchor;
root.innerHTML=`<div class="g-toolbar"><div class="g-actions"><button class="hy-btn is-primary" data-action="project">新增主專案</button><button class="hy-btn" data-action="task">新增子工作</button><button class="hy-btn" data-action="checkpoint">新增查核點</button><button class="hy-btn" data-action="edit">編輯／階層</button><button class="hy-btn" data-action="up" aria-label="工作上移">↑</button><button class="hy-btn" data-action="down" aria-label="工作下移">↓</button><button class="hy-btn is-danger" data-action="delete">刪除</button></div><div class="g-actions"><button class="hy-btn" data-action="load">重新讀取</button><button class="hy-btn is-primary" data-action="save">儲存甘特圖</button><button class="hy-btn" data-action="export">匯出變更</button></div></div>
<div class="g-toolbar"><div class="g-actions"><button class="hy-btn" data-action="prev" aria-label="上一期">‹</button><label>時間起點 <input type="date" id="g-anchor" min="1900-01-01" max="2200-12-31" value="${anchor}"></label><button class="hy-btn" data-action="next" aria-label="下一期">›</button><button class="hy-btn" data-action="today">今天</button><label>檢視 <select id="g-mode"><option value="month">月</option><option value="week">週</option></select></label><button class="hy-btn" data-action="expand">全部展開</button><button class="hy-btn" data-action="collapse">全部收合</button></div><span class="g-note">選取工作後新增子項；時間條中央平移、兩端調日期，◆ 可拖曳。</span></div>
<div class="g-message" role="status" aria-live="polite">開啟分頁後載入甘特圖。</div><div class="g-legend"></div><div class="g-scroll" tabindex="0" aria-label="多專案甘特圖，可水平及垂直捲動"><div class="g-grid"></div></div>
<dialog class="g-dialog"><form class="g-form"><h2></h2><label>名稱<input name="name" required maxlength="200"></label><label>主要負責人<input name="owner" maxlength="100" list="g-owners"></label><label data-field="parent">所屬階層<select name="parent"></select></label><label data-field="start">開始日<input name="start" type="date" min="1900-01-01" max="2200-12-31"></label><label data-field="end">結束日<input name="end" type="date" min="1900-01-01" max="2200-12-31"></label><label data-field="date">查核日期<input name="date" type="date" min="1900-01-01" max="2200-12-31"></label><label data-field="type">查核點類型<select name="checkpoint_type">${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><div class="g-form-error" role="alert"></div><footer><button type="button" class="hy-btn" data-action="cancel">取消</button><button class="hy-btn is-primary" type="submit">套用變更</button></footer></form></dialog><datalist id="g-owners"></datalist>`;
const grid=root.querySelector('.g-grid'),message=root.querySelector('.g-message'),dialog=root.querySelector('dialog'),form=dialog.querySelector('form');
function say(s,error=false){message.textContent=s;message.dataset.error=error;}
function controls(){
  const row=doc?.items.find(r=>r.id===selected);
  root.querySelectorAll('[data-action]').forEach(b=>{const a=b.dataset.action;b.disabled=busy||(!loaded&&!['load',...(doc?['export']:[])].includes(a))||(['edit','up','down','delete','task','checkpoint'].includes(a)&&!row)||(['task','checkpoint'].includes(a)&&row?.kind==='checkpoint')||(a==='save'&&!dirty);});
  root.querySelector('#g-anchor').disabled=busy;root.querySelector('#g-mode').disabled=busy;
  grid.querySelectorAll('input,select,button').forEach(el=>el.disabled=busy);
}
function changed(){dirty=true;say('有尚未儲存的變更，請按「儲存甘特圖」。');controls();}
function render(){
 const scroll=root.querySelector('.g-scroll'),sx=scroll.scrollLeft,sy=scroll.scrollTop;
 const unit=mode==='month'?9:30,days=mode==='month'?93:28,start=day(anchor),width=unit*days;
 grid.style.setProperty('--g-width',width+'px');grid.style.setProperty('--g-unit',unit+'px');
 let ticks='';for(let i=0;i<days;i++){const d=iso(start+i);if(i===0||(mode==='month'?d.slice(8)==='01':i%7===0))ticks+=`<span class="g-tick" style="left:${i*unit}px">${mode==='month'?d.slice(0,7):d.slice(5)+' 週'}</span>`;if(mode==='week'||i%7===0)ticks+=`<span class="g-tick g-date" style="left:${i*unit}px">${mode==='month'?d.slice(5):d.slice(8)}</span>`;}
 grid.innerHTML=`<div class="g-row g-head"><div class="g-cell">序次</div><div class="g-cell g-name">專案／工作項目</div><div class="g-cell">負責人</div><div class="g-cell">開始日</div><div class="g-cell">結束日</div><div class="g-cell g-timeline">${ticks}</div></div>`;
 const rows=doc?.items||[];
 for(const {r,depth,number} of visible(rows,collapsed)){
  const [a,b]=bounds(rows,r),children=rows.some(x=>x.parent_id===r.id),color=r.kind==='project'?projectColor:ownerColor(r.owner);
  const row=document.createElement('div');row.className=`g-row${r.kind==='project'?' is-project':''}${r.id===selected?' is-selected':''}`;row.dataset.id=r.id;row.setAttribute('aria-label',r.name);
  const dateInput=(key,v)=>r.kind==='task'?`<input type="date" min="1900-01-01" max="2200-12-31" data-key="${key}" aria-label="${e(r.name)} ${key==='start'?'開始日':'結束日'}" value="${e(v)}">`:r.kind==='checkpoint'&&key==='start'?`<input type="date" min="1900-01-01" max="2200-12-31" data-key="date" aria-label="${e(r.name)} 查核日期" value="${e(r.date)}">`:e(v||'—');
  row.innerHTML=`<div class="g-cell g-number" title="${e(number)}">${e(number)}</div><div class="g-cell g-name"><span class="g-indent" style="width:${Math.min(depth,10)*12}px" title="第 ${depth+1} 層"></span><button class="g-toggle" data-toggle="${e(r.id)}" aria-label="${collapsed.has(r.id)?'展開':'收合'} ${e(r.name)}" ${children?'aria-expanded="'+!collapsed.has(r.id)+'"':'disabled'}>${children?(collapsed.has(r.id)?'▸':'▾'):'·'}</button><input data-key="name" aria-label="工作名稱" value="${e(r.name)}" maxlength="200" title="${e(r.name)}"></div><div class="g-cell"><input data-key="owner" aria-label="${e(r.name)} 負責人" value="${e(r.owner)}" maxlength="100" list="g-owners" style="border-left:4px solid ${color}"></div><div class="g-cell">${dateInput('start',a)}</div><div class="g-cell">${r.kind==='checkpoint'?'◆ '+e(types[r.checkpoint_type]):dateInput('end',b)}</div><div class="g-cell g-timeline"></div>`;
  const lane=row.lastElementChild;
  if(a&&b){const left=(day(a)-start)*unit,right=(day(b)-start+1)*unit;
   if(r.kind==='checkpoint'&&left>=0&&left<width)lane.innerHTML=`<button class="g-mark" data-drag="move" style="left:${left+unit/2}px;color:var(--g-${r.checkpoint_type})" title="${e(r.name)} · ${e(r.date)} · ${e(types[r.checkpoint_type])}" aria-label="${e(r.name)} ${e(r.date)} ${e(types[r.checkpoint_type])}；方向鍵調整一天">◆</button>`;
   else if(r.kind!=='checkpoint'&&right>0&&left<width){const l=Math.max(0,left),w=Math.min(width,right)-l;lane.innerHTML=`<${r.kind==='project'?'div':'button'} class="g-bar${r.kind==='project'?' is-project':''}" ${r.kind==='project'?'':'data-drag="move"'} style="left:${l}px;width:${w}px;background:${color}" title="${e(r.name)} · ${a} — ${b}" aria-label="${e(r.name)} ${a} 至 ${b}${r.kind==='task'?'；方向鍵平移，Shift 加方向鍵調整結束日，Alt 加方向鍵調整開始日':''}">${r.kind==='task'?`${left>=0?'<span class="g-handle left" data-drag="start"></span>':''}${right<=width?'<span class="g-handle right" data-drag="end"></span>':''}`:''}</${r.kind==='project'?'div':'button'}>`;}
  }
  grid.append(row);
 }
 if(!rows.length)grid.insertAdjacentHTML('beforeend','<div class="g-empty">尚無甘特圖資料。按「新增主專案」，再新增工作與查核點。</div>');
 const owners=[...new Set(rows.map(r=>r.owner.trim()).filter(Boolean))].sort();
 root.querySelector('.g-legend').innerHTML=`<span class="g-key"><i class="g-swatch" style="background:${projectColor}"></i>主專案</span>${owners.map(o=>`<span class="g-key"><i class="g-swatch" style="background:${ownerColor(o)}"></i>${e(o)}</span>`).join('')}<span class="g-key"><b class="g-diamond" style="color:var(--g-contract)">◆</b>合約規格</span><span class="g-key"><b class="g-diamond" style="color:var(--g-major)">◆</b>內部重大規格</span><span class="g-key"><b class="g-diamond" style="color:var(--g-general)">◆</b>內部一般規格</span>`;
 root.querySelector('#g-owners').innerHTML=owners.map(o=>`<option value="${e(o)}"></option>`).join('');
 controls();scroll.scrollLeft=sx;scroll.scrollTop=sy;
}
async function load(){
 if(busy||dirty&&!confirm('重新讀取會放棄尚未儲存的變更。確定繼續？'))return;
 busy=true;loaded=false;controls();say('正在讀取甘特圖…');
 try{const res=await fetch(api,{headers:window.GET_HEADERS,cache:'no-store'});if(!res.ok)throw Error(res.status===401?'登入已逾時，請重新登入後重試。':'讀取失敗，請重試；原有資料不會被空白覆寫。');const data=await res.json();if(typeof data.revision!=='string'||!Array.isArray(data.items))throw Error('資料格式錯誤，請重試。');doc=data;loaded=true;dirty=false;selected=null;say('已讀取獨立甘特圖。所有專案在同一張總表。');}
 catch(err){say(err.message,true);}finally{busy=false;render();}
}
async function save(){
 if(!loaded||busy||!dirty)return;busy=true;controls();say('正在儲存甘特圖…');
 try{const res=await fetch(api,{method:'PUT',headers:window.HEADERS,body:JSON.stringify(doc),cache:'no-store'});if(!res.ok){if(res.status===409)throw Error('其他裝置已修改。你的變更仍在畫面，請先「匯出變更」，再重新讀取並核對。');if(res.status===401)throw Error('登入已逾時。變更仍在畫面，請先匯出，再重新登入。');throw Error('儲存失敗，變更仍在畫面，請重試。');}const data=await res.json();if(typeof data.revision!=='string'||!Array.isArray(data.items))throw Error('儲存回應錯誤。變更仍在畫面，請先匯出，再重新讀取確認。');doc=data;dirty=false;say('甘特圖已儲存，可於其他裝置登入後讀取。');}
 catch(err){say(err.message,true);}finally{busy=false;render();}
}
function editor(kind,id){
 const r=id?doc.items.find(r=>r.id===id):null,parent=doc.items.find(r=>r.id===selected);
 if(!r&&kind!=='project'&&(!parent||parent.kind==='checkpoint'))return;
 editing={id,kind:r?.kind||kind};const k=editing.kind;
 form.reset();form.querySelector('h2').textContent=(r?'編輯':'新增')+({project:'主專案',task:'工作項目',checkpoint:'查核點'}[k]);form.querySelector('.g-form-error').textContent='';
 const blocked=r?descendants(doc.items,r.id):new Set();
 form.elements.parent.innerHTML=visible(doc.items).filter(x=>x.r.kind!=='checkpoint'&&!blocked.has(x.r.id)).map(({r,depth})=>`<option value="${e(r.id)}">${'　'.repeat(Math.min(depth,15))}${e(r.name)}</option>`).join('');
 for(const [key,value] of Object.entries({name:r?.name||'',owner:r?.owner||'',parent:r?.parent_id||selected,start:r?.start||today,end:r?.end||today,date:r?.date||today,checkpoint_type:r?.checkpoint_type||'contract'}))form.elements[key].value=value??'';
 for(const [field,show] of Object.entries({parent:k!=='project',start:k==='task',end:k==='task',date:k==='checkpoint',type:k==='checkpoint'})){form.querySelector(`[data-field=${field}]`).hidden=!show;const input=form.querySelector(`[data-field=${field}] input`);if(input)input.required=show;}
 dialog.showModal();form.elements.name.focus();
}
form.addEventListener('submit',ev=>{
 ev.preventDefault();if(busy||!loaded)return;const f=form.elements,k=editing.kind,name=f.name.value.trim();if(!name)return;
 if(k==='task'&&f.end.value<f.start.value){form.querySelector('.g-form-error').textContent='結束日期不可早於開始日期。';return;}
 let id=editing.id||crypto.randomUUID(),row=doc.items.find(r=>r.id===id),parentId=k==='project'?null:f.parent.value;
 if(!row){const p=doc.items.find(r=>r.id===parentId);row={id,project_id:k==='project'?id:(p?.kind==='project'?p.id:p?.project_id),parent_id:parentId,order:Math.max(-1,...ordered(doc.items,parentId).map(r=>r.order))+1,kind:k,status:'wait'};doc.items.push(row);}
 else if(k!=='project'&&row.parent_id!==parentId){doc.items=moveParent(doc.items,id,parentId);row=doc.items.find(r=>r.id===id);}
 Object.assign(row,{name,owner:f.owner.value.trim(),start:k==='task'?f.start.value:null,end:k==='task'?f.end.value:null,date:k==='checkpoint'?f.date.value:null,checkpoint_type:k==='checkpoint'?f.checkpoint_type.value:null});
 if(parentId)collapsed.delete(parentId);selected=id;dialog.close();changed();render();
});
root.addEventListener('click',ev=>{
 const action=ev.target.closest('[data-action]')?.dataset.action;
 if(action==='cancel'){dialog.close();return;}if(!action||busy)return;
 if(action==='load'){load();return;}if(!loaded&&action!=='export')return;
 const row=doc.items.find(r=>r.id===selected);
 if(['project','task','checkpoint'].includes(action))editor(action);
 if(action==='edit'&&row)editor(row.kind,row.id);
 if(action==='save')save();
 if(action==='export'){const blob=new Blob([JSON.stringify(doc,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='950157-gantt-changes.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 if(action==='delete'&&row){const ids=descendants(doc.items,row.id);if(confirm(`刪除「${row.name}」及其子項，共 ${ids.size} 筆？`)){doc.items=doc.items.filter(r=>!ids.has(r.id));selected=null;changed();render();}}
 if(['up','down'].includes(action)&&row){const list=ordered(doc.items,row.parent_id),index=list.findIndex(r=>r.id===row.id),to=index+(action==='up'?-1:1);if(to>=0&&to<list.length){[list[index],list[to]]=[list[to],list[index]];list.forEach((r,i)=>r.order=i);changed();render();}}
 if(action==='expand'){collapsed.clear();render();}if(action==='collapse'){collapsed=new Set(doc.items.filter(r=>r.kind!=='checkpoint').map(r=>r.id));render();}
 if(['prev','next','today'].includes(action)){anchor=action==='today'?today:iso(Math.max(day('1900-01-01'),Math.min(day('2200-09-30'),day(anchor)+(action==='prev'?-1:1)*(mode==='month'?31:7))));root.querySelector('#g-anchor').value=anchor;render();}
});
root.querySelector('#g-anchor').addEventListener('change',ev=>{if(ev.target.validity.valid&&ev.target.value){anchor=ev.target.value;render();}});
root.querySelector('#g-mode').addEventListener('change',ev=>{mode=ev.target.value;render();});
grid.addEventListener('click',ev=>{
 const row=ev.target.closest('.g-row[data-id]');if(!row||busy||!loaded)return;selected=row.dataset.id;
 const toggle=ev.target.closest('[data-toggle]');if(toggle){collapsed.has(selected)?collapsed.delete(selected):collapsed.add(selected);render();}else{grid.querySelectorAll('.is-selected').forEach(r=>r.classList.remove('is-selected'));row.classList.add('is-selected');controls();}
});
grid.addEventListener('change',ev=>{
 const el=ev.target,key=el.dataset.key,row=doc?.items.find(r=>r.id===el.closest('[data-id]')?.dataset.id);if(!row||!key||busy||!loaded)return;
 let v=el.value.trim();if((!v&&key!=='owner')||!el.validity.valid){say('請輸入有效的名稱、日期或狀態。',true);render();return;}
 if((key==='start'&&v>row.end)||(key==='end'&&v<row.start)){say('結束日期不可早於開始日期。',true);render();return;}
 row[key]=v;changed();render();
});
// Pointer capture continues through scrolling and handle movement; only commit on pointerup.
grid.addEventListener('pointerdown',ev=>{
 const target=ev.target.closest('[data-drag]'),row=doc?.items.find(r=>r.id===target?.closest('[data-id]')?.dataset.id);if(!target||!row||busy||!loaded||ev.button!==0)return;
 ev.preventDefault();const bar=target.closest('.g-bar,.g-mark'),unit=mode==='month'?9:30,x=ev.clientX,scroll=root.querySelector('.g-scroll'),scrollX=scroll.scrollLeft,original={...row};let delta=0;const action=target.dataset.drag;selected=row.id;target.setPointerCapture(ev.pointerId);
 const move=e=>{delta=Math.round((e.clientX-x+scroll.scrollLeft-scrollX)/unit);const next=drag(original,action,delta);say(next.kind==='checkpoint'?`${next.name}：${next.date}`:`${next.name}：${next.start} — ${next.end}`);bar.style.opacity='.6';const origin=day(anchor),limit=(mode==='month'?93:28)*unit;if(next.kind==='checkpoint')bar.style.left=((day(next.date)-origin)*unit+unit/2)+'px';else{const left=Math.max(0,(day(next.start)-origin)*unit),right=Math.min(limit,(day(next.end)-origin+1)*unit);bar.style.left=left+'px';bar.style.width=Math.max(0,right-left)+'px';}};
 const finish=e=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',finish);if(e.type==='pointerup'&&delta){Object.assign(row,drag(original,action,delta));changed();}else say(dirty?'有尚未儲存的變更。':'拖曳已取消，日期未變更。');render();};
 target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',finish);
});
grid.addEventListener('keydown',ev=>{
 const t=ev.target.closest('[data-drag]');if(!t||!['ArrowLeft','ArrowRight'].includes(ev.key)||busy||!loaded)return;ev.preventDefault();const row=doc.items.find(r=>r.id===t.closest('[data-id]').dataset.id);Object.assign(row,drag(row,ev.altKey?'start':ev.shiftKey?'end':'move',ev.key==='ArrowRight'?1:-1));const id=row.id;changed();render();grid.querySelector(`[data-id="${CSS.escape(id)}"] [data-drag]`)?.focus();
});
window.addEventListener('beforeunload',ev=>{if(dirty){ev.preventDefault();ev.returnValue='';}});
document.querySelector('[data-tab=gantt]').addEventListener('click',()=>{if(!doc&&!busy)load();});
// The existing header's progress actions must never write progress data from this tab.
for(const id of ['saveBtn','refreshBtn'])document.getElementById(id).addEventListener('click',ev=>{if(document.querySelector('#tab-gantt').classList.contains('active')){ev.stopImmediatePropagation();id==='saveBtn'?save():load();}},true);
if(new URLSearchParams(location.search).get('tab')==='gantt'){document.querySelector('[data-tab=gantt]').click();}
controls();
