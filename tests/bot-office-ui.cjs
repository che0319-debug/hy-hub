// Run against local Vite with isolated API fixtures; no real API writes.
const fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium:pw}=require('playwright');
const out=path.resolve(process.env.BOT_OFFICE_QA_DIR || 'docs/quality/ui/bot-office'); fs.mkdirSync(out,{recursive:true});
const fontDir=path.dirname(require.resolve('@fontsource/noto-sans-tc/package.json'));
const font=fs.readFileSync(path.join(fontDir,'400.css'),'utf8').replace(/url\(([^)]+)\)/g,(_,u)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir,u.replace(/["']/g,''))).toString('base64')})`);
const stages=['unassigned','assigned','running','review','hy_decision','done','returned'];
const state={updated:'2026-10-24T14:30:00+08:00',islands:[{id:'company',name:'公司'}],buildings:stages.map((stage,i)=>({id:'p'+i,title:['品牌落地','技術簡報','家庭安排','健康課表','年度方向','研究整理','包裝修訂'][i],island:'company',stage,executor:'grok-build'})),decisions:[{id:'d1',ref:'p4',status:'open',title:'確認年度方向',suggestion:'先完成驗收，再安排下一階段。'},{id:'d2',ref:'p0',status:'answered',title:'不應顯示'}]};
const index={updated:state.updated,cards:state.buildings.flatMap(p=>['decision','meeting','execution','output','log'].map(type=>({id:p.id+type,project:p.id,type,title:p.title+'・'+type,summary:'先核對方向與範圍，再整理工作摘要。完整內容請查看 Drive 原件。',drive_url:'https://drive.google.com/file/d/example/view',date:'2026-10-24'})))};
(async()=>{let reports=[];
for(const spec of [{name:'desktop',width:1280,height:900},{name:'mobile',width:390,height:844},{name:'index-empty',width:390,height:844,indexMissing:true},{name:'empty',width:390,height:844,status:404},{name:'unauthorized',width:1280,height:900,status:401},{name:'stale',width:1280,height:900,stale:true},{name:'delete-rules',width:1280,height:900,hy:true,delete:{mode:'null'}}]){
 const browser=await pw.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}: {})});const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},deviceScaleFactor:1});let api=[],errors=[],holdRefresh=false,releaseRefresh,removedProjects=new Set();const refreshGate=new Promise(resolve=>{releaseRefresh=resolve});
 await context.addInitScript(hy=>{if(window.top!==window.self)return;const payload={exp:Math.floor(Date.now()/1000)+3600};if(hy)payload.sub='hy';sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify(payload))+'.test');},spec.hy===true);
 await context.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());api.push([req.method(),u.pathname]);let data={};let status=200;const headers={'Content-Type':'application/json'};if(req.method()==='POST'&&u.pathname.endsWith('/delete')&&spec.delete){const mode=spec.delete.mode;const body=mode==='true'?{committed:true,error:'index_write',step:'index',backup_file_id:'bak'}:mode==='null'?{committed:null,error:'state_unknown',reason:'結果不明'}:{committed:false,error:'backup_failed',step:'backup',reason:'搬移失敗'};if(mode==='true'){const parts=u.pathname.split('/');removedProjects.add(decodeURIComponent(parts.at(-2)));}await route.fulfill({status:spec.delete.status||502,headers,body:JSON.stringify(body)});return}if(u.pathname.startsWith('/api/office/')){if(holdRefresh)await refreshGate;status=spec.indexMissing&&u.pathname.endsWith('index')?404:spec.status||200;data=status===404?{error:'brain_data_not_ready'}:status===401?{error:'unauthorized'}:u.pathname.endsWith('state')?{...state,buildings:state.buildings.filter(b=>!removedProjects.has(b.id))}:index;headers['X-Brain-Updated']=state.updated;if(spec.stale)headers['X-Brain-Stale']='1';}else if(u.pathname.includes('dispatch-sessions'))data=[];else if(u.pathname.includes('/api/ai-office/'))data=[];await route.fulfill({status,headers,body:JSON.stringify(data)});});
 await context.route('https://drive.google.com/**',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><h1>Isolated preview</h1>'}));
 const page=await context.newPage();if(spec.name==='desktop')await page.clock.install();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/#/bot-office');await page.addStyleTag({content:font+' body{font-family:"Noto Sans TC",sans-serif}'});await page.evaluate(()=>document.fonts.ready);await page.getByRole('heading',{name:'Bot Office',exact:true}).waitFor();
 if(spec.status===404)await page.getByRole('heading',{name:'尚無資料',exact:true}).waitFor();else if(spec.status===401)await page.getByRole('heading',{name:'請重新登入',exact:true}).waitFor();else await page.getByRole('button').filter({hasText:'年度方向'}).waitFor();
 if(spec.indexMissing){assert.equal(await page.locator('.ao-project-line').count(),7);await page.getByRole('button').filter({hasText:'年度方向'}).click();await page.getByText('正式規劃尚未提供里程碑。',{exact:true}).waitFor();await page.getByRole('button',{name:'‹ Bot Office',exact:true}).click();}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+spec.name);await page.screenshot({path:out+'/'+spec.name+'.png',fullPage:true});
 if(spec.name==='desktop'){
 const before=api.filter(([,p])=>p.startsWith('/api/office/')).length;holdRefresh=true;const pending=Promise.all(['state','index'].map(name=>page.waitForRequest(r=>r.url().endsWith('/api/office/'+name))));await page.clock.runFor(30001);await pending;assert.equal(await page.getByText('正在讀取 Office 資料…',{exact:true}).count(),0);const completed=Promise.all(['state','index'].map(name=>page.waitForResponse(r=>r.url().endsWith('/api/office/'+name))));releaseRefresh();await completed;assert.equal(api.filter(([,p])=>p.startsWith('/api/office/')).length,before+2);await page.getByRole('button').filter({hasText:'年度方向'}).click();for(const [i,label]of ['概況','會議室','執行計畫','成果與審查','工作日誌'].entries()){await page.getByRole('navigation',{name:'Bot Office 專案分頁'}).getByRole('button',{name:label,exact:label!=='概況'}).click();await page.screenshot({path:out+'/tab-'+i+'.png',fullPage:true});}
 assert.equal(await page.getByRole('button',{name:'示範',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'真實',exact:true}).count(),0);

 }
 if(spec.name==='delete-rules'){
  const deleted='專案已刪除（備份已保留），但看板收尾未完成，請重新整理；若卡片還在，再按一次刪除即可清掉。';
  const unknownText='結果不明，備份已保留，請重新讀取確認專案是否已刪除。';
  const back=()=>page.getByRole('button',{name:'‹ Bot Office',exact:true}).click();
  const openProject=async name=>{await page.getByRole('button').filter({hasText:name}).first().click();await page.getByRole('heading',{name,exact:true}).waitFor()};
  const openDelete=async()=>{await page.getByRole('button',{name:'刪除專案',exact:true}).click();await page.getByRole('alertdialog').waitFor()};
  const expectRemoved=async name=>{
    await page.getByRole('heading',{name:'Bot Office',exact:true}).waitFor();
    await page.getByRole('status').getByText(deleted,{exact:true}).waitFor();
    await page.getByRole('button').filter({hasText:name}).waitFor({state:'hidden'});
    assert.equal(await page.getByRole('status').getByText(deleted,{exact:true}).count(),1);
  };
  await openProject('健康課表');await openDelete();
  await page.getByText('目前專案在審查中，需等審查結束後才能刪除。',{exact:true}).waitFor();
  const reviewDelete=page.getByRole('button',{name:'永久刪除',exact:true});
  assert.equal(await reviewDelete.isDisabled(),true);
  await page.getByRole('alertdialog').getByRole('textbox').fill('健康課表');
  assert.equal(await reviewDelete.isDisabled(),true);
  await page.getByRole('button',{name:'取消',exact:true}).click();await back();
  await openProject('家庭安排');await openDelete();
  await page.getByText('目前專案執行中，需等結束後才能刪除。',{exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'永久刪除',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'取消',exact:true}).click();await back();
  await openProject('研究整理');await openDelete();
  await page.getByRole('alertdialog').getByRole('textbox').fill('研究整理');
  spec.delete.mode='null';await page.getByRole('button',{name:'永久刪除',exact:true}).click();
  const unknown=page.getByRole('alert');
  await unknown.getByText(unknownText,{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'研究整理',exact:true}).count(),1);
  assert.equal(await page.getByText('專案未刪除',{exact:false}).count(),0);
  assert.equal(await page.getByText('專案已刪除',{exact:false}).count(),0);
  spec.delete.mode='false';await page.getByRole('button',{name:'永久刪除',exact:true}).click();
  await page.getByRole('alert').getByText('專案未刪除',{exact:false}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'研究整理',exact:true}).count(),1);
  spec.delete.mode='true';await page.getByRole('button',{name:'永久刪除',exact:true}).click();
  await expectRemoved('研究整理');
  spec.delete.status=409;spec.delete.mode='true';
  await openProject('包裝修訂');await openDelete();
  await page.getByRole('alertdialog').getByRole('textbox').fill('包裝修訂');
  await page.getByRole('button',{name:'永久刪除',exact:true}).click();
  await expectRemoved('包裝修訂');
  spec.delete.status=500;spec.delete.mode='true';
  await openProject('品牌落地');await openDelete();
  await page.getByRole('alertdialog').getByRole('textbox').fill('品牌落地');
  await page.getByRole('button',{name:'永久刪除',exact:true}).click();
  await expectRemoved('品牌落地');
  spec.delete.status=409;spec.delete.mode='null';
  await openProject('技術簡報');await openDelete();
  await page.getByRole('alertdialog').getByRole('textbox').fill('技術簡報');
  await page.getByRole('button',{name:'永久刪除',exact:true}).click();
  await page.getByRole('alert').getByText(unknownText,{exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'技術簡報',exact:true}).count(),1);
  assert.equal(await page.getByText('專案未刪除',{exact:false}).count(),0);
  assert.equal(await page.getByText('專案已刪除',{exact:false}).count(),0);
  assert.equal(await page.getByText('專案資料已更新',{exact:false}).count(),0);
  assert.equal(api.filter(([m,p])=>m==='POST'&&p.endsWith('/delete')).length,6);
 }
 else assert(!api.some(([m,p])=>p.startsWith('/api/office/')&&m!=='GET'));
 assert.equal(errors.length,0,errors.join('\n'));reports.push({scenario:spec.name,overflow:false,errors,api});await browser.close();
}fs.writeFileSync(out+'/qa-results.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));})().catch(e=>{console.error(e);process.exit(1)});
