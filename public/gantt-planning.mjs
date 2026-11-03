const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountPlanner(root,api){
 const workspace=document.createElement('div');workspace.className='g-workspace';
 const schedule=document.createElement('div');schedule.className='g-schedule';
 while(root.firstChild)schedule.append(root.firstChild);
 const panel=document.createElement('aside');panel.className='g-planner';panel.setAttribute('aria-label','AI 規劃對話');
 panel.innerHTML=`<div class="g-planner-head"><h2>AI 規劃對話</h2><button class="hy-btn" data-plan-action="refresh" aria-label="重新讀取規劃">重讀</button><button class="hy-btn" data-plan-action="new">新規劃</button></div><p class="g-note">第一步：上傳 Excel、照片或 Word，交給 ChatGPT 展開一版，再回來微調。</p><label class="g-note">規劃對話<select class="g-plan-sessions" aria-label="規劃對話"><option value="">新規劃</option></select></label><div class="g-plan-history" aria-live="polite"><p class="g-note">可先描述專案目標，或加入附件。</p></div><div class="g-plan-proposal"></div><div class="g-plan-handoff" hidden><p class="g-note">使用現有 ChatGPT，不串模型 API。送出後，請到已連接 HY Life OS 的 ChatGPT 貼上以下訊息，處理完再按「讀取 AI 回覆」。</p><textarea readonly aria-label="ChatGPT 接力訊息"></textarea><button class="hy-btn" data-plan-action="copy">複製訊息</button><button class="hy-btn" data-plan-action="refresh">讀取 AI 回覆</button></div><div class="g-plan-alert" role="status" aria-live="polite" hidden></div><form class="g-plan-form"><label class="g-plan-upload hy-btn">加入附件<input type="file" multiple accept=".xlsx,.xls,.csv,.docx,.png,.jpg,.jpeg,.webp,.txt,.md" aria-label="規劃附件"></label><div class="g-plan-files g-note"></div><label><span class="g-note">規劃需求</span><textarea name="message" maxlength="8000" placeholder="例如：依附件展開研發專案，保留合約查核點，先列出需要我確認的假設。"></textarea></label><button class="hy-btn is-primary" type="submit">送出規劃需求</button><span class="g-note">Excel（xlsx／xls／csv）、Word（docx）、照片、文字。每次最多 5 個檔案，合計 8MB；附件存於獨立甘特圖區。</span></form>`;
 workspace.append(panel,schedule);root.append(workspace);
 const base=window.API+'/api/950157-gantt/planning';
 const form=panel.querySelector('form'),fileInput=panel.querySelector('[type=file]'),history=panel.querySelector('.g-plan-history'),alert=panel.querySelector('.g-plan-alert'),select=panel.querySelector('select');
 let active=null,waiting=false,clientId=crypto.randomUUID(),draftSessionId=crypto.randomUUID(),sessions=[],initialized=false;
 function say(text,error=false){alert.textContent=text;alert.hidden=!text;alert.dataset.error=error;}
 async function request(url,options={}){const res=await fetch(url,{cache:'no-store',headers:window.GET_HEADERS,...options});if(!res.ok){let detail;try{detail=(await res.json()).detail;}catch{}throw Error(res.status===401?'請重新登入後使用 AI 規劃。':typeof detail==='string'?detail:'規劃資料暫時無法讀寫，請重試。');}return res.json();}
 function sync(){panel.querySelectorAll('button,select,input,textarea').forEach(el=>el.disabled=waiting);const apply=panel.querySelector('[data-plan-action=apply]');if(apply)apply.disabled=waiting||!api.isReady()||api.isDirty()||active?.pending||active?.applied;form.querySelector('button[type=submit]').disabled=waiting||active?.pending||active?.applied;}
 function render(){
  select.innerHTML='<option value="">新規劃</option>'+sessions.map(s=>`<option value="${e(s.id)}">${e(s.name)}${s.pending?'（等待 ChatGPT）':s.applied?'（已加入）':''}</option>`).join('');select.value=active?.id||'';
  history.innerHTML=active?.messages?.map(m=>`<article class="g-plan-message ${m.role==='user'?'is-user':''}"><b>${m.role==='user'?'你':'ChatGPT'}</b><p>${e(m.text)}</p>${(m.attachments||[]).map(a=>`<span class="g-plan-attachment">${e(a.name)}${a.truncated?'（內容已截短）':''}</span>`).join('')}</article>`).join('')||'<p class="g-note">可先描述專案目標，或加入附件。</p>';
  form.hidden=!!active?.pending||!!active?.applied;
  const proposal=active?.proposal;panel.querySelector('.g-plan-proposal').innerHTML=proposal?`<div class="g-proposal-card"><b>${e(proposal.items.find(r=>r.kind==='project')?.name||'規劃草案')}</b><p class="g-note">${proposal.items.length} 個項目 · ${proposal.items.filter(r=>r.kind==='checkpoint').length} 個查核點</p><button class="hy-btn" data-plan-action="preview">預覽草案</button><button class="hy-btn is-primary" data-plan-action="apply">${active.applied?'已加入總表':'確認加入總表'}</button>${api.isDirty()?'<p class="g-note">請先儲存總表，再套用草案。</p>':''}</div>`:'';
  panel.querySelector('.g-plan-handoff').hidden=!active?.pending;
  panel.querySelector('.g-plan-handoff textarea').value=active?`請處理我的 950157 甘特圖規劃。使用 gantt_planning_read 讀取 session_id=${active.id}，逐一讀取附件，依對話規劃一個新專案；用目前 ChatGPT 分析，不使用模型 API。以 gantt_planning_respond 回傳完整草案與待確認假設，讓我回網站確認套用。`:'';
  history.scrollTop=history.scrollHeight;sync();
 }
 async function refresh(){if(waiting)return;waiting=true;sync();try{const list=await request(base);sessions=list.sessions||[];if(active)active=await request(base+'/'+active.id);say(active?.pending?'尚待 ChatGPT 處理，請複製接力訊息。':'');initialized=true;render();}catch(err){say(err.message,true);}finally{waiting=false;sync();}}
 select.addEventListener('change',async()=>{if(!select.value){active=null;draftSessionId=crypto.randomUUID();clientId=crypto.randomUUID();render();return;}waiting=true;sync();try{active=await request(base+'/'+select.value);say('');render();}catch(err){say(err.message,true);}finally{waiting=false;sync();}});
 fileInput.addEventListener('change',()=>{panel.querySelector('.g-plan-files').textContent=[...fileInput.files].map(f=>f.name).join('、');clientId=crypto.randomUUID();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(waiting)return;const files=[...fileInput.files],text=form.elements.message.value.trim();if(!files.length&&!text){say('請輸入需求或加入附件。',true);return;}
  if(files.length>5||files.reduce((n,f)=>n+f.size,0)>8*1024*1024-16000){say('每次最多 5 個附件，合計上限 8MB。',true);return;}
  const body=new FormData();body.append('client_id',clientId);body.append('session_id',active?.id||draftSessionId);body.append('message',text);files.forEach(f=>body.append('file',f));
  waiting=true;sync();say('正在儲存規劃需求與附件…');
  try{active=await request(base,{method:'POST',headers:{Authorization:window.HEADERS.Authorization},body});clientId=crypto.randomUUID();form.reset();panel.querySelector('.g-plan-files').textContent='';sessions=[{id:active.id,name:active.name,pending:active.pending},...sessions.filter(s=>s.id!==active.id)];say(active.warning||'需求已備妥，請複製接力訊息到 ChatGPT 處理。',!!active.warning);render();}catch(err){say(err.message,true);}finally{waiting=false;sync();}
 });
 panel.addEventListener('click',async event=>{
  const action=event.target.closest('[data-plan-action]')?.dataset.planAction;if(!action||waiting)return;
  if(action==='new'){if((form.elements.message.value||fileInput.files.length)&&!confirm('另開規劃會清除尚未送出的文字與附件，確定繼續？'))return;active=null;draftSessionId=crypto.randomUUID();clientId=crypto.randomUUID();form.reset();panel.querySelector('.g-plan-files').textContent='';say('');render();}
  if(action==='refresh')refresh();
  if(action==='copy'){const text=panel.querySelector('.g-plan-handoff textarea');try{await navigator.clipboard.writeText(text.value);say('已複製，請貼到 ChatGPT。');}catch{text.focus();text.select();say('請複製已選取的接力訊息。');}}
  if(action==='preview'&&active?.proposal)preview(active.proposal);
  if(action==='apply'&&active?.proposal){if(!api.isReady()||api.isDirty())return;if(!confirm('將這份 AI 草案新增為一個主專案？既有專案不會被取代。'))return;waiting=true;sync();say('正在加入總表…');try{const result=await request(base+'/'+active.id+'/apply',{method:'POST',headers:window.HEADERS,body:JSON.stringify({revision:api.getDoc().revision,planning_revision:active.revision})});active=result.session;api.setDoc(result.schedule);say(result.warning||'草案已加入，可直接微調總表。',!!result.warning);render();}catch(err){say(err.message,true);}finally{waiting=false;sync();}}
 });
 const dialog=document.createElement('dialog');dialog.className='g-dialog g-proposal-dialog';root.append(dialog);
 function preview(proposal){dialog.innerHTML=`<div class="g-form"><h2>AI 規劃草案</h2><p class="g-note">尚未加入總表，請先確認內容與推定條件。</p>${proposal.assumptions?.length?'<div class="g-assumptions"><b>待你確認</b><ul>'+proposal.assumptions.map(s=>'<li>'+e(s)+'</li>').join('')+'</ul></div>':''}<div class="g-proposal-table"><table><thead><tr><th>工作項目</th><th>父層</th><th>負責人</th><th>日期</th></tr></thead><tbody>${proposal.items.map(r=>`<tr><td>${e(r.name)}</td><td>${e(proposal.items.find(p=>p.id===r.parent_id)?.name||'主專案')}</td><td>${e(r.owner||'待補')}</td><td>${e(r.date||[r.start,r.end].filter(Boolean).join(' ～ ')||'依子項計算')}</td></tr>`).join('')}</tbody></table></div><footer><button class="hy-btn" type="button">關閉預覽</button></footer></div>`;dialog.querySelector('button').onclick=()=>dialog.close();dialog.showModal();}
 document.querySelector('[data-tab=gantt]').addEventListener('click',()=>{if(!initialized)refresh();});
 if(document.querySelector('#tab-gantt').classList.contains('active'))refresh();
 render();return {sync};
}
