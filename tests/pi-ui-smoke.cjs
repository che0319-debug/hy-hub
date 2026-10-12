// 專家團（AI Work v3）390／1280：專家卡、待核准版本、Skill 庫分組與內容、執行者與模型。
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {mkdirSync}=require('node:fs');
const h=c=>c.repeat(64);
const skills=[
  {id:'hy-pi',version:'3.0.0',content_hash:h('a'),state:'PUBLISHED',name:'HY PI 規則',description:'PI 的 HY 專屬規則',references:['expert_versions'],can_delete:false},
  {id:'hy-delivery',version:'1.0.0',content_hash:h('b'),state:'PUBLISHED',name:'HY 工作包交付規則',description:'交付規則',references:['expert_versions'],can_delete:false},
  {id:'test-driven-development',version:'1.0.0',content_hash:h('c'),state:'PUBLISHED',name:'測試驅動開發',description:'先寫失敗測試',references:[],can_delete:false},
  {id:'pi-integrator',version:'2.1.0',content_hash:h('d'),state:'PUBLISHED',name:'PI 專案整合',description:'舊版',references:['expert_versions'],can_delete:false},
  {id:'hy-review',version:'2.1.0',content_hash:h('e'),state:'CANDIDATE',name:'HY 獨立審查規則',description:'審查規則候選',references:[],can_delete:true},
];
const pin=s=>({id:s.id,version:s.version,content_hash:s.content_hash});
const experts=[
  {id:'pi',version:'3.0.0',state:'PUBLISHED',name:'PI｜Project Integrator',description:'研究與規劃、專家配置',executor:'GPT_CHAT',model_tier:'high',capabilities:['研究與規劃','決策卡'],visual:{symbol:'compass'},skills:[pin(skills[0])]},
  {id:'pi',version:'2.1.0',state:'PUBLISHED',name:'PI | Project Integrator',description:'舊版',executor:'GPT_CHAT',capabilities:['研究'],visual:{symbol:'digital-phantom'},skills:[pin(skills[3])]},
  {id:'code-engineer',version:'1.0.0',state:'PUBLISHED',name:'程式工程師',description:'程式修改、測試',executor:'CODEX',model_tier:'mid',capabilities:['程式修改','測試'],visual:{symbol:'code'},skills:[pin(skills[1]),pin(skills[2])]},
  {id:'writer',version:'1.0.0',state:'CANDIDATE',name:'文件撰寫',description:'文件、簡報',executor:'GPT_CHAT',model_tier:'mid',capabilities:['文件'],visual:{symbol:'doc'},skills:[pin(skills[1])]},
];
const actions=[
  {id:'act-expert',type:'EXPERT_PUBLISH',title:'發布專家：文件撰寫 @ 1.0.0',payload:{expert:{id:'writer',version:'1.0.0'},content_hash:h('f')}},
  {id:'act-skill',type:'QUALITY_SKILL_PUBLISH',title:'發布 Skill：HY 獨立審查規則 @ 2.1.0',payload:{skill:pin(skills[4])}},
];
const models={schedule:{name:'AI Office PI（每小時，24 小時）',when:'每小時第 17 分（台北時間）',connectors:['HY AI Office','HY AI Work 獨立審查']},
recent:[{role:'pi',role_name:'PI',model:'claude-opus-5-5',task:'PI 檢視：每日巡檢',at:1791793328}],
roles:[
  {role:'pi',name:'PI',lane:'GPT_CHAT',tier:'high',model:'Claude Opus',last_reported:{model:'claude-opus-x'},mismatch:false,runner:'AI Office PI 排程本身'},
  {role:'code',name:'程式工程師',lane:'CODEX',tier:'mid',model:'Claude Sonnet',last_reported:{model:'claude-opus-x'},mismatch:true,runner:'PI 派出的子代理（在程式庫改程式、開 PR）'},
  {role:'review',name:'獨立審查員',lane:'CLAUDE_REVIEW',tier:'high',model:'Claude Opus',last_reported:null,mismatch:false,runner:'PI 另開的子代理（只看審查包，不看製作過程）'},
],tools:[{id:'gpt-image',name:'GPT',use:'畫圖'},{id:'grok',name:'Grok',use:'第二意見'}]};
(async()=>{
  const b=await chromium.launch({headless:true,args:['--no-sandbox']});const p=await b.newPage();const errors=[];const resolved=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.test'));
  await p.route('**/api/**',r=>{let data={ok:true};const u=r.request().url();
    if(u.endsWith('/dispatch-sessions'))data=[];
    if(u.endsWith('/projects'))data=[{id:'test',title:'測試專案'}];
    if(u.includes('/experts/registry'))data={skills,experts,actions};
    if(u.includes('/api/ai-office/models'))data=models;
    if(u.includes('/experts/pi/skills/')){const s=skills.find(s=>u.includes(`/${s.id}/${s.version}/`));data={...s,markdown:`# ${s.name}\n\n完整規則內文 ${s.id}`,steps:['依內容執行']}}
    if(u.includes('/inbox/')){resolved.push(u.split('/inbox/')[1].split('/')[0])}
    r.fulfill({contentType:'application/json',body:JSON.stringify(data)})});
  mkdirSync('docs/quality/ui',{recursive:true});
  for(const w of [390,1280]){
    await p.setViewportSize({width:w,height:900});
    await p.goto('http://127.0.0.1:5173/#/expert-team');
    await p.getByRole('heading',{name:'專家團',exact:true}).waitFor();
    await p.getByRole('heading',{name:'全部專家 3'}).waitFor();
    assert.equal(await p.locator('.expert-card').count(),3);
    assert.equal(await p.locator('.expert-card.needs-you').count(),1);
    await p.getByText('另有 v2.1.0 供舊專案使用',{exact:false}).waitFor();
    await p.getByText('Claude 程式通道',{exact:true}).first().waitFor();
    assert.equal(await p.getByText('GPT Chat').count(),0);
    await p.getByText('待你確認 2',{exact:true}).waitFor();
    await p.screenshot({path:`docs/quality/ui/expert-team-${w}.png`,fullPage:true});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`experts overflow ${w}`);
    await p.locator('.expert-card.needs-you').getByRole('button',{name:'核准此版本發布'}).click();
    // Skill chip opens the Skill panel with full markdown and approval for pending versions.
    await p.locator('.expert-card').first().getByRole('button',{name:/HY PI 規則/}).click();
    await p.getByRole('dialog').getByText('完整規則內文 hy-pi').waitFor();
    assert(await p.getByRole('dialog').getByRole('button',{name:'刪除版本 3.0.0'}).isDisabled());
    await p.getByRole('dialog').getByRole('button',{name:'關閉'}).click();
    await p.getByRole('heading',{name:'HY 專屬規則 3'}).waitFor();
    await p.getByRole('heading',{name:'GitHub 中譯 1'}).waitFor();
    assert.equal(await p.getByRole('heading',{name:/其他 Skill/}).count(),0);
    await p.getByRole('heading',{name:'舊版凍結 1'}).waitFor();
    await p.screenshot({path:`docs/quality/ui/expert-skills-${w}.png`,fullPage:true});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`skills overflow ${w}`);
    await p.getByRole('tab',{name:'執行者與模型'}).click();
    await p.getByText('有角色實際使用的模型和設定不同',{exact:false}).waitFor();
    await p.locator('.hy-pill:visible',{hasText:'與設定不同'}).first().waitFor();
    await p.locator('.hy-pill:visible',{hasText:'等首次回報'}).first().waitFor();
    await p.getByRole('heading',{name:'誰在跑'}).waitFor();await p.locator(':text("AI Office PI 排程本身"):visible').first().waitFor();await p.getByRole('heading',{name:'最近實際使用'}).waitFor();
    await p.screenshot({path:`docs/quality/ui/expert-models-${w}.png`,fullPage:true});
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`models overflow ${w}`);
    await p.getByRole('tab',{name:'專家'}).click();
    await p.getByRole('button',{name:'新增專家',exact:true}).click();
    await p.getByLabel('識別代碼').fill('new-expert');
    await p.getByRole('button',{name:'取消',exact:true}).click();
    await p.goto('http://127.0.0.1:5173/#/system-architecture');await p.getByRole('heading',{name:'系統架構',exact:true}).waitFor();
  }
  assert.deepEqual([...new Set(resolved)],['act-expert']);
  assert.deepEqual(errors,[]);await b.close();
  console.log('Expert Team 390/1280: cards, pending expert approval, Skill panel with full markdown, source groups, models mismatch, no overflow/errors');
})().catch(e=>{console.error(e);process.exit(1)});
