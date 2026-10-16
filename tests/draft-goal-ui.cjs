// Every API is intercepted. No production reads or writes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
(async () => {
 const browser = await chromium.launch({headless:true,...(process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN,args:['--no-sandbox']} : {})});
 for (const width of [1280,390]) {
  const page = await browser.newPage({viewport:{width,height:1000}});
  page.setDefaultTimeout(5000);
  const errors=[], writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Date.now()/1000+3600}))+'.fixture'));
  const project={id:'draft-fixture',title:'草稿目標編輯驗證',goal:'原本的專案目標',description:'原本的說明',owner_bot:'sam',phase:'規劃期',plan_state:'DRAFT',status:'ai_pending',permissions:{delete:true},packages:[],actions:[],notes:[],suggestions:[],files:[],team:[],drive:{},report:{history:[]},quality:{checkpoints:[]}};
  let code=null, hold=null, goalReads=0;
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=req.url();let data={};
   if(req.method()!=='GET') {
    assert(url.endsWith('/api/ai-work-packages/projects/draft-fixture/goal'));
    assert.equal(req.method(),'PUT');writes.push(req.postDataJSON());
    if(hold)await hold;
    if(code)return route.fulfill({status:code==='ROLE_DENIED'?403:409,json:{detail:code}});
    Object.assign(project,req.postDataJSON());data={};
   } else if(url.endsWith('/api/ai-office/projects'))data=[project];
   else if(url.endsWith('/api/ai-office/actions'))data=[];
   else if(url.endsWith('/api/ai-office/projects/draft-fixture')){goalReads++;data=project;}
   return route.fulfill({json:data});
  });
  async function open(){await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.locator('.ao-project-line').click();await page.getByRole('button',{name:'編輯專案',exact:true}).click();}
  await open();
  const form=page.getByRole('form',{name:'編輯目標（草稿階段）'}), submit=form.getByRole('button',{name:'更新目標並重新規劃'});
  assert.equal(await form.getByLabel('專案目標',{exact:true}).inputValue(),project.goal);
  assert.equal(await form.getByLabel('專案說明（選填）').inputValue(),project.description);
  await form.getByLabel('專案目標',{exact:true}).fill('   ');assert(await submit.isDisabled());
  await form.getByLabel('專案目標',{exact:true}).fill('更新的目標\n涵蓋兩項成果');
  await form.getByLabel('專案說明（選填）').fill('');
  page.once('dialog',d=>{assert(d.message().includes('改目標會讓 AI 重新規劃、舊規劃存入歷史'));d.dismiss()});
  await submit.click();assert.equal(writes.length,0);
  page.on('dialog',d=>d.accept());
  for(const [error,message] of [['PLANNING_PACKAGE_BUSY','AI 正在規劃中，請稍後再試。'],['APPROVED_PLAN_REQUIRES_SPEC_CHANGE','規劃書已核准，請重新載入專案並使用正式規格變更。'],['ROLE_DENIED','只有 HY 本人可以編輯草稿目標，請確認登入身分。']]){
   code=error;await submit.click();await form.getByRole('alert').filter({hasText:message}).waitFor();
   assert.equal(await form.getByLabel('專案目標',{exact:true}).inputValue(),'更新的目標\n涵蓋兩項成果');
  }
  code=null;let release;hold=new Promise(r=>release=r);const before=goalReads;
  await submit.click();await form.getByRole('button',{name:'更新中…'}).waitFor();assert(await form.getByLabel('專案目標',{exact:true}).isDisabled());release();hold=null;
  await form.getByRole('status').filter({hasText:'已更新，規劃已重新排入'}).waitFor();
  await page.locator('.ao-goal').filter({hasText:'更新的目標'}).waitFor();assert(goalReads>before);
  assert.deepEqual(writes.at(-1),{goal:'更新的目標\n涵蓋兩項成果',description:''});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  mkdirSync('docs/quality/ui/draft-goal',{recursive:true});await page.screenshot({path:`docs/quality/ui/draft-goal/updated-${width}.png`,fullPage:true});
  project.permissions.delete=false;await page.reload();await page.locator('.ao-project-line').click();await page.getByRole('button',{name:'編輯專案',exact:true}).click();assert.equal(await form.count(),0);
  project.permissions.delete=true;project.plan_state='APPROVED';project.phase='執行期';project.milestone_id='M1';await page.reload();await page.locator('.ao-project-line').click();await page.getByRole('button',{name:'編輯專案',exact:true}).click();assert.equal(await form.count(),0);await page.getByText('修改範圍／目標',{exact:true}).waitFor();
  project.plan_state='OTHER';await page.reload();await page.locator('.ao-project-line').click();await page.getByRole('button',{name:'編輯專案',exact:true}).click();assert.equal(await form.count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('Draft goal UI 1280/390 passed: prefill, confirmation/cancel, busy, errors, PUT body, reload, owner/DRAFT gates, approved spec change, screenshots.');
})().catch(e=>{console.error(e);process.exit(1)});
