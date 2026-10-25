// Read-only isolated fixtures. Project list must not wait for optional summaries.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const fontDir=path.dirname(require.resolve('@fontsource/noto-sans-tc/package.json'));
const font=fs.readFileSync(path.join(fontDir,'400.css'),'utf8').replace(/url\(([^)]+)\)/g,(_,p)=>`url(data:font/woff2;base64,${fs.readFileSync(path.join(fontDir,p.replace(/[\"']/g,''))).toString('base64')})`);
(async()=>{for(const width of [390,1280]){
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN,args:['--no-sandbox']}: {})});const page=await browser.newPage({viewport:{width,height:900}});let release,fail=false,summaryCalls=0;const gate=new Promise(r=>release=r),errors=[],writes=[];
 const projects=[{id:'a',title:'工程專案 A',goal:'先顯示清單',owner_bot:'sam',phase:'規劃期',status:'ai_pending'},{id:'b',title:'工程專案 B',owner_bot:'family',phase:'執行期',status:'confirmation'}];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>sessionStorage.setItem('hy_life_os_access_token',btoa(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600}))+'.test'));
 await page.route('**/api/**',async route=>{const req=route.request(),u=new URL(req.url());let data={};if(req.method()!=='GET')writes.push(u.pathname);
 if(u.pathname==='/api/ai-office/projects'){if(fail)return route.fulfill({status:503,contentType:'application/json',body:'{"detail":"暫時無法更新"}'});data=projects}
 else if(u.pathname==='/api/ai-office/actions')data=[];
 else if(u.pathname.startsWith('/api/ai-office/projects/')){summaryCalls++;await gate;data={...projects.find(p=>p.id===u.pathname.split('/').pop()),packages:[]}}
 else if(u.pathname.includes('dispatch-sessions'))data=[];
 await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.goto('http://127.0.0.1:5173/#/ai-work-v5');await page.addStyleTag({content:font});await page.evaluate(()=>document.fonts.ready);await page.locator('.ao-project-line').first().waitFor();assert.equal(await page.locator('.ao-project-line').count(),2);assert(summaryCalls>0);assert.equal(await page.getByText('開始你的第一個專案',{exact:true}).count(),0);
 // Optional summaries are still blocked; a refresh failure must retain the list.
 fail=true;await page.getByRole('button',{name:'重新整理專案',exact:true}).click();await page.getByRole('alert').waitFor();await page.getByText(/仍顯示上次成功載入的專案/).waitFor();assert.equal(await page.locator('.ao-project-line').count(),2);
 release();await page.waitForTimeout(100);assert.equal(await page.locator('.ao-project-line').count(),2);await page.getByRole('alert').waitFor();
 fail=false;await page.getByRole('button',{name:'重試讀取',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('[role=alert]'));assert.equal(await page.locator('.ao-project-line').count(),2);
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 fs.mkdirSync('docs/quality/ui/ai-office-visibility',{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`docs/quality/ui/ai-office-visibility/list-${width}.png`,fullPage:true});await browser.close();console.log(`AI Office ${width}: list shown before summaries, refresh failure retains list, stale completion ignored, no writes passed`);
}})().catch(e=>{console.error(e);process.exit(1)});
