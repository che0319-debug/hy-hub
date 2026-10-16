const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const path=require('node:path');const fontDir=process.env.ROUTER_FONT_DIR||path.dirname(require.resolve('@fontsource/noto-sans-tc/400.css'));const fontCss=fs.readFileSync(path.join(fontDir,'400.css'),'utf8').replaceAll('./files/','/__router-fonts/')+'\nbody,.font-sans{font-family:"Noto Sans TC",system-ui,sans-serif!important}';
 const logic=await import('../src/lib/router.mjs');
 const original=JSON.parse(fs.readFileSync('tests/fixtures/router-view.json'));
 const project=JSON.parse(fs.readFileSync('tests/fixtures/router-project.json'));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 const page=await browser.newPage({timezoneId:'UTC'});const errors=[],writes=[],reads=[];
 let view,mode='normal';
 const reset=()=>{view=structuredClone(original);mode='normal';writes.length=0;reads.length=0};reset();
 await page.addInitScript(css=>{if(location.origin!=='http://127.0.0.1:5173')return;document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent=css;document.head.append(style)})},fontCss);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.addInitScript(()=>{if(location.origin!=='http://127.0.0.1:5173')return;sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.fixture');sessionStorage.setItem('hy_life_os_view','desktop')});
 await page.route('**/*',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname;
  if(url.origin!=='http://127.0.0.1:5173')return route.abort();
  if(p.startsWith('/__router-fonts/')){const filename=p.split('/').pop();return route.fulfill({contentType:'font/woff2',body:fs.readFileSync(path.join(fontDir,'files',filename))})}
  if(!p.startsWith('/api/'))return route.continue();
  const method=req.method();let data={};let status=200;
  if(p.startsWith('/api/ai-work-packages/router/'))assert(req.headers().authorization?.startsWith('Bearer '),'authenticated router request');
  if(method==='GET')reads.push(p+url.search);else writes.push({path:p,method,body:req.postDataJSON()});
  if(p.startsWith('/api/auth/'))data={ok:true,role:'owner'};
  else if(p==='/api/ai-work-packages/router/view'){
   if(mode==='error')return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"isolated unavailable"}'});
   if(mode==='missing')return route.fulfill({status:404,contentType:'application/json',body:'{}'});
   data={...view,can_edit:mode!=='readonly'};
   if(mode==='unready')data={...data,runners:data.runners.map(r=>({...r,ready:false}))};
  }else if(p==='/api/ai-work-packages/router/policy'){
   if(mode==='conflict')status=409;
   else {const body=req.postDataJSON();assert.equal(body.expected_revision,view.policy.revision);assert.deepEqual(Object.keys(body).sort(),['authority_ref','document','expected_revision','reason']);view.policy={...view.policy,revision:view.policy.revision+1,document:body.document};view.as_of+=1;data=view.policy;}
  }else if(p==='/api/ai-work-packages/router/preview'){
   const body=req.postDataJSON();const type=logic.normalize(body.package_type);const role=logic.roleOf(type);const candidates=body.document.rules;
   const found=[['project',body.project_id,type],['project',body.project_id,role],['project',body.project_id,'*'],['owner','sam',type],['owner','sam',role],['owner','sam','*'],['global','',type],['global','',role]].map(([s,id,k])=>candidates.find(r=>r.scope===s&&r.scope_id===id&&r.selector===k)).find(Boolean);
   data={route:found?.route||logic.defaultRoute(role,'sam'),source:found?`${found.scope}:${found.scope_id}:${found.selector}`:'builtin:'+role};
  }else if(p==='/api/ai-office/projects')data=[project];
  else if(p==='/api/ai-office/projects/p')data=project;
  else if(p==='/api/ai-office/actions'||p.endsWith('/inbox')||p.endsWith('/dispatch-sessions'))data=[];
  else if(p.endsWith('/experts/registry'))data={experts:[],skills:[],actions:[]};
  else if(p.endsWith('/summary'))data={all:1,openTotal:0,openProjects:1,running:1,waiting:2,completed:0};
  else if(p.endsWith('/capacity'))data={used_bytes:100,limit_bytes:900000,percent:0,warn:false,full:false};
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 fs.mkdirSync('docs/quality/ui/router',{recursive:true});
 const global=async()=>{await page.goto('about:blank');await page.goto('http://127.0.0.1:5173/#/expert-team?tab=models');await page.getByRole('heading',{name:'工作包路由',exact:true}).waitFor()};
 const shot=async options=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot(options)};
 const noOverflow=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,label+' overflow');
 const ruleRow=(role)=>page.locator('.rt-route').filter({has:page.locator('b').filter({hasText:new RegExp('^'+role+'$')})});
 const edit=async(role)=>{await ruleRow(role).getByRole('button',{name:/^(編輯|新增覆寫)$/}).click();return page.getByRole('form',{name:'編輯路由規則'})};
 for(const width of [1280,390]){
  reset();await page.setViewportSize({width,height:900});await global();
  await page.getByText('設定僅影響之後建立的新包。',{exact:true}).waitFor();
  assert.equal(writes.length,0);assert(reads.filter(p=>p.includes('/router/view')).length<=2,'one aggregate fetch per StrictMode mount, no package fanout');
  assert(!reads.some(p=>/\/router\/(tick|packages|events|policy)/.test(p)));
  assert.equal(await page.getByRole('button',{name:'儲存未來新包設定'}).isDisabled(),true);
  await shot({path:`docs/quality/ui/router/models-${width}.png`,fullPage:true});await noOverflow('global');
  const form=await edit('一般工作');await form.getByLabel('冷卻秒數',{exact:true}).fill('900');await form.getByLabel('最少執行樣本',{exact:true}).fill('3');await shot({path:`docs/quality/ui/router/thresholds-${width}.png`,fullPage:true});await noOverflow('threshold form');await form.getByRole('button',{name:'保留這列草稿'}).click();
  assert.equal(writes.length,0,'edits are draft only');
  await page.getByLabel('修改原因',{exact:true}).fill('隔離測試：調整新包冷卻');await page.getByLabel('授權或決策依據',{exact:true}).fill('fixture-owner-decision');
  const save=page.getByRole('button',{name:'儲存未來新包設定'});assert(await save.isDisabled());
  await page.getByLabel('我確認僅影響新包，現有專案與包不會被回寫或遷入。').check();await save.click();
  await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();
  assert.equal(writes.filter(x=>x.method==='PUT').length,1);assert.deepEqual(view.packages,original.packages);
  assert.equal(view.policy.document.rules[0].route.health.cooldown_seconds,900);
  await ruleRow('一般工作').getByRole('button',{name:'恢復繼承'}).click();assert.equal(writes.filter(x=>x.method==='PUT').length,1,'restore inheritance still needs explicit save');
  // Project entry is collapsed, lazy, and edited in the same current policy document.
  reset();await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.locator('.ao-project-line').click();
  await page.getByRole('navigation',{name:'AI Office 專案分頁'}).getByRole('button',{name:'執行計畫'}).click();
  assert.equal(reads.filter(p=>p.includes('/router/view')).length,0);
  await page.getByText('專案路由覆寫與繼承',{exact:true}).click();await page.getByRole('heading',{name:'工作包路由',exact:true}).waitFor();
  assert.equal(reads.filter(p=>p.includes('/router/view?project_id=p')).length,1);
  for(const role of ['規劃','一般工作','程式','交件外審','里程碑 PI 審核']){
   const f=await edit(role);
   if(role==='交件外審'){await f.getByLabel('主執行端',{exact:true}).selectOption('gpt-review-independent');await f.getByLabel('備援順序',{exact:true}).fill('')}
   await f.getByRole('button',{name:'保留這列草稿'}).click();
  }
  await page.getByText('預覽新包的繼承來源',{exact:true}).click();await page.getByLabel('預覽工作類型',{exact:true}).fill('QUALITY_REVIEW');await page.getByRole('button',{name:'預覽新包路由'}).click();await page.getByText(/來源：專案 p · 交件外審/).waitFor();
  assert.equal(writes.filter(x=>x.method==='PUT').length,0);assert.deepEqual(view.packages,original.packages);
  await shot({path:`docs/quality/ui/router/project-${width}.png`,fullPage:true});await noOverflow('project');
  // Draft survives switching to another existing project tab and back.
  const nav=page.getByRole('navigation',{name:'AI Office 專案分頁'});
  await nav.getByRole('button',{name:'工作日誌'}).click();await page.getByText('冷卻、恢復與備援改派紀錄',{exact:true}).click();await page.getByRole('heading',{name:'路由工作紀錄',exact:true}).waitFor();
  await page.locator('.rt-journal').getByText(/備援改派/).first().waitFor();await shot({path:`docs/quality/ui/router/log-${width}.png`,fullPage:true});await noOverflow('log');
  await nav.getByRole('button',{name:'執行計畫'}).click();await page.getByText('有未儲存修改',{exact:true}).waitFor();
  assert.equal(reads.filter(p=>p.includes('/router/view?project_id=p')).length,2,'one execution read + one journal read, no per-package requests');
  await page.getByLabel('修改原因',{exact:true}).fill('隔離專案全 GPT 覆寫');await page.getByLabel('授權或決策依據',{exact:true}).fill('fixture-only');await page.getByLabel('我確認僅影響新包，現有專案與包不會被回寫或遷入。').check();await page.getByRole('button',{name:'儲存未來新包設定'}).click();await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();
  const overrides=view.policy.document.rules.filter(r=>r.scope==='project');assert.equal(overrides.length,5);assert.equal(overrides.find(r=>r.selector==='REVIEW').route.primary,'gpt-review-independent');assert.deepEqual(overrides.find(r=>r.selector==='REVIEW').route.fallbacks,[]);assert.deepEqual(view.packages,original.packages);
 }
 reset();await global();mode='conflict';let f=await edit('一般工作');await f.getByLabel('冷卻秒數',{exact:true}).fill('800');await f.getByRole('button',{name:'保留這列草稿'}).click();await page.getByLabel('修改原因',{exact:true}).fill('fixture');await page.getByLabel('授權或決策依據',{exact:true}).fill('owner');await page.getByLabel('我確認僅影響新包，現有專案與包不會被回寫或遷入。').check();await page.getByRole('button',{name:'儲存未來新包設定'}).click();await page.getByRole('alert').filter({hasText:'不會覆蓋新版'}).waitFor();assert(await page.getByRole('button',{name:'儲存未來新包設定'}).isDisabled());assert.equal(view.policy.revision,original.policy.revision);
 await page.getByRole('button',{name:'重新讀取最新設定'}).click();await page.getByRole('heading',{name:'工作包路由',exact:true}).waitFor();
 reset();mode='readonly';await global();assert.equal(await page.getByRole('button',{name:'儲存未來新包設定'}).count(),0);assert.equal(await page.getByRole('button',{name:'新增覆寫',exact:true}).count(),0);
 reset();mode='error';await page.goto('http://127.0.0.1:5173/#/expert-team?tab=models');await page.reload();await page.getByRole('button',{name:'重試讀取路由'}).waitFor();assert.equal(await page.getByRole('heading',{name:'工作包路由',exact:true}).count(),0);mode='normal';await page.getByRole('button',{name:'重試讀取路由'}).click();await page.getByRole('heading',{name:'工作包路由',exact:true}).waitFor();
 reset();mode='missing';await page.reload();await page.getByRole('alert').filter({hasText:'路由服務尚未提供'}).waitFor();assert.equal(writes.length,0);
 assert.deepEqual(errors,[]);assert(writes.every(x=>['/api/ai-work-packages/router/policy','/api/ai-work-packages/router/preview'].includes(x.path)));await browser.close();console.log('Router UI 1280/390: drafts, explicit save, freeze, GPT overrides, preview, readonly, 409, errors, logs and no overflow passed');
})().catch(e=>{console.error(e);process.exit(1)});
