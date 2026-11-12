// Bot Office 首頁：待決核示在專案卡片上，不另設「待你處理」。隔離假 API，不打真的後端。
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium:pw}=require('playwright');
const out=path.resolve(process.env.OFFICE_HOME_QA_DIR||'docs/quality/ui/office-home');fs.mkdirSync(out,{recursive:true});
const fontDir=path.dirname(require.resolve('@fontsource/noto-sans-tc/package.json'));
const font=fs.readFileSync(path.join(fontDir,'400.css'),'utf8').replace(/url\(([^)]+)\)/g,(_,u)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir,u.replace(/["']/g,''))).toString('base64')})`);
const base=process.env.OFFICE_QA_BASE_URL||'http://127.0.0.1:5173';
const now='2026-11-12T00:38:00+00:00';
const mkState=()=>({updated:now,islands:[{id:'side',name:'副業'}],
 buildings:[
  {id:'p-clean',title:'包裝修訂',island:'side',stage:'assigned',owner_bot:'hy',goal:'沒有待決的包裝調整',revision:1},
  {id:'p-002',title:'川泱購物（PI 流程重跑）',island:'side',stage:'running',owner_bot:'sam',goal:'用 d-003 已確認的條件準備一間小規模嚴選店，第一年驗證流程',executor:'grok-build',revision:3,milestones:[{id:'M4',name:'點閱',step:'running',due:'2026-11-12'}]},
 ],
 decisions:[
  {id:'d-old',project:'p-002',status:'answered',kind:'intake',authority:'owner_only',title:'銀角合作商家申請通過了嗎？',questions:[{no:1,q:'銀角合作商家申請通過了嗎？',answer:'還沒開通',answer_source:'hy'}]},
  {id:'d-proj',project:'p-002',status:'open',kind:'intake',authority:'owner_only',revision:0,created_by:'sam',owner_bot:'sam',title:'M4 延後到銀角開通後，新日期定哪天？',questions:[{no:1,q:'M4 延後到銀角開通後，新日期定哪天？',options:['11/26','12/3']}]},
  {id:'d-item',project:null,status:'closed',kind:'intake',authority:'owner_only',revision:2,created_by:'hy',owner_bot:'hy',category:'suggestion',source:'晨會',light:true,title:'週六 06:00 記帳時段一起整理每月收支與負債清單？',questions:[{no:1,q:'週六 06:00 記帳時段一起整理每月收支與負債清單？',answer:'核准'}]},
  {id:'d-open-light',project:null,status:'open',kind:'intake',authority:'owner_only',light:true,title:'未掛專案的舊卡不該出現',owner_bot:'hy',questions:[{no:1,q:'這張不該在列表'}]},
 ],logs:[],requests:[],figures:[]});
(async()=>{const results=[];
for(const spec of [{name:'1440',width:1440,height:900},{name:'390',width:390,height:844}]){
 const state=mkState();const writes=[];const errors=[];
 const browser=await pw.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}:{})});
 const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1});
 await context.addInitScript(()=>{if(window.top!==window.self)return;sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:'hy'}))+'.test')});
 await context.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());const headers={'Content-Type':'application/json','X-Brain-Updated':state.updated};let data={},status=200;
  if(req.method()!=='GET'){writes.push([u.pathname,req.method()]);status=404}
  else if(u.pathname==='/api/office/state')data=state;else if(u.pathname==='/api/office/index')data={updated:now,cards:[]};
  else if(u.pathname==='/api/950157-progress')data={projects:[{id:'APB',name:'A+ BP',office_project_id:'p-002',milestones:[{id:'m1',title:'展開甘特圖',due:'2026/11/11'}]}]};
  else if(u.pathname==='/api/personal-progress')data={projects:[]};
  else if(u.pathname==='/api/family-progress'||u.pathname==='/api/sam-progress')data={_kanban:{projects:[]}};
  else if(u.pathname.includes('dispatch-sessions'))data=[];
  await route.fulfill({status,headers,body:JSON.stringify(data)})});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/#/inbox');
 await page.addStyleTag({content:font+' body{font-family:"Noto Sans TC",sans-serif}'});
 await page.evaluate(()=>document.fonts.ready);
 assert(page.url().includes('#/bot-office'),'/inbox redirects to Bot Office');
 await page.getByRole('heading',{name:'Bot Office',exact:true}).waitFor();
 assert.equal(await page.locator('#office-inbox').count(),0);
 assert.equal(await page.getByRole('heading',{name:'待你處理',exact:true}).count(),0);
 assert.equal(await page.getByText('週六 06:00 記帳時段').count(),0);
 assert.equal(await page.getByText('未掛專案的舊卡不該出現').count(),0);
 assert.equal(await page.getByText('小案',{exact:true}).count(),0);
 assert.equal(await page.getByText('專案歸屬').count(),0);
 const lines=page.locator('.ao-project-line');
 await lines.first().waitFor();
 assert.equal(await lines.count(),2);
 assert.match(await lines.nth(0).innerText(),/川泱購物/);
 assert.match(await lines.nth(0).innerText(),/待你核示 1 則/);
 assert.doesNotMatch(await lines.nth(1).innerText(),/待你核示/);
 const filters=await page.evaluate(()=>{
  const bots=document.querySelector('[aria-label="負責 Bot"]').getBoundingClientRect();
  const stages=document.querySelector('[aria-label="屬性"]').getBoundingClientRect();
  const list=document.querySelector('.ao-home-projects').getBoundingClientRect();
  return {bots:bots.bottom,stages:stages.bottom,list:list.top};
 });
 assert(filters.bots<filters.list && filters.stages<filters.list,'filters sit above the project list');
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+spec.name);
 await page.screenshot({path:`${out}/${spec.name}-home.png`,fullPage:false});
 if(spec.width<=400){
  await page.locator('.ao-home-projects').evaluate(el=>{const scroller=el.closest('.app-main');if(scroller)scroller.scrollTop=scroller.scrollHeight});
  await page.screenshot({path:`${out}/${spec.name}-home-cards.png`,fullPage:false});
 }
 await page.getByRole('button',{name:'Sam',exact:true}).click();
 assert.equal(await lines.count(),1);
 assert.match(await lines.first().innerText(),/川泱購物/);
 await page.getByRole('button',{name:'HY',exact:true}).click();
 assert.equal(await lines.count(),1);
 assert.match(await lines.first().innerText(),/包裝修訂/);
 await page.getByRole('group',{name:'負責 Bot'}).getByRole('button',{name:'全部',exact:true}).click();
 await page.getByRole('group',{name:'屬性'}).getByRole('button',{name:'執行中',exact:true}).click();
 assert.equal(await lines.count(),1);
 assert.match(await lines.first().innerText(),/川泱購物/);
 await page.getByRole('group',{name:'屬性'}).getByRole('button',{name:'全部',exact:true}).click();
 assert.equal(await lines.count(),2);
 await page.getByRole('button',{name:'待你核示 1 則',exact:true}).click();
 await page.getByRole('heading',{name:'川泱購物（PI 流程重跑）',level:1}).waitFor();
 await page.getByRole('navigation',{name:'Bot Office 專案分頁'}).getByRole('button',{name:/會議室/}).waitFor();
 assert.equal(await page.getByRole('navigation',{name:'Bot Office 專案分頁'}).getByRole('button',{name:/會議室/}).getAttribute('aria-current'),'page');
 await page.getByRole('heading',{name:'M4 延後到銀角開通後，新日期定哪天？',exact:true}).waitFor();
 assert.equal(await page.getByText('未掛專案的舊卡不該出現').count(),0);
 const nav=page.getByRole('navigation',{name:'Bot Office 專案分頁'});
 await nav.getByRole('button',{name:'報告',exact:true}).click();
 const reportTodos=page.getByLabel('看板待辦',{exact:true});
 await reportTodos.waitFor();
 await reportTodos.getByText('展開甘特圖').waitFor();
 assert.equal(await page.getByRole('heading',{name:'川泱購物（PI 流程重跑）'}).count(),1);
 await page.screenshot({path:`${out}/${spec.name}-project-kanban.png`,fullPage:true});
 await nav.getByRole('button',{name:'日誌',exact:true}).click();
 const logTodos=page.getByLabel('看板待辦（日誌）');
 await logTodos.waitFor();
 await logTodos.getByText('展開甘特圖').waitFor();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'project overflow '+spec.name);
 assert.deepEqual(writes,[]);
 assert.deepEqual(errors,[]);
 results.push({scenario:spec.name,writes:writes.length});await browser.close();
}
console.log('Office home UI passed',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
