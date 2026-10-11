// Isolated fixtures only: normal project creation, no production or model writes.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const {mkdirSync}=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}: {})});
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}});const writes=[],reads=[],errors=[];let failure=true,project=null;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.fixture'));
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=req.url(),method=req.method();let data={};
   if(method!=='GET')writes.push({url,body:req.postDataJSON()});else reads.push(url);
   if(url.includes('/auth/'))data={access_token:'fixture',access_expires_in:3600,role:'owner'};
   else if(url.endsWith('/api/ai-office/projects')&&method==='POST'){
    if(failure)return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"暫時無法建立，請重試。"}'});
    const body=req.postDataJSON();assert(!('pi_expert' in body));assert(!('status' in body));
    project={...body,id:body.project_id,phase:'規劃期',status:'ai_pending',plan_state:'DRAFT',packages:[{id:'planning',type:'PROJECT_PLANNING',status:'READY',executor:'GPT_CHAT',task:'研究目標與展開規劃',created_at:1791676800}],references:[],notes:[],suggestions:[],files:[],team:[{id:'pi',name:'PI',version:'2.1.0',state:'PUBLISHED'}],permissions:{delete:true,contribute:true},drive:{state:'NOT_READY',project_folder_id:null,references_folder_id:null},report:{history:[]},quality:{checkpoints:[]},actions:[]};data={project_id:project.id};
   }else if(url.endsWith('/api/ai-office/projects'))data=project?[project]:[];
   else if(url.endsWith('/api/ai-office/actions'))data=[];
   else if(project&&url.endsWith('/api/ai-office/projects/'+project.id))data=project;
   return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.getByRole('button',{name:'新增專案',exact:true}).click();
  const form=page.getByRole('form',{name:'新增專案'}),submit=form.getByRole('button',{name:'建立專案',exact:true});
  assert.equal(await form.getByLabel('正式 PI 版本').count(),0);assert.equal(await submit.isEnabled(),false);
  await form.getByLabel('名稱',{exact:true}).fill('隔離工程驗證');await form.getByLabel('目標',{exact:true}).fill('交給 PI 研究及規劃');
  assert.equal(await submit.isEnabled(),true);assert(!reads.some(u=>u.includes('startup-options')));
  mkdirSync('docs/quality/ui/ai-office-startup',{recursive:true});await page.screenshot({path:`docs/quality/ui/ai-office-startup/create-${width}.png`,fullPage:true});
  await submit.click();await form.getByRole('alert').waitFor();assert.equal(await page.locator('.ao-dashboard').count(),0);
  failure=false;await submit.click();await page.getByRole('heading',{name:'專案概況',exact:true}).waitFor();
  const creates=writes.filter(w=>w.url.endsWith('/api/ai-office/projects'));assert.equal(creates.length,2);assert.equal(creates[0].body.project_id,creates[1].body.project_id);
  assert.equal(await page.getByRole('heading',{name:'三引擎啟動確認'}).count(),0);assert.equal(await page.getByText('查看 Quality 正式核准事項').count(),0);
  assert.equal(writes.filter(w=>w.url.includes('/resolve')||w.url.includes('/enable-request')).length,0);
  assert.equal(await page.locator('.ao-tabs button').count(),5);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('Office creation 1280/390: name/goal only, no PI controls or activation approval, canonical project, failure/retry same ID and five existing pages passed.');
})().catch(e=>{console.error(e);process.exit(1)});
