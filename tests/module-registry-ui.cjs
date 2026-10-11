const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync,readFileSync}=require('node:fs');
const modules=JSON.parse(readFileSync('tests/fixtures/module-registry.json','utf8'));
(async()=>{
 const browser=await chromium.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));let mode='ok';let decisions=[];
 await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.fixture'));
 await page.route('**/api/**',route=>{
  const url=route.request().url();let data={ok:true};
  if(url.endsWith('/module-registry'))return route.fulfill({status:mode==='ok'?200:404,contentType:'application/json',body:JSON.stringify(mode==='ok'?{modules}:{detail:'Not Found'})});
  if(url.endsWith('/dispatch-sessions'))data=[];
  if(url.endsWith('/projects'))data=[];
  if(url.includes('/inbox?') || url.endsWith('/api/ai-office/actions'))data=mode==='inbox'?[{action_id:'fixture-module-only',project_id:null,action_type:'MODULE_ACCEPTANCE',title:'模組正式驗收',question:'Fixture only',authority_mode:'OWNER_ONLY',status:'OPEN',approval_allowed:true,module_acceptance:modules.find(m=>m.module_id==='pi-engine')}]:[];
  if(url.endsWith('/inbox/fixture-module-only/resolve')){decisions.push(route.request().postDataJSON());mode='ok';data={resolved:true};}
  if(url.includes('pi/readiness'))data={skills:[],experts:[],ready:false};
  return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 mkdirSync('docs/quality/ui',{recursive:true});
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:900});mode='ok';
  await page.goto('http://127.0.0.1:5173/#/system-architecture');
  await page.getByRole('button',{name:'架構總覽',exact:true}).click();
  await page.getByText('18 個模組 · 0 個已正式驗收',{exact:true}).waitFor();
  assert.equal(await page.locator('.mr-tile').count(),18);
  assert.equal(await page.getByText('驗收：已正式驗收',{exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`docs/quality/ui/module-registry-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'PI Engine：查看模組詳情',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  await dialog.getByRole('heading',{name:'尚缺能力'}).waitFor();
  assert(await dialog.getByText('正式案例實戰驗收',{exact:true}).isVisible());
  assert(await dialog.getByText('尚未登錄正式驗收紀錄。程式與測試證據不等同正式驗收。',{exact:true}).isVisible());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`docs/quality/ui/module-detail-${width}.png`,fullPage:true});
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);
  mode='error';await page.getByRole('button',{name:'重新讀取',exact:true}).click();
  await page.getByRole('alert').waitFor();assert.equal(await page.locator('.mr-tile').count(),0);
  await page.screenshot({path:`docs/quality/ui/module-error-${width}.png`,fullPage:true});
  mode='ok';await page.getByRole('button',{name:'重試讀取',exact:true}).click();
  await page.getByText('18 個模組 · 0 個已正式驗收',{exact:true}).waitFor();
  await page.getByRole('button',{name:'引擎測試',exact:true}).click();
  await page.getByRole('checkbox').check();
  await page.getByText('尚無可用正式 PI Expert，請先於專家團完成 Skill 與 Expert 核准。').waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 mode='inbox';await page.goto('http://127.0.0.1:5173/#/ai-work-v5');
 await page.getByRole('heading',{name:'系統模組待你驗收'}).waitFor();
 await page.getByRole('button',{name:'核准模組驗收',exact:true}).click();
 await page.getByRole('heading',{name:'系統模組待你驗收'}).waitFor({state:'hidden'});
 assert.equal(decisions.length,1);assert.equal(decisions[0].answer.decision,'APPROVED');
 assert.deepEqual(errors,[]);await browser.close();console.log('Registry 390/1280: 18 modules, independent states, details, error clears cards, retry, PI Lab, no overflow or browser errors');
})().catch(e=>{console.error(e);process.exit(1)});
