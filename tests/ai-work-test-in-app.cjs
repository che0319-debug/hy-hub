const assert=require('node:assert/strict'),path=require('node:path'),http=require('node:http');
const esbuild=require(process.env.ESBUILD_MODULE||'esbuild');
const {chromium}=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'));
(async()=>{
 const root=path.resolve(__dirname,'..');
 const build=await esbuild.build({entryPoints:[path.join(root,'src/main.jsx')],bundle:true,write:false,format:'iife',jsx:'automatic',nodePaths:[process.env.INAPP_TEST_NODE_MODULES],plugins:[{name:'isolate-production-fixtures',setup(b){
  b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'fixture'}));
  b.onResolve({filter:/^\.\/pages\//},a=>a.path==='./pages/AIWorkTest'?null:({path:a.path,namespace:'fixture'}));
  b.onResolve({filter:/^\.\/components\/AuthGate$/},a=>({path:'auth',namespace:'fixture'}));
  b.onResolve({filter:/^\.\/mobile\/MobileAppV2$/},a=>({path:'mobile',namespace:'fixture'}));
  b.onResolve({filter:/^\.\/layout\/TopBar$/},a=>({path:'top',namespace:'fixture'}));
  b.onResolve({filter:/^\.\/api$/},a=>({path:'api',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({loader:'jsx',resolveDir:root,contents:a.path==='css'?'':a.path==='api'?'export async function fetchDispatchSessions(){window.dispatchReads=(window.dispatchReads||0)+1;return []}':a.path==='auth'?'export default function Auth({children}){return children}':a.path.startsWith('./pages/')?'export default function Page(){return <div>production-route-fixture</div>}':'export default function Stub(){return null}'}));
 }}]});
 const js=build.outputFiles[0].text;
 const server=http.createServer((req,res)=>{if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(js)}else res.end('<!doctype html><html><head><meta charset="utf-8"></head><body><div id="root"></div><script src="/app.js"></script></body></html>')});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});const ctx=await browser.newContext();const p=await ctx.newPage();
  const base='http://127.0.0.1:'+server.address().port;
  await p.goto(base+'/#/ai-work-test');await p.getByRole('heading',{name:'AI Work Test',exact:true}).waitFor();assert.match(p.url(),/#\/ai-work-test$/);assert.equal(await p.evaluate(()=>window.dispatchReads||0),0);
  assert.equal(await p.getByRole('button',{name:/同意|退回|核准/}).count(),0);assert.match(await p.getByRole('status').innerText(),/測試資料尚未接通/);
  await p.getByRole('link',{name:'AI Work 區',exact:true}).click();await p.getByText('production-route-fixture').waitFor();await p.getByRole('link',{name:'AI Work Test',exact:true}).click();await p.getByRole('heading',{name:'AI Work Test',exact:true}).waitFor();assert.equal(ctx.pages().length,1);assert.match(p.url(),/#\/ai-work-test$/);
  const before=await p.evaluate(()=>window.dispatchReads);await p.reload();await p.getByRole('heading',{name:'AI Work Test',exact:true}).waitFor();assert.equal(await p.evaluate(()=>window.dispatchReads||0),0);
  console.log(JSON.stringify({passed:true,checks:['actual hash route no longer redirects to production','sidebar opens Test inside same app/tab','Test never loads production dispatch sessions','disconnected page has no fake approval controls','direct reload stays on Test'],scope:'production page and AuthGate mocked; no live authentication or API calls'}));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1});
