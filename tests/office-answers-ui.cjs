// Fully isolated fixture; no production data or credentials.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const out=process.env.OFFICE_ANSWERS_QA_DIR||'docs/quality/ui/office-answers';fs.mkdirSync(out,{recursive:true});
const fontDir=path.dirname(require.resolve('@fontsource/noto-sans-tc/package.json'));
const font=fs.readFileSync(path.join(fontDir,'400.css'),'utf8').replace(/url\(([^)]+)\)/g,(_,p)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir,p.replace(/["']/g,''))).toString('base64')})`);
const makeState=()=>({updated:'2026-10-24T16:44:00+08:00',buildings:[{id:'qa-pilot',title:'P0 工程驗證專案',owner_bot:'sam',stage:'assigned',executor:'grok-build'}],decisions:[
 {id:'qa-intake',title:'開案提問・工程示範 12 題',project:'qa-pilot',kind:'intake',revision:0,status:'open',questions:Array.from({length:12},(_,i)=>({no:i+1,q:`工程驗證第 ${i+1} 題：採用哪個流程？`,why:'先對齊範圍，再安排執行。',options:['先核對','先整理'],recommend:'先核對',...(i<2?{answer:'先核對',answered_by:'sam',answer_source:'proxy',basis:'已確認的工程驗證紀錄',confidence:'high'}:{})}))},
 {id:'qa-approval',title:'規劃書核准・工程示範',project:'qa-pilot',kind:'approval',revision:0,status:'open',questions:[]}
]});
(async()=>{for(const width of [1280,390]){
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}: {})});
 const page=await browser.newPage({viewport:{width,height:900}});let state=makeState(),fail=null,writes=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.test'));
 await page.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url());let data={},status=200;
 if(url.pathname==='/api/office/state')data=state;
 else if(url.pathname==='/api/office/index')data={updated:state.updated,cards:[]};
 else if(req.method()==='POST'&&url.pathname.includes('/api/office/decisions/')){
  const body=req.postDataJSON();writes.push({path:url.pathname,body});
  assert(!req.headers()['x-brain-write-token']);
  const did=decodeURIComponent(url.pathname.split('/').at(-2)),d=state.decisions.find(d=>d.id===did);
  if(fail){status=fail;fail=null;if(status===409)d.revision++;data={error:status===409?'office_decision_conflict':'unauthorized'};}
  else if(body.expected_revision!==d.revision){status=409;data={error:'office_decision_conflict'};}
  else {d.revision++;const q=d.questions.find(q=>q.no===body.question_no);if(body.action==='confirm'){q.confirmed_by='hy';}
   else if(body.action==='answer'){q.answer=body.answer;q.answered_by='hy';q.answer_source='hy';}
   else if(body.action==='approve'||body.action==='return'){d.status='answered';d.answer=body.action==='approve'?'APPROVED':{decision:'RETURN',feedback:body.feedback};}
   data={decision:d,updated:state.updated};}
 }else if(url.pathname.includes('dispatch-sessions'))data=[];
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:5173/#/bot-office');await page.addStyleTag({content:font+' body{font-family:"Noto Sans TC",sans-serif}'});await page.evaluate(()=>document.fonts.ready);
 const intake=page.getByRole('article',{name:'開案提問・工程示範 12 題',exact:true});await intake.waitFor();
 assert.equal(await intake.locator('.bo-question').count(),12);await intake.getByText('Sam 代答・把握度 高',{exact:true}).first().waitFor();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert(await intake.locator('button').evaluateAll(items=>items.every(b=>b.getBoundingClientRect().height>=44)));
 await page.screenshot({path:`${out}/questions-${width}.png`,fullPage:true});
 const first=intake.getByRole('region',{name:'第 1 題',exact:true});await first.getByRole('button',{name:'確認代答',exact:true}).click();await first.getByText(/HY 已確認/).waitFor();
 const third=intake.getByRole('region',{name:'第 3 題',exact:true});await third.getByRole('button',{name:'先整理',exact:true}).click();assert.equal(writes.length,1);assert.equal(await third.getByRole('textbox').inputValue(),'先整理');
 await third.getByRole('button',{name:'送出回答',exact:true}).click();await third.getByText('HY 已作答',{exact:true}).waitFor();assert.equal(writes.at(-1).body.question_no,3);
 const fourth=intake.getByRole('region',{name:'第 4 題',exact:true});await fourth.getByRole('textbox').fill('我的保留答案');fail=409;await fourth.getByRole('button',{name:'送出回答',exact:true}).click();
 await intake.getByRole('alert').waitFor();assert.equal(await fourth.getByRole('textbox').inputValue(),'我的保留答案');await page.screenshot({path:`${out}/conflict-${width}.png`,fullPage:true});
 await intake.getByRole('button',{name:'已核對最新題目，保留輸入',exact:true}).click();await fourth.getByRole('button',{name:'送出回答',exact:true}).click();await fourth.getByText('HY 已作答',{exact:true}).waitFor();
 const fifth=intake.getByRole('region',{name:'第 5 題',exact:true});await fifth.getByRole('textbox').fill('尚未送出的文字');await fifth.getByRole('button',{name:'先不決定',exact:true}).click();await intake.getByText('已記錄先不決定，題目保持開放。',{exact:true}).waitFor();assert.equal(await fifth.getByRole('textbox').inputValue(),'尚未送出的文字');
 const approval=page.getByRole('article',{name:'規劃書核准・工程示範',exact:true});assert(await approval.getByRole('button',{name:'退回修改',exact:true}).isDisabled());
 await approval.getByRole('textbox',{name:'退回意見'}).fill('請補驗證紀錄');await approval.getByRole('button',{name:'退回修改',exact:true}).click();await approval.waitFor({state:'detached'});assert.equal(writes.at(-1).body.action,'return');assert.equal(state.buildings[0].stage,'assigned');
 fail=401;await fifth.getByRole('button',{name:'送出回答',exact:true}).click();await intake.getByRole('button',{name:'重新登入',exact:true}).waitFor();assert.equal(await fifth.getByRole('textbox').inputValue(),'尚未送出的文字');
 assert(!writes.some(w=>!/^\/api\/office\/decisions\//.test(w.path)));assert.deepEqual(errors,[]);
 await browser.close();console.log(`P0 ${width}: 12 questions, proxy confirm, answer, conflict preserves draft, defer, return, auth, no stage change, no overflow passed`);
}})().catch(e=>{console.error(e);process.exit(1)});
