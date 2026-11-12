// Bot Office 首頁單一列表（以專案為主，Inbox 併入）與小案會議室。隔離的假 API，不打真的後端；寫入只回假資料。
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium:pw}=require('playwright');
const out=path.resolve(process.env.OFFICE_INBOX_QA_DIR||'docs/quality/ui/office-inbox');fs.mkdirSync(out,{recursive:true});
const base=process.env.OFFICE_QA_BASE_URL||'http://127.0.0.1:5173';
const now='2026-11-12T00:30:00+00:00';
const mkState=()=>({updated:now,islands:[{id:'side',name:'副業'}],
 buildings:[{id:'p-002',title:'川泱購物（PI 流程重跑）',island:'side',stage:'running',owner_bot:'sam',executor:'grok-build',revision:3,milestones:[{id:'M4',name:'點閱',step:'running',due:'2026-11-12'}]}],
 decisions:[
  {id:'d-old',project:'p-002',status:'answered',kind:'intake',authority:'owner_only',title:'銀角合作商家申請通過了嗎？',questions:[{no:1,q:'銀角合作商家申請通過了嗎？',answer:'還沒開通',answer_source:'hy'}]},
  {id:'d-proj',project:'p-002',status:'open',kind:'intake',authority:'owner_only',revision:0,created_by:'sam',owner_bot:'sam',title:'M4 延後到銀角開通後，新日期定哪天？',questions:[{no:1,q:'M4 延後到銀角開通後，新日期定哪天？',options:['11/26','12/3']}]},
  {id:'d-item',project:null,status:'open',kind:'intake',authority:'owner_only',revision:0,created_by:'hy',owner_bot:'hy',category:'suggestion',source:'晨會',source_ref:'2026-11-12 HY 晨會',light:true,deadline:'2026-11-14',asked_at:now,
   title:'週六 06:00 記帳時段一起整理每月收支與負債清單？',suggestion:'不加新時段，拿到就能打出財務維第一個分數',options:['核准','不核准'],questions:[{no:1,q:'週六 06:00 記帳時段一起整理每月收支與負債清單？',options:['核准','不核准'],recommend:'核准'}]},
  {id:'d-rep',project:null,status:'open',kind:'intake',authority:'owner_only',revision:0,created_by:'family',owner_bot:'family',category:'report',source:'小案',light:true,asked_at:now,title:'與 EVA 獨處時間已排 11/14 晚上',options:['知道了'],questions:[{no:1,q:'與 EVA 獨處時間已排 11/14 晚上',options:['知道了']}]},
 ],logs:[{id:'log-1',project:null,card_id:'d-item',action:'create_decision',at:now,note:'HY Bot: 開小案卡 d-item「週六 06:00 記帳時段…」'}],requests:[],figures:[]});
