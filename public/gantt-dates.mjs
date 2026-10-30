const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountImportantDates(root,api){
 const dialog=document.createElement('dialog');dialog.className='g-dialog g-dates-dialog';
 dialog.innerHTML=`<form class="g-form"><h2>重要日期</h2><p class="g-note">展覽、審查等共用日期會在所有專案的時間軸顯示參考線。</p><div class="g-date-list"></div><input type="hidden" name="id"><label>名稱<input name="name" maxlength="100" required></label><label>日期<input name="date" type="date" min="1900-01-01" max="2200-12-31" required></label><label>類型<select name="category"><option value="exhibition">展覽</option><option value="review">審查</option><option value="other">其他</option></select></label><footer><button type="button" class="hy-btn" data-date-action="new">新增一筆</button><button type="button" class="hy-btn" data-date-action="close">關閉</button><button type="submit" class="hy-btn is-primary">套用日期</button></footer></form>`;
 root.append(dialog);const form=dialog.querySelector('form'),fields=form.elements;
 function list(){dialog.querySelector('.g-date-list').innerHTML=[...(api.getDoc()?.important_dates||[])].sort((a,b)=>a.date.localeCompare(b.date)).map(d=>`<div class="g-date-list-row"><button type="button" class="g-inline" data-date-edit="${esc(d.id)}">${esc(d.name)} · ${d.date}</button><button type="button" class="hy-btn is-danger" data-date-remove="${esc(d.id)}" aria-label="刪除 ${esc(d.name)}">刪除</button></div>`).join('')||'<p class="g-note">尚無重要日期，可在下方新增。</p>';}
 function select(id){const value=api.getDoc()?.important_dates?.find(d=>d.id===id);form.reset();fields.id.value=value?.id||'';fields.name.value=value?.name||'';fields.date.value=value?.date||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});fields.category.value=value?.category||'exhibition';}
 function open(id){if(!api.isReady())return;list();select(id);if(!dialog.open)dialog.showModal();}
 root.addEventListener('click',event=>{const button=event.target.closest('[data-date-edit]');if(button)open(button.dataset.dateEdit);});
 dialog.addEventListener('click',event=>{
  const action=event.target.closest('[data-date-action]')?.dataset.dateAction;
  if(action==='close')dialog.close();if(action==='new')select();
  const id=event.target.closest('[data-date-remove]')?.dataset.dateRemove;
  if(id&&confirm('刪除此重要日期？')){const doc=api.getDoc();doc.important_dates=doc.important_dates.filter(d=>d.id!==id);api.onChange();list();select();}
 });
 form.addEventListener('submit',event=>{event.preventDefault();if(!api.isReady())return;const doc=api.getDoc(),events=doc.important_dates||[];if(events.length>=100&&!fields.id.value){alert('重要日期最多 100 筆');return;}const name=fields.name.value.trim();if(!name)return;const id=fields.id.value||crypto.randomUUID(),value={id,name,date:fields.date.value,category:fields.category.value};doc.important_dates=[...events.filter(d=>d.id!==id),value];api.onChange();list();select(id);});
 return {open};
}
