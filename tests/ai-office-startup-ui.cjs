// Isolated contract fixtures only; no production project or model execution.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const {mkdirSync}=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}: {})});
 for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:900}});const writes=[],errors=[];let mode='error',project=null;
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.fixture'));
  const pin={id:'pi',version:'2.1.0',content_hash:'a'.repeat(64)},skill={id:'pi-integrator',version:'2.1.0',content_hash:'b'.repeat(64)};
  await page.route('**/api/**',async route=>{
   const req=route.request(),url=req.url(),method=req.method();let data={};
   if(method!=='GET')writes.push({url,body:req.postDataJSON()});
   if(url.includes('/auth/'))data={access_token:'fixture',access_expires_in:3600,role:'owner'};
   else if(url.endsWith('/startup-options')){
    if(mode==='error')return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"啟動 API 未就緒"}'});
    data={experts:mode==='empty'?[]:[{pin,name:'PI 專案整合專家',executor:'GPT_CHAT',skills:[skill]}],executor_availability:'UNVERIFIED'};
   }else if(url.endsWith('/api/ai-office/projects')&&method==='POST'){
    const body=req.postDataJSON();assert.deepEqual(body.pi_expert,pin);assert(!('status' in body));
    project={...body,id:body.project_id,phase:'規劃期',status:'ai_pending',plan_state:'DRAFT',packages:[{id:'planning',type:'PROJECT_PLANNING',status:'WAITING',executor:'GPT_CHAT',task:'規劃',created_at:1791676800}],references:[],notes:[],suggestions:[],files:[],team:[{id:'pi',name:'PI',version:'2.1.0',state:'PUBLISHED'}],permissions:{delete:true,contribute:true},drive:{state:'NOT_READY',project_folder_id:null,references_folder_id:null},report:{history:[]},quality:{checkpoints:[]},startup:{state:'WAITING_HY_APPROVAL',pi_expert:pin,quality_enabled:false,quality_action:{id:'quality-action',status:'OPEN'},executor_availability:'UNVERIFIED'},actions:[{action_id:'quality-action',project_id:body.project_id,action_type:'QUALITY_POLICY_ENABLE',title:'啟用品質契約 V1',question:'由 HY 核准啟用',reason:'核准前不派工',assigned_to:'owner',authority_mode:'OWNER_ONLY',status:'OPEN',approval_allowed:true,created_at:1791676800}]};data={project_id:project.id};
   }else if(url.endsWith('/inbox/quality-action/resolve')){
    assert.equal(req.postDataJSON().answer,'APPROVED');project.actions[0].status='RESOLVED';project.startup={...project.startup,state:'CONFIGURED',quality_enabled:true,quality_action:{id:'quality-action',status:'RESOLVED',resolved_by:'owner',resolved_at:1791677000}};data={resolved:true};
   }else if(url.endsWith('/api/ai-office/projects'))data=project?[project]:[];
   else if(url.endsWith('/api/ai-office/actions'))data=project?project.actions.filter(a=>a.status==='OPEN'):[];
   else if(project&&url.endsWith('/api/ai-office/projects/'+project.id))data=project;
   return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.getByRole('button',{name:'新增專案',exact:true}).click();
  const form=page.getByRole('form',{name:'三引擎新專案'}),submit=form.getByRole('button',{name:'建立專案並送交啟動確認'});
  await form.getByText('啟動 API 未就緒',{exact:true}).waitFor();assert.equal(await submit.isEnabled(),false);
  mode='empty';await form.getByRole('button',{name:'重新核對啟動資料'}).click();await form.getByText('沒有可用的正式 PI／Skill，請先完成 Registry 發布。').waitFor();assert.equal(await submit.isEnabled(),false);
  await form.getByRole('button',{name:'取消',exact:true}).click();mode='ready';await page.getByRole('button',{name:'新增專案',exact:true}).click();
  await form.getByLabel('名稱',{exact:true}).fill('隔離工程驗證');await form.getByLabel('目標',{exact:true}).fill('驗證三引擎啟動契約，非正式驗收');
  assert.equal(await submit.isEnabled(),false);await form.getByLabel('正式 PI 版本',{exact:true}).selectOption('2.1.0:'+pin.content_hash);await form.getByText('版本與 Skill 追溯',{exact:true}).click();await form.getByText(pin.content_hash,{exact:true}).waitFor();await form.getByText('版本與 Skill 追溯',{exact:true}).click();assert.equal(await submit.isEnabled(),true);
  assert.equal(writes.filter(w=>!w.url.includes('/auth/')).length,0);
  mkdirSync('docs/quality/ui/ai-office-startup',{recursive:true});await page.screenshot({path:`docs/quality/ui/ai-office-startup/create-${width}.png`,fullPage:true});
  await submit.click();await page.getByRole('heading',{name:'三引擎啟動確認',exact:true}).waitFor({timeout:5000}).catch(async e=>{console.log(await page.locator('body').innerText(),errors,writes);throw e});await page.getByText('等待 HY 核准 Quality',{exact:false}).waitFor();
  assert.equal(writes.filter(w=>w.url.endsWith('/api/ai-office/projects')).length,1);assert.equal(writes.filter(w=>w.url.includes('/resolve')).length,0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'查看 Quality 正式核准事項'}).click();const detail=page.locator('.ao-action-detail');await detail.getByText('本專案需先完成 Quality 啟動核准，AI 才會接手。').waitFor();await detail.getByRole('button',{name:'核准',exact:true}).waitFor();await detail.getByRole('button',{name:'核准',exact:true}).click();
  await page.getByRole('navigation',{name:'AI Office 專案分頁'}).getByRole('button',{name:'專案概況',exact:true}).click();await page.getByText('配置完成，尚待實戰驗證',{exact:false}).waitFor();
  await page.getByText('執行端可用性尚未驗證；配置及品質契約啟用不等於三引擎正式驗收。').waitFor();
  assert.equal(writes.filter(w=>w.url.includes('/resolve')).length,1);assert.equal(await page.locator('.ao-tabs button').count(),5);assert.deepEqual(errors,[]);await page.close();
 }
 await browser.close();console.log('Startup desktop/mobile: unavailable/empty API, exact published pin, explicit selection, create once, no automatic approval, existing owner humanAction and unverified runtime passed.');
})().catch(e=>{console.error(e);process.exit(1)});
