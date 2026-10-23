const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN,args:['--no-sandbox']});
 const page=await browser.newPage({timezoneId:'Asia/Taipei'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.fixture'));
 const blockers=[{package_id:'review-fixture',code:'REVIEW_SYSTEM_FAILURE',reason:'主力與備案均無法審查，請系統維護者排除異常；無須 HY 代替系統審查',since:1792700400,responsible:'系統維護者',action_required:'恢復審查端連線後重新輪詢',deadline_label:'因系統阻塞順延',attempts:[{runner_id:'claude-review',reason:'REVIEWER_OFFLINE'},{runner_id:'gpt-chat',reason:'QUALITY_REVIEWER_IS_CONTRIBUTOR'}]}];
 const project={id:'review-demo',title:'審查流程驗證專案',goal:'獨立審查與系統異常分開呈現',owner_bot:'family',status:'ai_pending',phase:'執行期',plan_state:'APPROVED',plan_revision:1,milestone_id:'M1',permissions:{},system_blockers:blockers,packages:[],actions:[],files:[],notes:[{id:'notice',author:'system:review',content:'審查改派：Claude → GPT；審查端離線。系統通知，不可按。',created_at:1792700400}],suggestions:[],team:[],references:[],drive:{},quality:{checkpoints:[]},report:{history:[]},plan:{goal:'核對流程',milestones:[{id:'M1',title:'獨立核對',packages:[],acceptance_criteria:['核對原件']}],scope:[],risks:[]}};
 await page.route('**/api/**',route=>{const url=route.request().url();let data={};if(url.includes('/auth/'))data={access_token:'fixture',role:'owner'};else if(url.includes('/router/view'))data=JSON.parse(fs.readFileSync('tests/fixtures/router-view.json'));else if(url.match(/\/projects\/review-demo/))data=project;else if(url.split('?')[0].endsWith('/projects'))data=[project];else if(url.includes('/actions')||url.includes('/inbox'))data=[];else if(url.endsWith('/summary'))data={openTotal:0,openProjects:0,running:0,waiting:1,completed:0,all:1};return route.fulfill({contentType:'application/json',body:JSON.stringify(data)})});
 fs.mkdirSync('docs/quality/ui/review-blockers',{recursive:true});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.reload();if(process.env.REVIEW_FONT_CSS){const root=require('node:path').dirname(process.env.REVIEW_FONT_CSS);let css=fs.readFileSync(process.env.REVIEW_FONT_CSS,'utf8');css=css.replace(/url\(([^)]+)\)/g,(_,file)=>'url(data:font/woff2;base64,'+fs.readFileSync(require('node:path').join(root,file.replace(/["']/g,''))).toString('base64')+')');await page.addStyleTag({content:css+' body{font-family:"Noto Sans TC",sans-serif}'});await page.evaluate(()=>document.fonts.ready)}await page.locator('.ao-project-line').click();await page.getByRole('status',{name:'系統阻塞通知'}).waitFor();
  assert.equal(await page.getByRole('status',{name:'系統阻塞通知'}).getByRole('button').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:`docs/quality/ui/review-blockers/overview-${width}.png`,fullPage:true});
  await page.getByRole('navigation',{name:'AI Office 專案分頁'}).getByRole('button',{name:'會議室'}).click();
  await page.getByText('審查改派：Claude → GPT；審查端離線。系統通知，不可按。',{exact:true}).first().waitFor();
  assert.equal(await page.locator('.ao-message',{hasText:'審查改派'}).getByRole('button').count(),0);
  await page.screenshot({path:`docs/quality/ui/review-blockers/meeting-${width}.png`,fullPage:true});
 }
 assert.deepEqual(errors,[]);await browser.close();console.log('Review blockers: desktop/mobile, notification-only, no overflow passed');
})().catch(e=>{console.error(e);process.exit(1)})
