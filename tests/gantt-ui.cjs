/* Isolated browser QA: intercept every external request, never access production. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GANTT_BASE_URL||'http://127.0.0.1:5173/950157-dashboard.html?tab=gantt';
const out=path.resolve(__dirname,'../docs/quality/ui/gantt');fs.mkdirSync(out,{recursive:true});
const r=(id,kind,parent,project,name,owner,start,end,extra={})=>({id,kind,parent_id:parent,project_id:project,order:0,name,owner,start,end,status:'wait',date:null,checkpoint_type:null,...extra});
const fixture={revision:'demo1',items:[
 r('p','project',null,'p','智慧觸覺技術開發','',null,null),
 r('t','task','p','p','觸覺模組設計','HY','2026-11-02','2026-11-17',{status:'ai',started:true,delayed:true}),
 r('s','task','t','p','感測線路驗證','Sam','2026-11-04','2026-11-12'),
 r('s2','task','s','p','雛型品實作比對','HY','2026-11-06','2026-11-10'),
 r('c','checkpoint','p','p','合約規格確認','HY',null,null,{date:'2026-11-18',checkpoint_type:'contract',order:1}),
 r('m','checkpoint','t','p','內部重大規格審查','HY',null,null,{date:'2026-11-13',checkpoint_type:'major',order:2}),
 r('g','checkpoint','s','p','內部一般規格查核','Sam',null,null,{date:'2026-11-11',checkpoint_type:'general',order:3}),
 r('p2','project',null,'p2','IME 線路研發','',null,null,{order:1}),
 r('u','task','p2','p2','模型與實作驗證','HY','2026-11-03','2026-11-20',{started:true}),
 r('v','task','p2','p2','樣品測試與整理','Alex','2026-11-10','2026-11-26',{order:1}),
]};
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
let saved=structuredClone(fixture),failure=null,puts=0,unexpected=[];
const context=await browser.newContext({viewport:{width:1280,height:900}});
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
 if(url.pathname==='/api/950157-gantt'){
  const put=route.request().method()==='PUT';if(put)puts++;
  if(failure)return route.fulfill({status:failure,contentType:'application/json',body:'{"detail":"test failure"}'});
  if(put){const data=route.request().postDataJSON();assert.equal(data.revision,saved.revision);saved={...data,revision:'rev'+puts};}
  return route.fulfill({contentType:'application/json',body:JSON.stringify(saved)});
 }
 if(url.hostname==='cdnjs.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:'window.Sortable={create:()=>({destroy(){}})};'});
 if(url.hostname==='fonts.googleapis.com'&&process.env.GANTT_FONT)return route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(path.dirname(process.env.GANTT_FONT),'../400.css'),'utf8').replaceAll('./files/','https://fonts.gstatic.com/gantt/')});
 if(url.hostname==='fonts.gstatic.com'&&process.env.GANTT_FONT)return route.fulfill({contentType:'font/woff2',body:fs.readFileSync(path.join(path.dirname(process.env.GANTT_FONT),path.basename(url.pathname)))});
 if(url.pathname==='/api/950157-progress'){if(route.request().method()!=='GET')unexpected.push(url.pathname);return route.fulfill({contentType:'application/json',body:'{"projects":[]}'});}
 return route.fulfill({contentType:'application/json',body:'{"weeks":[],"projects":[],"items":[]}'});
});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});page.on('dialog',d=>d.accept());
console.log('opening');await page.goto(base,{waitUntil:'domcontentloaded',timeout:15000});console.log('opened',await page.title());await page.locator('.g-row[data-id="p"]').waitFor();
async function anchor(){await page.locator('#g-anchor').fill('2026-11-01');await page.locator('#g-anchor').press('Tab');}
console.log('rows loaded');await anchor();assert.equal(await page.locator('.g-row[data-id]').count(),10);assert.equal(await page.locator('.g-head .g-cell').count(),6);assert.equal(await page.locator('[data-key=status],dialog [name=status]').count(),0);assert.equal(await page.locator('.g-row.is-project .g-bar').count(),2);assert.equal(await page.locator('.g-mark').count(),3);
const colors=await page.locator('.g-mark').evaluateAll(els=>els.map(e=>getComputedStyle(e).color));assert.deepEqual(new Set(colors),new Set(['rgb(17, 104, 63)','rgb(180, 35, 24)','rgb(0, 0, 0)']));
for(const [a,b] of [['t','u'],['p','p2']])assert.equal(await page.locator(`[data-id=${a}] .g-bar`).evaluate(e=>e.style.background),await page.locator(`[data-id=${b}] .g-bar`).evaluate(e=>e.style.background));

// Date text is independent from owner bars, checkpoint colors and calendar time.
const red='rgb(180, 35, 24)';
for(const part of ['g-start','g-end'])assert.equal(await page.locator('[data-id=t] .'+part).evaluate(el=>getComputedStyle(el).color),red);
assert.notEqual(await page.locator('[data-id=s] .g-start').evaluate(el=>getComputedStyle(el).color),red);
await page.locator('[data-id=t] [data-key=name]').click();await page.locator('[data-action=edit]').click();
assert.ok(await page.locator('dialog [name=started]').isChecked());assert.ok(await page.locator('dialog [name=delayed]').isChecked());
await page.locator('dialog [name=started]').uncheck();await page.getByRole('button',{name:'套用變更'}).click();
assert.notEqual(await page.locator('[data-id=t] .g-start').evaluate(el=>getComputedStyle(el).color),red);
assert.equal(await page.locator('[data-id=t] .g-end').evaluate(el=>getComputedStyle(el).color),red);
await page.locator('[data-action=edit]').click();await page.locator('dialog [name=started]').check();await page.locator('dialog [name=delayed]').uncheck();await page.getByRole('button',{name:'套用變更'}).click();
assert.equal(await page.locator('[data-id=t] .g-start').evaluate(el=>getComputedStyle(el).color),red);
assert.notEqual(await page.locator('[data-id=t] .g-end').evaluate(el=>getComputedStyle(el).color),red);
await page.locator('[data-action=edit]').click();await page.locator('dialog [name=delayed]').check();await page.getByRole('button',{name:'套用變更'}).click();

assert.ok((await page.locator('.g-row[data-id]').evaluateAll(rows=>rows.map(r=>{const cs=[...r.children].map(c=>c.getBoundingClientRect());return cs.every(c=>Math.abs(c.y-cs[0].y)<.5&&Math.abs(c.height-44)<.5)}))).every(Boolean));
await page.locator('[data-toggle=t]').click();assert.equal(await page.locator('.g-row[data-id]').count(),6);await page.locator('[data-toggle=t]').click();
async function pointer(selector,dx){const el=page.locator(selector);await el.scrollIntoViewIfNeeded();const b=await el.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:5});await page.mouse.up();}
console.log('drag tests');await pointer('[data-id=t] .g-bar',18);assert.equal(await page.locator('[data-id=t] [data-key=start]').inputValue(),'2026-11-04');assert.equal(await page.locator('[data-id=t] [data-key=end]').inputValue(),'2026-11-19');
await pointer('[data-id=t] .g-handle.left',9);assert.equal(await page.locator('[data-id=t] [data-key=start]').inputValue(),'2026-11-05');
await pointer('[data-id=t] .g-handle.right',-9);assert.equal(await page.locator('[data-id=t] [data-key=end]').inputValue(),'2026-11-18');
await pointer('[data-id=c] .g-mark',18);assert.equal(await page.locator('[data-id=c] [data-key=date]').inputValue(),'2026-11-20');assert.match(await page.locator('[data-id=p]').innerText(),/2026-11-20/);
await page.locator('[data-action=save]').click();await page.getByRole('status').filter({hasText:'已儲存'}).waitFor();assert.equal(puts,1);assert.equal(saved.items.find(r=>r.id==='t').started,true);assert.equal(saved.items.find(r=>r.id==='t').delayed,true);
await page.reload();await page.locator('[data-id=t]').waitFor();assert.equal(await page.locator('[data-id=t] [data-key=start]').inputValue(),'2026-11-05');
const second=await context.newPage();await second.goto(base);await second.locator('[data-id=t]').waitFor();assert.equal(await second.locator('[data-id=t] [data-key=start]').inputValue(),'2026-11-05');await second.close();
await page.locator('[data-id=s2] [data-key=name]').click();await page.locator('[data-action=task]').click();await page.locator('dialog [name=name]').fill('第五層測試工作');await page.locator('dialog [name=start]').fill('2026-11-07');await page.locator('dialog [name=end]').fill('2026-11-08');await page.getByRole('button',{name:'套用變更'}).click();assert.equal(await page.locator('.g-row[data-id]').count(),11);
await page.locator('[data-action=edit]').click();await page.locator('dialog [name=parent]').selectOption('p2');await page.getByRole('button',{name:'套用變更'}).click();await page.locator('[data-action=up]').click();await page.locator('[data-action=down]').click();await page.locator('[data-action=delete]').click();assert.equal(await page.locator('.g-row[data-id]').count(),10);

// Checkpoint CRUD uses the same editor and fixed type choices.
await page.locator('[data-id=p] [data-key=name]').click();await page.locator('[data-action=checkpoint]').click();await page.locator('dialog [name=name]').fill('新增查核測試');await page.locator('dialog [name=date]').fill('2026-11-22');await page.locator('dialog [name=checkpoint_type]').selectOption('major');await page.getByRole('button',{name:'套用變更'}).click();assert.equal(await page.locator('.g-row[data-id]').count(),11);
await page.locator('[data-action=edit]').click();await page.locator('dialog [name=name]').fill('修改查核測試');await page.locator('dialog [name=date]').fill('2026-11-23');await page.locator('dialog [name=checkpoint_type]').selectOption('general');await page.getByRole('button',{name:'套用變更'}).click();await page.locator('[data-action=delete]').click();assert.equal(await page.locator('.g-row[data-id]').count(),10);

failure=409;await page.locator('[data-action=save]').click();await page.getByRole('status').filter({hasText:'其他裝置'}).waitFor();assert.ok(await page.locator('[data-action=save]').isEnabled());
failure=503;await page.locator('[data-action=save]').click();await page.getByRole('status').filter({hasText:'儲存失敗'}).waitFor();await page.locator('[data-action=load]').click();await page.getByRole('status').filter({hasText:'讀取失敗'}).waitFor();assert.ok(await page.locator('[data-action=save]').isDisabled());const count=puts;await page.locator('#saveBtn').click();assert.equal(puts,count);
failure=null;await page.locator('[data-action=load]').click();await page.locator('[data-id=t]').waitFor();
for(const tab of ['progress','weekly','research','gantt']){await page.locator(`[data-tab=${tab}]`).click();assert.ok(await page.locator(`#tab-${tab}`).isVisible());}
await anchor();await page.locator('#g-mode').selectOption('week');assert.equal(await page.locator('.g-mark').count(),3);await page.locator('#g-mode').selectOption('month');
await page.locator('.g-scroll').evaluate(el=>{el.scrollLeft=0;el.scrollTop=0});await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,'desktop-1280.png'),fullPage:true});
if(!process.env.GANTT_DESKTOP_ONLY){await page.setViewportSize({width:390,height:900});await page.screenshot({path:path.join(out,'mobile-390.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'no outer horizontal scroll');
await page.locator('.g-scroll').evaluate(el=>el.scrollLeft=358);await page.screenshot({path:path.join(out,'mobile-timeline-390.png'),fullPage:true});
}
await page.setViewportSize({width:1760,height:1000});await page.locator('.g-scroll').evaluate(el=>el.scrollLeft=0);await page.screenshot({path:path.join(out,'demo-complete.png'),fullPage:true});
assert.equal(unexpected.length,0);assert.equal(errors.length,0,errors.join('\n'));fs.writeFileSync(path.join(out,'qa.json'),JSON.stringify({passed:true,rows:10,projects:2,checkpointColors:colors,puts,unexpected,errors,viewports:process.env.GANTT_DESKTOP_ONLY?[1280,1760]:[1280,390,1760],coverage:['started date red','delayed date red','independent flag toggles and persistence','multi-project','deep hierarchy','collapse','reparent','order','delete','colors','alignment','move','left resize','right resize','checkpoint drag','parent dates','save reload','second device','409 conflict','503 save','read failure lock','header isolation','existing tabs','month week','mobile scroll']},null,2));
await browser.close();console.log('Gantt browser QA passed. '+out);
})().catch(e=>{console.error(e);process.exit(1)});
