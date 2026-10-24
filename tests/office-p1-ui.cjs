// Isolated Office P1/P2 fixtures; no production writes.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=process.env.OFFICE_P1_QA_DIR||'docs/quality/ui/office-p1';fs.mkdirSync(out,{recursive:true});
const fontDir=path.dirname(require.resolve('@fontsource/noto-sans-tc/package.json'));
const font=fs.readFileSync(path.join(fontDir,'400.css'),'utf8').replace(/url\(([^)]+)\)/g,(_,p)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir,p.replace(/["']/g,''))).toString('base64')})`);
(async()=>{for(const width of [390,1280]){
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}: {})});const page=await browser.newPage({viewport:{width,height:900}});let writes=[],errors=[];
 const state={updated:'2026-10-24T20:00:00+08:00',buildings:[{id:'qa',title:'工程驗證專案',owner_bot:'sam',island:'side',stage:'assigned',executor:'grok-build',last_review:'fail',returned_count:2,required_changes:['補上驗證紀錄'],review_card:'report'},{id:'review',title:'待審專案',stage:'review'}],figures:[{id:'pi',project:'qa',owner:'sam',island:'side',look_as:'PI',status:'waiting'}],logs:[],requests:[],decisions:[
 {id:'open',project:'qa',kind:'intake',status:'open',revision:0,title:'新流程提問',questions:[{no:1,q:'主力品項？',answer:'建議手機，整新 iPhone 待 HY',answer_source:'proxy',answered_by:'sam',basis:'既有討論',confidence:'medium',bot_suggestions:[{answer:'先從小量測試',answered_by:'sam',basis:'現金流限制',confidence:'high'}]},{no:2,q:'下一題'}]},
 {id:'done',project:'qa',card:'old',kind:'intake',status:'answered',revision:17,title:'已完成的提問',questions:[{no:1,q:'產品方向',answer:'完整新答案',answer_source:'proxy',answered_by:'sam',confirmed_by:'hy',confirmed_at:'2026-10-24T20:00:00+08:00'}],history:[{at:'2026-10-24T19:00:00+08:00',actor:'hy',action:'confirm',answer:'完整新答案'}]}]};
 const index={updated:'2026-10-24T16:00:00+08:00',cards:[{id:'report',project:'qa',type:'review',title:'審查報告',drive_url:'https://drive.google.com/report'},{id:'old',project:'qa',type:'decision',summary:'過期摘要'}]};
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.test'));
 await page.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());let data={};
 if(u.pathname==='/api/office/state')data=state;
 else if(u.pathname==='/api/office/index')data=index;
 else if(req.method()==='POST'&&u.pathname.startsWith('/api/office/')){
   const payload=req.postDataJSON();writes.push({path:u.pathname,payload});assert(!req.headers()['x-brain-write-token']);
   if(u.pathname.endsWith('/answer')){const d=state.decisions[0];assert.equal(payload.expected_revision,d.revision);d.revision++;const q=d.questions[0];q.confirmed_by='hy';if(payload.answer){q.answer=payload.answer;q.answer_source='hy'}data={decision:d,updated:state.updated};}
   else if(u.pathname.endsWith('/log')){state.logs.push({id:'log-'+writes.length,at:state.updated,content:payload.content,actor:'hy',project:payload.project});data={updated:state.updated};}
   else if(u.pathname.endsWith('/requests')){state.requests.push({id:'r-'+writes.length,project:payload.project,payload,type:payload.type,status:'open'});data={updated:state.updated};}
   else throw new Error('Unexpected write '+u.pathname);
 }else if(u.pathname.includes('dispatch-sessions'))data=[];
 await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:5173/#/bot-office');await page.addStyleTag({content:font});await page.evaluate(()=>document.fonts.ready);
 await page.getByRole('button',{name:/工程驗證專案/}).click();const nav=page.getByRole('navigation',{name:'Bot Office 專案分頁'});
 assert.equal(await nav.getByRole('button').count(),6);await nav.getByRole('button',{name:/待確認/}).click();await page.getByText('Sam 建議・僅供參考').waitFor();await page.getByText('代答仍有待確認內容，請先補充或改答，再確認。').waitFor();
 await page.getByRole('textbox',{name:'第 1 題回答'}).fill('整新 iPhone 是主力');await page.getByRole('button',{name:'確認並補充',exact:true}).click();await page.getByText('HY 已作答',{exact:false}).waitFor();assert.match(writes[0].payload.answer,/補充：整新 iPhone 是主力/);
 await page.screenshot({path:`${out}/questions-${width}.png`,fullPage:true});
 await page.getByRole('button',{name:'已回覆',exact:true}).click();await page.getByRole('article',{name:'已完成的提問'}).waitFor();assert.equal(await page.getByRole('button',{name:'送出回答',exact:true}).count(),0);await page.getByText('Sam 代答・把握度 未提供・HY 已確認').waitFor();await page.getByText('歷史紀錄（1）').click();await page.screenshot({path:`${out}/answered-${width}.png`,fullPage:true});
 await nav.getByRole('button',{name:'品質與審查',exact:true}).click();await page.getByText('補上驗證紀錄').waitFor();await page.getByRole('link',{name:'開啟審查報告 ↗',exact:true}).waitFor();await page.screenshot({path:`${out}/review-${width}.png`,fullPage:true});
 await nav.getByRole('button',{name:'工作紀錄',exact:true}).click();await page.getByRole('textbox',{name:'HY 留言'}).fill('這是隔離測試留言');await page.getByRole('button',{name:'新增留言',exact:true}).click();await page.getByText('留言已儲存。').waitFor();await page.getByText('這是隔離測試留言',{exact:true}).waitFor();
 await nav.getByRole('button',{name:'概況',exact:true}).click();await page.getByRole('heading',{name:'PI 與專案成員'}).waitFor();
 for(const label of ['規格變更','改派','會議室留言']){
   await page.getByRole('button',{name:label,exact:true}).click();const form=page.getByRole('form',{name:label});await form.getByRole('textbox',{name:'說明',exact:true}).fill(label+'隔離測試');await form.getByRole('button',{name:'送給 Atlas',exact:true}).click();await form.waitFor({state:'detached'});
 }
 await page.getByRole('button',{name:'新增專案',exact:true}).click();const create=page.getByRole('form',{name:'新增專案'});await create.getByRole('textbox',{name:'名稱',exact:true}).fill('隔離新案');await create.getByRole('textbox',{name:'目標',exact:true}).fill('驗證開案表單');await create.getByRole('combobox',{name:'負責 Bot',exact:true}).selectOption('sam');await create.getByRole('textbox',{name:'說明',exact:true}).fill('請 Atlas 開案');await create.getByRole('button',{name:'送給 Atlas',exact:true}).click();await create.waitFor({state:'detached'});
 assert.equal(writes.filter(w=>w.path==='/api/office/requests').length,4);assert.equal(state.buildings.length,2);assert.equal(writes.at(-1).payload.owner_bot,'sam');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 await page.screenshot({path:`${out}/overview-${width}.png`,fullPage:true});await browser.close();console.log(`Office P1/P2 ${width}: tabs, suggestions, supplement, history, review, log and four queued requests passed`);
}})().catch(e=>{console.error(e);process.exit(1)});
