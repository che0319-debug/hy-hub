const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const path=require('node:path');const fontDir=process.env.ROUTER_FONT_DIR||path.dirname(require.resolve('@fontsource/noto-sans-tc/400.css'));const fontCss=fs.readFileSync(path.join(fontDir,'400.css'),'utf8').replaceAll('./files/','/__router-fonts/')+'\nbody,.font-sans{font-family:"Noto Sans TC",system-ui,sans-serif!important}';
 const logic=await import('../src/lib/router.mjs');
 const original=JSON.parse(fs.readFileSync('tests/fixtures/router-view.json'));
 const project=JSON.parse(fs.readFileSync('tests/fixtures/router-project.json'));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
 const page=await browser.newPage({timezoneId:'UTC'});const errors=[],writes=[],reads=[];
 let view,mode='normal',acceptDialog=true;
 const reset=()=>{view=structuredClone(original);mode='normal';writes.length=0;reads.length=0};reset();
 await page.addInitScript(css=>{if(location.origin!=='http://127.0.0.1:5173')return;document.addEventListener('DOMContentLoaded',()=>{const style=document.createElement('style');style.textContent=css;document.head.append(style)})},fontCss);
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>acceptDialog?d.accept():d.dismiss());
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
  }else if(p==='/api/ai-work-packages/router/control'){
   const b=req.postDataJSON();assert.equal(b.confirmed,true);assert.equal(b.expected_revision,view.control.revision);view.control={revision:view.control.revision+1,mode:b.mode,pilot_project_id:b.pilot_project_id};view.as_of+=1;data=view.control;
  }else if(p==='/api/ai-work-packages/router/preview'){
   const body=req.postDataJSON();const type=logic.normalize(body.package_type);const role=logic.roleOf(type);const candidates=body.document.rules;
   const found=[['project',body.project_id,type],['project',body.project_id,role],['project',body.project_id,'*'],['owner','sam',type],['owner','sam',role],['owner','sam','*'],['global','',type],['global','',role]].map(([s,id,k])=>candidates.find(r=>r.scope===s&&r.scope_id===id&&r.selector===k)).find(Boolean);
   data={route:found?.route||logic.defaultRoute(role,'sam',original.role_defaults),source:found?`${found.scope}:${found.scope_id}:${found.selector}`:'builtin:'+role};
  }else if(p==='/api/ai-office/projects')data=[project];
  else if(p==='/api/ai-office/projects/p')data=project;
  else if(p==='/api/ai-office/actions'||p.endsWith('/inbox')||p.endsWith('/dispatch-sessions'))data=[];
  else if(p.endsWith('/experts/registry'))data={experts:[],skills:[],actions:[]};
  else if(p.endsWith('/summary'))data={all:1,openTotal:0,openProjects:1,running:1,waiting:2,completed:0};
  else if(p.endsWith('/capacity'))data={used_bytes:100,limit_bytes:900000,percent:0,warn:false,full:false};
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });

 fs.mkdirSync('docs/quality/ui/router',{recursive:true});
 const global=async()=>{await page.goto('about:blank');await page.goto('http://127.0.0.1:5173/#/expert-team?tab=models');await page.getByRole('heading',{name:'AI 派工',exact:true}).waitFor()};
 const row=role=>page.locator('.rt-simple-route').filter({has:page.locator('b').filter({hasText:new RegExp('^'+role+'$')})});
 const save=()=>page.getByRole('button',{name:'儲存設定',exact:true});
 for(const width of [1280,390]){
  reset();await page.setViewportSize({width,height:900});await global();
  assert.equal(writes.length,0);assert(await save().isDisabled());
  for(const name of ['派工方式與緊急停用','工作包路由','健康門檻與冷卻'])assert.equal(await page.getByText(name,{exact:true}).count(),0);
  assert.equal(await page.getByLabel('主端模型',{exact:true}).count(),0);
  assert.equal(await page.locator('.rt-simple-route select').count(),8);
  assert.equal(await page.getByLabel('套用範圍',{exact:true}).count(),0,'global Router is global-only');
  for(const aiName of ['GPT','Claude','Grok']){const card=page.locator('.rt-connections>div').filter({has:page.locator('b').filter({hasText:new RegExp('^'+aiName+'$')})});assert.equal(await card.count(),1);assert.match(await card.innerText(),/最近巡檢：/);assert.match(await card.innerText(),/最近領包：/)}
  assert.equal(await page.getByText('PI 審查',{exact:true}).count(),0);for(const select of await page.locator('.rt-simple-route select').all())assert.deepEqual(await select.locator('option').allTextContents(),['無','GPT','Claude','Grok']);
  const aiLabels=await page.locator('.rt-simple-route option:not([disabled])').allTextContents();
  assert(aiLabels.every(x=>['GPT','Claude','Grok','無'].includes(x)),JSON.stringify(aiLabels));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow');
  for(const name of ['PI 規劃','一般執行專家','程式工程師','審查']){
   assert.equal(await page.getByLabel(name+'主力',{exact:true}).inputValue(),name==='審查'?'claude':'gpt');
   assert.equal(await page.getByLabel(name+'備案',{exact:true}).inputValue(),name==='審查'?'grok':'claude');
  }
  if(width===1280){
   const select=await page.getByLabel('一般執行專家備案',{exact:true}).boundingBox();
   const restore=await row('一般執行專家').getByRole('button',{name:'恢復預設',exact:true}).boundingBox();
   assert(select.width<=180,'compact dropdown width');
   assert(Math.abs(select.y+select.height-restore.y-restore.height)<2,'restore stays on the same desktop row');
   assert((await row('一般執行專家').boundingBox()).height<115,'no extra button row');
  }
  await page.screenshot({path:'docs/quality/ui/router/simple-'+width+'.png',fullPage:true});
  await page.getByLabel('一般執行專家備案',{exact:true}).selectOption('claude');
  assert.equal(writes.length,0,'draft only');await save().click();
  await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();
  assert.equal(writes.filter(x=>x.method==='PUT').length,1);
  assert.deepEqual(view.packages,original.packages);
  const changed=view.policy.document.rules.find(r=>r.selector==='GENERAL').route;
  assert.deepEqual(changed.fallbacks,['claude-worker']);assert.equal(changed.models['gpt-chat'],'session-default');
  assert.equal(changed.health.unclaimed_threshold,3);assert.equal(changed.health.auto_reassign_enabled,true);
  reset();await global();await page.getByLabel('審查備案',{exact:true}).selectOption('');await page.getByLabel('審查主力',{exact:true}).selectOption('gpt');await save().click();
  await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();
  assert.deepEqual(view.policy.document.rules.find(r=>r.selector==='REVIEW').route.fallbacks,[]);
  // Unrelated custom rules and their models/health remain untouched.
  assert.deepEqual(view.policy.document.rules.find(r=>r.selector==='GENERAL'),original.policy.document.rules[0]);
  reset();await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.locator('.ao-project-line').click();
  const nav=page.getByRole('navigation',{name:'AI Office 專案分頁'});
  await page.getByText('AI 執行配置',{exact:true}).waitFor();
  await page.getByRole('heading',{name:'此專案主力與備案',exact:true}).waitFor();
  assert.equal(await page.getByLabel('套用範圍',{exact:true}).count(),0,'project scope is fixed by project page');
  await page.getByLabel('審查備案',{exact:true}).selectOption('');await page.getByLabel('審查主力',{exact:true}).selectOption('gpt');
  await nav.getByRole('button',{name:'工作日誌'}).click();await page.getByText('冷卻、恢復與備援改派紀錄',{exact:true}).click();await page.getByRole('heading',{name:'路由工作紀錄',exact:true}).waitFor();
  await nav.getByRole('button',{name:'概況'}).click();await page.getByText('有未儲存修改',{exact:true}).waitFor();
  await save().click();await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();
  const projectRule=view.policy.document.rules.find(r=>r.scope==='project'&&r.scope_id==='p'&&r.selector==='REVIEW');
  assert.equal(projectRule.route.primary,'gpt-chat');assert.deepEqual(projectRule.route.fallbacks,[]);
  assert.deepEqual(view.packages,original.packages);
  await nav.getByRole('button',{name:'執行計畫'}).click();assert.equal(await page.getByText('AI 執行配置',{exact:true}).count(),0,'project Router is not duplicated in execution plan');
 }
 reset();await global();mode='conflict';await page.getByLabel('一般執行專家備案',{exact:true}).selectOption('claude');await save().click();await page.getByRole('alert').filter({hasText:'不會覆蓋新版'}).waitFor();assert(await save().isDisabled());
 await page.getByRole('button',{name:'重新讀取最新設定'}).click();await page.getByRole('heading',{name:'AI 派工',exact:true}).waitFor();
 reset();await global();await page.getByLabel('程式工程師主力',{exact:true}).selectOption('');await save().click();await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();assert.equal(view.policy.document.rules.find(r=>r.selector==='CODE').route.primary,'none');
 reset();await global();await row('一般執行專家').getByRole('button',{name:'恢復預設',exact:true}).click();await save().click();await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();assert.equal(await page.getByLabel('一般執行專家備案',{exact:true}).inputValue(),'claude');
 reset();await global();await page.getByLabel('一般執行專家主力',{exact:true}).selectOption('grok');await save().click();await page.getByText('已儲存，僅影響之後建立的新包。',{exact:true}).waitFor();assert.equal(view.policy.document.rules.find(r=>r.selector==='GENERAL').route.primary,'grok');
 reset();mode='readonly';await global();assert.equal(await save().count(),0);assert.equal(await page.locator('.rt-simple-route select:not([disabled])').count(),0);
 reset();mode='unready';await global();assert.equal(await page.locator('.rt-simple-route select').count(),8);for(const select of await page.locator('.rt-simple-route select').all())assert.deepEqual(await select.locator('option').allTextContents(),['無','GPT','Claude','Grok']);
 reset();view.runners.forEach(r=>r.execution_verified=false);await global();assert.equal(await page.locator('.rt-simple-route select').count(),8);for(const select of await page.locator('.rt-simple-route select').all())assert.deepEqual(await select.locator('option').allTextContents(),['無','GPT','Claude','Grok']);
 reset();mode='error';await page.goto('about:blank');await page.goto('http://127.0.0.1:5173/#/expert-team?tab=models');await page.getByRole('button',{name:'重試讀取路由'}).waitFor();mode='normal';await page.getByRole('button',{name:'重試讀取路由'}).click();await page.getByRole('heading',{name:'AI 派工',exact:true}).waitFor();
 assert.deepEqual(errors,[]);assert(writes.every(x=>x.path==='/api/ai-work-packages/router/policy'));
 await browser.close();console.log('Simplified Router UI: 1280/390, AI-only choices, real readiness, explicit save, frozen packages, inheritance, conflicts and errors passed');
})().catch(e=>{console.error(e);process.exit(1)});

