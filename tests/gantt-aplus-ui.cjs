/* A+ three-level UI. Intercept every non-local request. Never touch production. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.GANTT_BASE_URL||'http://127.0.0.1:5173/950157-dashboard.html?tab=gantt';
const shot=process.env.GANTT_SHOT_DIR||path.resolve(__dirname,'../docs/quality/ui/gantt');
fs.mkdirSync(shot,{recursive:true});
const aplus=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../docs/quality/gantt/aplus-items.json'),'utf8'));
const fixture={revision:'aplus-demo',items:aplus};
const dates={
 'aplus-ms-tech-1':'2027-03-31','aplus-ms-tech-4':'2027-11-30','aplus-ms-c2-9':'2027-03-31','aplus-ms-c2-11':'2028-03-31',
 'aplus-ms-c3-4':'2026-12-31','aplus-ms-c3-8':'2027-09-30','aplus-ms-c3-9':'2028-06-30','aplus-ms-c3-10':'2028-09-30',
 'aplus-ms-bt1':'2026-12-14','aplus-ms-bt2':'2027-01-25','aplus-ms-bt3':'2027-01-25','aplus-ms-bt5':'2028-09-25',
 'aplus-ms-v0-5':'2027-02-08','aplus-ms-v4':'2028-09-25',
};
(async()=>{
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const context=await browser.newContext({viewport:{width:1280,height:1000}});
await context.addInitScript(()=>{window.GANTT_TODAY='2026-11-17';});
const hosts=new Set();
await context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(['127.0.0.1','localhost'].includes(url.hostname))return route.continue();
 hosts.add(url.hostname+' '+route.request().method()+' '+url.pathname);
 if(url.pathname==='/api/950157-gantt'){
  if(route.request().method()!=='GET')throw new Error('A+ 預覽不應寫入甘特 API');
  return route.fulfill({contentType:'application/json',body:JSON.stringify(fixture)});
 }
 if(url.hostname==='cdnjs.cloudflare.com')return route.fulfill({contentType:'application/javascript',body:'window.Sortable={create:()=>({destroy(){}})};'});
 return route.fulfill({contentType:'application/json',body:'{"weeks":[],"projects":[],"items":[]}'});
});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(base,{waitUntil:'domcontentloaded',timeout:20000});
await page.addStyleTag({content:'body,#gantt{font-family:"Noto Sans CJK TC","Noto Sans TC",sans-serif !important}'});
await page.locator('.g-row[data-id="aplus"]').waitFor();
assert.equal(await page.locator('#g-mode').inputValue(),'month');
assert.equal(await page.locator('.g-head .g-cell').count(),6);
assert.equal(await page.locator('.g-row[data-id]').count(),1);
assert.match(await page.locator('[data-id=aplus]').innerText(),/下一個節點：BT1 12\/14/);
assert.equal(await page.locator('[data-id=aplus] .g-name.is-delayed').count(),0);
await page.locator('#g-mode').selectOption('span');
await page.locator('.g-today-label').waitFor();
assert.match(await page.locator('.g-head .g-today-label').innerText(),/今天 11\/17/);
assert.ok(await page.locator('.g-row[data-id=aplus] .g-today').count()>=1);
const ticks=await page.locator('.g-head .g-tick').allTextContents();
assert.ok(ticks.some(label=>label==='2027/01'||label==='2027-01'),'span ticks: '+ticks.join(','));
assert.ok(!ticks.includes('27/1'));
assert.match(await page.locator('#g-range').innerText(), /2026-10\s+[–-]\s+2028-09/);
await shotOf('layer0-desktop-1280.png');
await page.setViewportSize({width:390,height:900});
await page.locator('.g-row[data-id=aplus] .g-next').waitFor();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'layer0 mobile overflows');
const meta=await page.locator('.g-head .g-owner').boundingBox();
assert.ok(!meta||meta.width<1);
const nameBox=await page.evaluate(()=>{
 const els=[...document.querySelectorAll('.g-head .g-name')];
 return {n:els.length, rows:document.querySelectorAll('.g-row').length, html:(document.querySelector('#gantt .g-grid')||{}).innerHTML?.slice(0,400), boxes:els.map(el=>({c:el.isConnected, t:el.textContent, r:el.getBoundingClientRect().toJSON(), d:getComputedStyle(el).display, cols:getComputedStyle(el.parentElement).gridTemplateColumns}))};
});
assert.ok(nameBox.boxes[0]?.r.width>40);
assert.match(await page.locator('[data-id=aplus] .g-next').innerText(),/BT1 12\/14/);
await page.locator('[data-action=end]').click();
assert.ok(await page.locator('.g-scroll').evaluate(el=>el.scrollLeft>0),'mobile span should scroll to 2028');
await page.locator('.g-scroll').evaluate(el=>el.scrollLeft=0);
await shotOf('layer0-mobile-390.png');
await page.setViewportSize({width:1280,height:1000});
await page.locator('[data-toggle=aplus]').click();
await page.locator('[data-id=aplus-line-5]').waitFor();
assert.equal(await page.locator('.g-row[data-id]').count(),6);
assert.equal(await page.locator('.g-row[data-id^=aplus-ms]').count(),0);
assert.equal(await page.locator('.g-mark.is-inline').count(),23);
for(const [id,date] of Object.entries(dates))assert.match(await page.locator(`.g-mark[data-id="${id}"]`).getAttribute('title'),new RegExp(date));
const tones=await page.locator('.g-row[data-id^=aplus-line] .g-bar').evaluateAll(els=>els.map(el=>getComputedStyle(el).backgroundColor));
assert.equal(new Set(tones).size,5);
assert.notEqual(await page.locator('[data-id=aplus] .g-bar').evaluate(el=>getComputedStyle(el).backgroundColor),tones[0]);
await shotOf('layer1-desktop-1280.png');
await page.setViewportSize({width:390,height:900});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'layer1 mobile overflows');
await shotOf('layer1-mobile-390.png');
await page.setViewportSize({width:1280,height:1100});
await page.locator('[data-toggle=aplus-line-4]').click();
await page.locator('[data-id=aplus-r46]').waitFor();
assert.equal(await page.locator('[data-id=aplus-r46] [data-key=name]').inputValue(),'開發板取得');
assert.equal(await page.locator('[data-id=aplus-r46] [data-key=owner]').inputValue(),'Tiffany');
assert.equal(await page.locator('[data-id=aplus-r46] [data-key=start]').inputValue(),'2026-11-16');
assert.equal(await page.locator('[data-id=aplus-r46] [data-key=end]').inputValue(),'2026-11-29');
const names=await page.locator('[data-key=name]').evaluateAll(els=>els.map(el=>el.value));
assert.ok(!names.some(n=>n.trim()==='123'));
await page.locator('[data-id=aplus-line-4]').evaluate(el=>el.scrollIntoView({block:'start'}));
await shotOf('layer2-desktop-1280.png');
await page.setViewportSize({width:390,height:900});
await page.locator('[data-id=aplus-r46]').evaluate(el=>el.scrollIntoView({block:'center'}));
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'layer2 mobile overflows');
assert.equal(await page.locator('.g-head .g-cell').count(),6);
await shotOf('layer2-mobile-390.png');
await page.setViewportSize({width:1280,height:1000});
assert.equal(await page.locator('dialog [name=started],dialog [name=delayed]').count(),0);
assert.equal(await page.locator('[data-id=aplus] .g-name.is-delayed').count(),0);
await shotOf('delayed-desktop-1280.png');
await page.setViewportSize({width:390,height:900});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=390),'delayed mobile overflows');
await shotOf('delayed-mobile-390.png');
assert.equal(errors.length,0,errors.join('\n'));
const writes=[...hosts].filter(h=>/\/api\/950157-gantt/.test(h)&&!/\bGET\b/.test(h));
assert.deepEqual(writes,[]);
await browser.close();
console.log('A+ gantt UI passed. '+shot);
function shotOf(name){return page.screenshot({path:path.join(shot,name)});}
})().catch(e=>{console.error(e);process.exit(1)});
