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
  {id:'d-item',project:null,status:'closed',kind:'intake',authority:'owner_only',revision:2,created_by:'hy',owner_bot:'hy',category:'suggestion',source:'晨會',light:true,title:'週六 06:00 記帳時段一起整理每月收支與負債清單？',questions:[{no:1,q:'週六 06:00 記帳時段一起整理每月收支與負債清單？',answer:'核准'}]},
 ],logs:[],requests:[],figures:[]});
(async()=>{const results=[];
for(const spec of [{name:'1440',width:1440,height:900},{name:'390',width:390,height:844}]){
 const state=mkState();const writes=[];const errors=[];
 const browser=await pw.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}:{})});
 const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1});
 await context.addInitScript(()=>{if(window.top!==window.self)return;sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:'hy'}))+'.test')});
 await context.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());const headers={'Content-Type':'application/json','X-Brain-Updated':state.updated};let data={},status=200;
  if(req.method()==='POST'){writes.push([u.pathname,req.postDataJSON()]);
   const m=u.pathname.match(/decisions\/([^/]+)\/answer$/);
   if(m){const d=state.decisions.find(x=>x.id===decodeURIComponent(m[1]));const body=req.postDataJSON();d.questions[0].answer=body.answer;d.questions[0].answer_source='hy';d.status='answered';d.revision++;data={decision:d,updated:state.updated}}
   else status=404;
  } else if(u.pathname==='/api/office/state')data=state;else if(u.pathname==='/api/office/index')data={updated:now,cards:[]};
  else if(u.pathname==='/api/950157-progress')data={projects:[{id:'APB',name:'A+ BP',office_project_id:'p-002',milestones:[{id:'m1',title:'展開甘特圖',due:'2026/11/11'}]}]};
  else if(u.pathname==='/api/personal-progress')data={projects:[]};
  else if(u.pathname==='/api/family-progress'||u.pathname==='/api/sam-progress')data={_kanban:{projects:[]}};
  else if(u.pathname.includes('dispatch-sessions'))data=[];
  await route.fulfill({status,headers,body:JSON.stringify(data)})});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/inbox');
 const inbox=page.locator('#office-inbox');await inbox.waitFor();
 assert(page.url().includes('#/bot-office'),'/inbox redirects to Bot Office');
 // 舊小案卡與健康問題不進 Office 列表；有專案的核示仍在
 await page.getByRole('button').filter({hasText:'川泱購物'}).waitFor();
 assert.equal(await inbox.getByText('週六 06:00 記帳時段').count(),0);
 assert.equal(await page.getByText('小案',{exact:true}).count(),0);
 assert.equal(await inbox.getByText('銀角合作商家申請通過了嗎？').count(),0);
 assert.equal(await inbox.locator('.oi-row[data-kind="decide"]').count(),1);
 await inbox.getByText('M4 延後到銀角開通後').waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+spec.name);
 await page.screenshot({path:`${out}/${spec.name}-home-inbox.png`,fullPage:false});
 // 專案核示進會議室；關聯看板待辦出現在報告／日誌，不另開專案
 await inbox.getByRole('button',{name:'到會議室'}).click();
 await page.getByRole('heading',{name:'川泱購物（PI 流程重跑）',level:1}).waitFor();
 await page.getByRole('navigation',{name:'Bot Office 專案分頁'}).getByRole('button',{name:'報告'}).click();
 const reportTodos=page.getByLabel('看板待辦',{exact:true});
 await reportTodos.waitFor();
 await reportTodos.getByText('展開甘特圖').waitFor();
 assert.equal(await page.getByRole('heading',{name:'川泱購物（PI 流程重跑）'}).count(),1);
 await page.screenshot({path:`${out}/${spec.name}-project-kanban.png`,fullPage:true});
 await page.getByRole('navigation',{name:'Bot Office 專案分頁'}).getByRole('button',{name:'日誌'}).click();
 const logTodos=page.getByLabel('看板待辦（日誌）');
 await logTodos.waitFor();
 await logTodos.getByText('展開甘特圖').waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'project overflow '+spec.name);
 assert.deepEqual(errors,[]);
 results.push({scenario:spec.name,writes:writes.map(([p])=>p)});await browser.close();
}
console.log('Office inbox UI passed',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
