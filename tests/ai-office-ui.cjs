const {chromium}=require('playwright');const assert=require('node:assert/strict');const {mkdirSync}=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}: {})});const page=await browser.newPage({timezoneId:"Asia/Taipei"});let failure=false,homeFailure=false;const errors=[],writes=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message)});page.on('console',m=>{if(m.type()==='error')console.log(m.text())});
 await page.addInitScript(()=>{if(window.top!==window.self)return;sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.fixture');});
 const project={id:'fixture-office',title:'AI Office 隔離驗證專案',goal:'核對五頁正式資料呈現與互動',description:'僅用於工程驗證，不代表正式產品驗收。',owner_bot:'hy',phase:'執行期',milestone_id:'M1',status:'confirmation',plan_state:'APPROVED',plan_revision:1,started_at:1791676800,updated_at:1791677000,permissions:{delete:true,contribute:true},references:[{type:'project_link',data:{title:'參考文件',url:'https://github.com/che0319-debug/hy-agent-v2'}}],notes:[{id:'note1',author:'owner',content:'正式測試補充資料',created_at:1791676820}],suggestions:[],team:[],drive:{project_folder_id:'fixture_folder',references_folder_id:'fixture_references'},capabilities:{pi_live_chat:'NOT_READY'},plan:{goal:'Goal',project_type:'開發',milestones:[{id:'M1',name:'功能整合',goal:'串接服務',deliverables:['正式成果'],acceptance_criteria:['驗證通過']},{id:'M2',name:'情境驗證',goal:'跨頁核對',deliverables:['正式報告'],acceptance_criteria:['人工確認']}],project_plan_markdown:'# 專案規劃書\n\n正式規劃第一版。\n\n'+Array(15).fill('段落內容。\n\n').join('')+'## M1 功能整合\n\nM1 正式工作。\n\n## M2 情境驗證\n\nM2 正式工作。',ai_execution_plan_markdown:'# AI 執行規劃書\n\n## M1 執行策略\n\nGPT Chat 執行。\n\n## M2 驗證策略\n\n獨立審查。'},packages:[{id:'work1',task:'串接正式服務',type:'TASK',milestone_id:'M1',executor:'GPT_CHAT',status:'RUNNING',created_at:1791676800,dependencies:[],expected_outputs:['成果'],acceptance_criteria:['測試通過']},{id:'work2',task:'驗證與交付',type:'TASK',milestone_id:'M2',executor:'CLAUDE_REVIEW',status:'WAITING',created_at:1791676801,dependencies:['work1'],expected_outputs:['審查'],acceptance_criteria:['人工核准']}],actions:[{action_id:'action1',project_id:'fixture-office',package_id:'work1',work_package_id:'work1',action_type:'SUPPLEMENT',title:'提供必要參考資料',question:'請提供正式參考資料。',reason:'PI 已核對缺少原始資料，需要 HY 提供。',assigned_to:'owner',requested_by:'PI',authority_mode:'DELEGATED',status:'OPEN',approval_allowed:true,created_at:1791676810},{action_id:'action2',project_id:'fixture-office',package_id:'work1',action_type:'PI_DECISION',title:'資料來源要用哪個？',question:'選項 1：提供內部資料',reason:'PI 分析：公開資料不足',assigned_to:'owner',requested_by:'PI',status:'OPEN',created_at:1791676820}],decisions:{action2:{title:'資料來源要用哪個？',why:'公開資料不足以完成分析',options:[{label:'提供內部資料',impact:'一天內可完成'},{label:'縮小範圍',impact:'少兩項分析'}],recommendation:'提供內部資料',evidence:['work1 結果']}},files:[{file_id:'fixture_reference',filename:'正式參考.pdf',type:'application/pdf',revision:1,source:'HY_UI_UPLOAD',created_at:1791676900}],report:{state:'idle',latest:{file_id:'report_v2',revision:2,created_at:1791677000},history:[{file_id:'report_v2',revision:2,created_at:1791677000},{file_id:'report_v1',revision:1,created_at:1791676900}]},quality:{checkpoints:[]}};
 project.packages.push({id:'parked-old',task:'已停泊的舊版工作',type:'TASK',milestone_id:'PARKED:M3@r1',status:'WAITING',executor:'CODEX',created_at:1791676800,dependencies:[]});
 await page.route('**/api/**',route=>{const req=route.request(),url=req.url(),method=req.method();let data={};if(method!=='GET')writes.push({url,method,body:req.postDataJSON()});
 if(url.includes('/auth/'))data={access_token:'fixture',access_expires_in:3600,role:'owner'};
 else if(url.includes('/api/ai-office/projects/fixture-office/reports/'))data={html:`<html><body><h1>${url.endsWith('report_v1')?'歷史版本一':'正式版本二'}</h1><a href="https://drive.google.com/file/d/fixture_reference/view">引用</a></body></html>`};
 else if(url.endsWith('/api/ai-office/projects/fixture-office')){if(failure)return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"unavailable"}'});data=project}
 else if(url.endsWith('/projects/fixture-office/files')){data={file_id:'uploaded_file',readback_verified:true};project.files.push({file_id:'uploaded_file',filename:'upload.txt',type:'text/plain',revision:1,created_at:1791677000,source:'HY_UI_UPLOAD'})}
 else if(url.endsWith('/projects/fixture-office/drive-reference')){data={file_id:'imported_file',source_file_id:'original_file',readback_verified:true};project.files.push({file_id:'imported_file',filename:'匯入.pdf',type:'application/pdf',revision:1,created_at:1791677000,source:'HY_DRIVE_REFERENCE'})}
 else if(url.includes('/suggestions') && method==='POST'){data={id:'suggestion1'};project.suggestions.push({id:'suggestion1',content:req.postDataJSON().content,author:'owner',created_at:1791677200,state:'PENDING'})}
 else if(url.endsWith('/inbox/action1/resolve')){project.actions[0].status='RESOLVED';project.actions[0].resolved_at=1791677300;project.actions[0].resolved_by='owner';project.actions[0].answer=req.postDataJSON().answer;data={resolved:true}}
 else if(url.endsWith('/projects/fixture-office'))data=project;
 else if(url.endsWith('/projects')){if(homeFailure)return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"home unavailable"}'});data=[project]}
 else if(url.includes('/inbox?') || url.endsWith('/api/ai-office/actions'))data=project.actions.filter(a=>a.status==='OPEN');
 else if(url.endsWith('/summary'))data={openTotal:1,openProjects:1,running:1,waiting:0,completed:0,all:1};
 return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });mkdirSync('docs/quality/ui/ai-office',{recursive:true});
 mkdirSync('docs/quality/ui/ai-office',{recursive:true});
 const shot=name=>page.screenshot({path:`docs/quality/ui/ai-office/${name}.png`,fullPage:true});
 const noOverflow=async what=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${what} overflow`);
 const tabs=page.getByRole('navigation',{name:'AI Office 專案分頁'});
 const tab=label=>tabs.getByRole('button',{name:label,exact:false});
 const home=async()=>{await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.reload();await page.locator('.ao-project-line').waitFor({timeout:8000})};
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});await home();
  // 首頁：專案列表、摘要卡即篩選、執行者與模型入口
  await page.getByRole('heading',{name:'AI Office',exact:true}).waitFor();
  assert.equal(await page.locator('.ao-project-line').count(),1);
  assert.equal(await page.locator('.ao-project-line.needs-you').count(),1);
  assert.equal(await page.locator('.ao-project-line .hy-pill').innerText(),'2 項待你決定');
  assert.equal(await page.getByRole('link',{name:'執行者與模型'}).getAttribute('href'),'#/expert-team?tab=models');
  assert.equal(await page.locator('.ao-tile').count(),4);
  await shot(`00-home-${width}`);await noOverflow('home');
  await page.getByRole('searchbox',{name:'搜尋專案'}).fill('不存在的名稱');await page.getByText('沒有符合條件的專案',{exact:true}).waitFor();await page.getByRole('searchbox',{name:'搜尋專案'}).fill('');
  const chips=page.getByRole('group',{name:'篩選專案'});
  await chips.getByRole('button',{name:'已完成',exact:true}).click();assert.equal(await page.locator('.ao-project-line').count(),0);
  await page.locator('.ao-tile',{hasText:'待你決定'}).click();assert.equal(await page.locator('.ao-project-line').count(),1);
  assert.equal(await chips.getByRole('button',{name:'待你決定'}).getAttribute('aria-pressed'),'true');
  await chips.getByRole('button',{name:'全部',exact:true}).click();
  await page.getByRole('button',{name:'新增專案',exact:true}).click();await page.locator('.ao-home-create form').waitFor();await page.getByRole('button',{name:'取消',exact:true}).click();assert.equal(await page.locator('.ao-home-create').count(),0);
  // 概況：唯一核准處
  await page.locator('.ao-project-line').click();await page.getByRole('heading',{name:'待你決定',exact:true}).waitFor();
  assert.deepEqual(await tabs.locator('button').evaluateAll(b=>b.map(x=>x.firstChild.textContent)),['概況','會議室','執行計畫','成果與審查','工作日誌']);
  assert.equal(await page.locator('.is-focus').count(),1);
  const decide=page.locator('.ao-decide');
  await decide.getByText('公開資料不足以完成分析',{exact:false}).waitFor();
  await decide.locator('.is-recommended',{hasText:'提供內部資料'}).getByText('PI 推薦').waitFor();
  assert.equal(await decide.getByText('PI 分析：公開資料不足').count(),0,'structured decision replaces flattened text');
  await decide.getByText('請提供正式參考資料。').waitFor();
  const work=page.locator('.ao-work',{hasText:'串接正式服務'});await work.getByText('Claude 對話通道').waitFor();
  assert.equal(await page.locator('.ao-work',{hasText:'已停泊的舊版工作'}).count(),0);
  assert.equal(await page.locator('.ao-overview textarea').count(),2,'only answer fields, no composer on overview');
  if(width===390){const [d,w]=await Promise.all([decide.boundingBox(),page.locator('.ao-card',{hasText:'AI 正在做什麼'}).boundingBox()]);assert(d.y<w.y,'decisions first on mobile')}
  await page.locator('.ao-header-meta').getByRole('link',{name:'專案資料夾 ↗'}).waitFor();
  await shot(`01-overview-${width}`);await noOverflow('overview');
  await page.getByRole('button',{name:'編輯專案',exact:true}).click();await page.getByRole('heading',{name:'編輯專案（正式規格變更）'}).waitFor();await page.getByRole('button',{name:'編輯專案',exact:true}).click();
  await page.getByRole('button',{name:'刪除專案',exact:true}).click();await page.getByRole('alertdialog').waitFor();assert.equal(await page.getByRole('button',{name:'永久刪除',exact:true}).isEnabled(),false);await page.getByRole('button',{name:'取消',exact:true}).click();
  // 會議室：唯一輸入處
  await tab('會議室').click();await page.getByRole('heading',{name:'與 PI 的對話'}).waitFor();
  await page.locator('.ao-message',{hasText:'正式測試補充資料'}).waitFor();
  assert.equal(await page.locator('.ao-meeting').getByLabel('上傳專案附件').count(),1);
  assert.equal(await page.locator('.ao-meeting').getByText('你的回答').count(),0);
  assert.equal(await page.locator('.ao-message b',{hasText:/^owner$/}).count(),0,'owner shows as HY');
  await page.locator('.ao-message.is-me',{hasText:'正式測試補充資料'}).getByText('HY',{exact:true}).waitFor();
  await shot(`02-meeting-${width}`);await noOverflow('meeting');
  // 執行計畫
  await tab('執行計畫').click();await page.getByRole('heading',{name:'時程與執行',exact:true}).waitFor();await page.locator('.ao-work-pane summary').filter({hasText:'M2'}).click();await page.getByRole('status').filter({hasText:'M2 情境驗證'}).waitFor();
  if(width===1280){const separator=page.getByRole('separator',{name:'調整雙欄比例'});await separator.focus();await separator.press('ArrowLeft');assert.equal(await separator.getAttribute('aria-valuenow'),'55');const box=await separator.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+80);await page.mouse.down();await page.mouse.move(box.x-80,box.y+80);await page.mouse.up();assert(Number(await separator.getAttribute('aria-valuenow'))<55);await separator.press('Home');assert.equal(await separator.getAttribute('aria-valuenow'),'60')}
  await page.evaluate(()=>window.getSelection()?.removeAllRanges());await page.locator('.ao-work-pane summary').filter({hasText:'M1'}).click();
  await shot(`03-execution-${width}`);
  const scrollBefore=await page.locator('.ao-document').evaluate(e=>e.scrollTop);await page.getByRole('button',{name:'正式文件全寬',exact:true}).click();await page.getByRole('button',{name:'雙欄模式',exact:true}).click();assert.equal(await page.locator('.ao-document').evaluate(e=>e.scrollTop),scrollBefore);
  await page.getByRole('button',{name:'AI Execution Plan',exact:true}).click();await page.locator('.ao-document').getByRole('heading',{name:'AI 執行規劃書',exact:true}).waitFor();
  // 成果與審查：全寬報告＋一個 Drive 資料夾連結，沒有檔案清單
  await tab('成果與審查').click();const report=page.frameLocator('iframe[title="正式 HTML 成果報告"]');await report.getByRole('heading',{name:'正式版本二'}).waitFor();
  assert.equal(await page.getByRole('link',{name:'開專案 Drive 資料夾 ↗'}).getAttribute('href'),'https://drive.google.com/drive/folders/fixture_folder');
  assert.equal(await page.locator('.ao-results').getByText('正式參考.pdf').count(),0);
  await page.getByLabel('成果報告版本').selectOption('report_v1');await report.getByRole('heading',{name:'歷史版本一'}).waitFor();
  await page.getByRole('button',{name:'完整閱讀',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('.ao-reader-full').count(),0);
  await shot(`04-results-${width}`);await noOverflow('results');
  // 工作日誌：篩選
  await tab('工作日誌').click();await page.getByRole('heading',{name:'工作日誌',exact:true}).waitFor();
  await page.getByRole('button',{name:'HY 與代理'}).click();await page.locator('.ao-journal').getByText('正式測試補充資料').waitFor();assert.equal(await page.locator('.ao-journal').getByText('建立工作包',{exact:false}).count(),0);
  await page.getByRole('button',{name:'全部',exact:true}).click();
  await shot(`05-log-${width}`);await noOverflow('log');
 }
 // 會議室送出意見＋附件
 await tab('會議室').click();const form=page.locator('.ao-composer form');await form.locator('textarea').first().fill('HY 補充');
 await form.getByLabel('上傳專案附件').setInputFiles({name:'upload.txt',mimeType:'text/plain',buffer:Buffer.from('fixture only')});await form.getByRole('link',{name:'upload.txt ↗',exact:true}).waitFor();
 await form.getByLabel('匯入其他 Google Drive 檔案 ID').fill('original_file');await form.getByRole('button',{name:'複製到專案 references 並驗證'}).click();await form.getByRole('link',{name:'匯入.pdf ↗',exact:true}).waitFor();
 await form.getByRole('button',{name:'送給 PI'}).click();await page.locator('.ao-message',{hasText:'HY 補充'}).waitFor();
 assert(writes.find(w=>w.url.endsWith('/suggestions')).body.content.includes('uploaded_file'));
 // 概況回答補資料
 await tab('概況').click();const supplement=page.locator('.ao-decide article',{hasText:'提供必要參考資料'});await supplement.getByLabel('你的回答').fill('正式回覆');await supplement.getByRole('button',{name:'送出',exact:true}).click();
 await page.locator('.ao-decide article',{hasText:'提供必要參考資料'}).waitFor({state:'detached'});assert.equal(writes.find(w=>w.url.endsWith('/inbox/action1/resolve')).body.answer,'正式回覆');
 await tab('會議室').click();assert.equal(await page.locator('.ao-message',{hasText:'建立正式事項：提供必要參考資料'}).getByRole('button',{name:'到概況處理'}).count(),0,'resolved action has no jump');
 await tab('工作日誌').click();assert(await page.getByText('正式回覆',{exact:true}).count());
 // 錯誤與重試
 await page.getByRole('button',{name:'‹ AI Office',exact:true}).click();failure=true;await page.locator('.ao-project-line').click();await page.getByRole('alert').waitFor();failure=false;await page.getByRole('button',{name:'重試讀取'}).click();await page.getByRole('heading',{name:'待你決定',exact:true}).waitFor();
 await page.getByRole('button',{name:'‹ AI Office',exact:true}).click();homeFailure=true;await page.getByRole('button',{name:'重新整理專案'}).click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('.ao-project-line').count(),0);assert.equal(await page.locator('.ao-tile strong').first().innerText(),'—');homeFailure=false;await page.getByRole('button',{name:'重試讀取'}).click();await page.locator('.ao-project-line').waitFor();
 // Issue 139: completed planning belongs to Claude's review lane, not an empty Chat queue.
 project.phase='規劃期';project.milestone_id=null;project.plan_state='DRAFT';project.plan=null;project.actions=[];
 project.packages=[{id:'planning',type:'PROJECT_PLANNING',executor:'GPT_CHAT',status:'COMPLETED',task:'規劃完成',dependencies:[],created_at:1791676800},{id:'review',type:'QUALITY_REVIEW',executor:'CLAUDE_REVIEW',status:'READY',task:'PLAN 品質審查',dependencies:[],created_at:1791677000}];
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:900});
  for(const [status,label] of [['READY','待 Claude 品質審查'],['RUNNING','Claude 品質審查中']]){
   project.status=status==='RUNNING'?'ai_running':'ai_pending';project.packages[1].status=status;project.activity={label,packages:[project.packages[1]]};
   await home();assert.equal(await page.locator('.ao-project-line .hy-pill').innerText(),label);
   if(width===1280)assert((await page.locator('.ao-project-line').innerText()).includes('工作包 0／0'));
   await noOverflow('139 home');await shot(`139-${status}-home-${width}`);
   await page.locator('.ao-project-line').click();await page.locator('.ao-header-top .hy-pill').waitFor();
   assert.equal(await page.locator('.ao-header-top .hy-pill').innerText(),label);
   await page.locator('.ao-work',{hasText:'PLAN 品質審查'}).getByText('Claude 獨立審查').waitFor();
   await noOverflow('139 project');
  }
 }
 delete project.activity;project.status='ai_pending';project.packages[1].status='READY';
 await home();assert.equal(await page.locator('.ao-project-line .hy-pill').innerText(),'待 Claude 品質審查');
 assert(!writes.some(w=>w.method==='PATCH'||w.method==='DELETE'));assert.deepEqual(errors,[]);await browser.close();
 console.log('AI Office 1280/390: project list with filter tiles, overview as the only approval place (structured PI decision), meeting room as the only composer, execution plan, full-width report with one Drive link, log filters, edit/delete gate, error recovery passed.');
})().catch(e=>{console.error(e);process.exit(1)});
