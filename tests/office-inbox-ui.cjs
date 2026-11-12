// Bot Office「待你處理」（Inbox 併入）與小案會議室。隔離的假 API，不打真的後端；寫入只回假資料。
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
  } else if(u.pathname==='/api/office/state')data=state;else if(u.pathname==='/api/office/index')data={updated:now,cards:[]};else if(u.pathname.includes('dispatch-sessions'))data=[];
  await route.fulfill({status,headers,body:JSON.stringify(data)})});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/inbox');
 const inbox=page.locator('#office-inbox');await inbox.waitFor();
 assert(page.url().includes('#/bot-office'),'/inbox redirects to Bot Office');
 await inbox.getByText('週六 06:00 記帳時段').waitFor();
 // 舊專案與既有卡照常：專案列在、已答的卡不在待你處理
 await page.getByRole('button').filter({hasText:'川泱購物'}).waitFor();
 assert.equal(await inbox.getByText('銀角合作商家申請通過了嗎？').count(),0);
 assert.equal(await inbox.locator('.oi-row[data-kind="decide"]').count(),3);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+spec.name);
 await page.screenshot({path:`${out}/${spec.name}-home-inbox.png`,fullPage:false});
 // 篩選：負責 Sam → 只剩專案卡；屬性 建議 → 只剩晨會小案
 await inbox.getByRole('group',{name:'依負責 Bot 篩選'}).getByRole('button').filter({hasText:'Sam'}).click();
 assert.equal(await inbox.locator('.oi-row[data-kind="decide"]').count(),1);
 await inbox.getByText('M4 延後到銀角開通後').waitFor();
 await inbox.getByRole('group',{name:'依負責 Bot 篩選'}).getByRole('button',{name:/^全部/}).click();
 await inbox.getByRole('group',{name:'依屬性篩選'}).getByRole('button').filter({hasText:'建議'}).click();
 assert.equal(await inbox.locator('.oi-row').count(),1);
 await inbox.screenshot({path:`${out}/${spec.name}-filter-suggestion.png`});
 // 小案會議室：直接核准
 await inbox.getByRole('button',{name:'到會議室'}).click();
 await page.getByRole('heading',{name:'週六 06:00 記帳時段一起整理每月收支與負債清單？',level:1}).waitFor();
 await page.getByRole('navigation',{name:'小案分頁'}).waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'item overflow '+spec.name);
 await page.screenshot({path:`${out}/${spec.name}-item-meeting.png`,fullPage:true});
 await page.getByRole('navigation',{name:'小案分頁'}).getByRole('button',{name:'報告'}).click();
 await page.getByText('小案不開專案').waitFor();
 await page.getByRole('navigation',{name:'小案分頁'}).getByRole('button',{name:/會議室/}).click();
 await page.getByRole('group',{name:'第 1 題選項'}).or(page.getByLabel('第 1 題選項')).getByRole('button',{name:'核准',exact:true}).click();
 await page.getByRole('button',{name:'送出回答'}).click();
 await page.getByText('已回覆・等負責 Bot 結案').waitFor();
 const answer=writes.find(([p])=>p.endsWith('/decisions/d-item/answer'));assert(answer&&answer[1].answer==='核准'&&answer[1].expected_revision===0,'answer posted');
 await page.getByRole('button',{name:'結案',exact:true}).click();
 await page.locator('#office-inbox').waitFor();
 const close=writes.find(([p])=>p.endsWith('/items/d-item/close'));assert(close&&close[1].answered_by==='hy'&&close[1].expected_revision===1,'close posted');
 assert.equal(await page.locator('#office-inbox').getByText('週六 06:00 記帳時段').count(),0);
 // 專案卡從待你處理直接進專案會議室
 await page.locator('#office-inbox').getByRole('button',{name:'到會議室'}).first().click();
 await page.getByRole('heading',{name:'川泱購物（PI 流程重跑）',level:1}).waitFor();
 assert.deepEqual(errors,[]);
 results.push({scenario:spec.name,writes:writes.map(([p])=>p)});await browser.close();
}
console.log('Office inbox UI passed',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