const tz=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(d);
const today=tz(new Date()),past=tz(new Date(Date.now()-3*864e5));
const progress={projects:[{name:'財務',milestones:[{title:'和潤 32,500',due:past},{title:'今天要繳的帳',due:today}]}]};
(async()=>{const results=[];
for(const spec of [{name:'1440',width:1440,height:900},{name:'390',width:390,height:844}]){
 const state=mkState();const writes=[];const errors=[];
 const browser=await pw.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}:{})});
 const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1});
 await context.addInitScript(()=>{if(window.top!==window.self)return;sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:'hy'}))+'.test')});
 await context.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());const headers={'Content-Type':'application/json','X-Brain-Updated':state.updated};let data={},status=200;
  if(req.method()==='POST'){writes.push([u.pathname,req.postDataJSON()]);
   const m=u.pathname.match(/decisions\/([^/]+)\/answer$/),c=u.pathname.match(/items\/([^/]+)\/close$/);
   if(m){const d=state.decisions.find(x=>x.id===decodeURIComponent(m[1]));const body=req.postDataJSON();d.questions[0].answer=body.answer;d.questions[0].answer_source='hy';d.status='answered';d.revision++;data={decision:d,updated:state.updated}}
   else if(c){const d=state.decisions.find(x=>x.id===decodeURIComponent(c[1]));d.status='closed';d.revision++;data={decision:d,updated:state.updated}}
   else status=404;
  } else if(u.pathname==='/api/office/state')data=state;else if(u.pathname==='/api/office/index')data={updated:now,cards:[]};
  else if(u.pathname==='/api/personal-progress')data=progress;else if(u.pathname.includes('dispatch-sessions'))data=[];
  await route.fulfill({status,headers,body:JSON.stringify(data)})});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/inbox');
 const list=page.getByLabel('專案列表');await list.waitFor();
 assert(page.url().includes('#/bot-office'),'/inbox redirects to Bot Office');
 assert.equal(await page.locator('#office-inbox').count(),0,'no separate 待你處理 block');
 await list.getByText('週六 06:00 記帳時段').waitFor();
 await list.getByText('HY：問題與待辦').waitFor();
 // 同一列表：專案（有待決）、兩張小案、HY 的問題與待辦；有待決的排前面
 const rows=await list.locator(':scope > [data-row]').evaluateAll(els=>els.map(e=>e.dataset.row+':'+e.innerText.split('\n')[0]));
 assert.equal(rows.length,4,JSON.stringify(rows));
 assert(rows.some(r=>r.startsWith('project:川泱購物')),'project row');
 const proj=list.locator('[data-row="project"]').filter({hasText:'川泱購物'});
 assert((await proj.innerText()).includes('最急：M4 延後到銀角開通後'),'most urgent on project');
 assert((await proj.innerText()).includes('1 項待你處理'));
 assert.equal(await list.getByText('銀角合作商家申請通過了嗎？').count(),0,'answered card hidden');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+spec.name);
 await page.screenshot({path:`${out}/${spec.name}-list.png`,fullPage:true});
 // 問題與待辦：展開看過期與今日
 await list.getByRole('button').filter({hasText:'HY：問題與待辦'}).click();
 await list.locator('.oi-group-list').getByText('和潤 32,500').waitFor();await list.locator('.oi-group-list').getByText('今天要繳的帳').waitFor();
 await page.screenshot({path:`${out}/${spec.name}-group-open.png`,fullPage:true});
 // 篩選作用於整個列表：負責 Sam → 只剩川泱；屬性 建議 → 只剩晨會小案
 await page.getByRole('group',{name:'依負責 Bot 篩選'}).getByRole('button').filter({hasText:'Sam'}).click();
 assert.deepEqual(await list.locator(':scope > [data-row]').evaluateAll(els=>els.map(e=>e.dataset.row)),['project']);
 await page.getByRole('group',{name:'依負責 Bot 篩選'}).getByRole('button',{name:/^全部/}).click();
 await page.getByRole('group',{name:'依屬性篩選'}).getByRole('button').filter({hasText:'建議'}).click();
 assert.deepEqual(await list.locator(':scope > [data-row]').evaluateAll(els=>els.map(e=>e.dataset.row)),['item']);
 await page.screenshot({path:`${out}/${spec.name}-filter-suggestion.png`,fullPage:true});
 // 小案：點進去是小案頁，直接核准、結案
 await list.locator('[data-row="item"]').click();
 await page.getByRole('heading',{name:'週六 06:00 記帳時段一起整理每月收支與負債清單？',level:1}).waitFor();
 await page.getByRole('navigation',{name:'小案分頁'}).waitFor();
 await page.screenshot({path:`${out}/${spec.name}-item-meeting.png`,fullPage:true});
 await page.getByLabel('第 1 題選項').getByRole('button',{name:'核准',exact:true}).click();
 await page.getByRole('button',{name:'送出回答'}).click();
 await page.getByText('已回覆・等負責 Bot 結案').waitFor();
 const answer=writes.find(([p])=>p.endsWith('/decisions/d-item/answer'));assert(answer&&answer[1].answer==='核准'&&answer[1].expected_revision===0,'answer posted');
 await page.getByRole('button',{name:'結案',exact:true}).click();
 await list.waitFor();
 const close=writes.find(([p])=>p.endsWith('/items/d-item/close'));assert(close&&close[1].answered_by==='hy'&&close[1].expected_revision===1,'close posted');
 // 篩選留在「建議」：小案結掉後列表沒有項目
 await page.getByRole('group',{name:'依屬性篩選'}).getByRole('button',{name:/^全部/}).click();
 assert.equal(await list.getByText('週六 06:00 記帳時段').count(),0);
 // 有待決的專案：點進去是會議室
 await list.locator('[data-row="project"]').filter({hasText:'川泱購物'}).click();
 await page.getByRole('heading',{name:'川泱購物（PI 流程重跑）',level:1}).waitFor();
 assert.equal(await page.getByRole('navigation',{name:'Bot Office 專案分頁'}).getByRole('button',{name:/會議室/}).getAttribute('aria-current'),'page');
 assert.deepEqual(errors,[]);
 results.push({scenario:spec.name,writes:writes.map(([p])=>p)});await browser.close();
}
console.log('Office unified list UI passed',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
