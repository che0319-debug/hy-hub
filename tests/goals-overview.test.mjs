import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { buildSync } from 'esbuild'
import { goalPageSummary } from '../src/life-goals/summary.mjs'
import { weeklyRange,weeklyView,weeksUntilFifty } from '../src/life-goals/weekly.mjs'

const ids=['dim-biz','dim-fin','dim-health','dim-family','dim-job','dim-leisure','dim-growth']
const fixture=()=>({dimensions:ids.map((id,i)=>({id,name:id==='dim-job'?'本業（950157）':id,layer:['engine','engine','base','base','base','sustain','sustain'][i],progress:i===2?55:null,initializedAt:i===2?'2026-11-10T00:00:00Z':undefined,totalGoal:'合成十年方向',nowSummary:'正式評估的現在在哪',nextStep:'正式評估的下一步',currentState:{note:'舊現況不可顯示'},subGoals:[{name:'舊子項不可顯示'}]}))})

test('summary reads actual assessment fields, preserves null and real zero, and hides internal job name',()=>{
 const d=fixture(),r=goalPageSummary(d)
 assert.equal(r.assessed,1);assert.equal(r.dimensions[2].score,55)
 assert.equal(r.dimensions.filter(x=>x.score===null).length,6)
 assert.equal(r.dimensions[4].name,'本業');assert.equal(r.dimensions[4].bot,'本業')
 assert.equal(r.dimensions[0].nowSummary,d.dimensions[0].nowSummary)
 assert.equal(r.dimensions[0].nextStep,d.dimensions[0].nextStep)
 d.dimensions[2].progress=0;assert.equal(goalPageSummary(d).dimensions[2].score,0)
 d.dimensions[2].progress=null;assert.equal(goalPageSummary(d).assessed,0)
})

test('weekly direction uses stored week, labels stale records, and does not invent birth date',()=>{
 assert.deepEqual(weeklyRange('w-2026-01'),{start:'2025-12-29',end:'2026-01-04'})
 assert.equal(weeklyView({entries:[{id:'w-2026-47',writtenAt:'2026-11-09T23:30:00Z'}]}).updatedDate,'2026-11-10');
 assert.equal(weeklyRange('bad'),null);assert.equal(weeksUntilFifty(null),null)
 const r=weeklyView({entries:[{id:'w-2026-37',text:'舊方向'},{id:'w-2026-47',text:'下週的一小步'}]},Date.parse('2026-11-10T00:00:00Z'))
 assert.equal(r.entry.text,'下週的一小步');assert.equal(r.title,'下週方向');assert.equal(r.stale,false)
 assert.equal(weeklyView({entries:[{id:'w-2026-37'}]},Date.parse('2026-11-10')).stale,true)
})

const require=createRequire(import.meta.url)
const compiled=buildSync({stdin:{contents:"export { GoalsContent } from './src/pages/Goals.jsx'; export { WeeklyDirectionContent } from './src/life-goals/WeeklyDirection.jsx';",resolveDir:process.cwd(),loader:'jsx'},bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',external:['react','react-dom','react-router-dom','lucide-react'],loader:{'.css':'empty'},define:{'import.meta.env':'{}'}})
const mod=new Module(new URL('./compiled-goals.cjs',import.meta.url).pathname)
mod.filename=new URL('./compiled-goals.cjs',import.meta.url).pathname
mod.paths=modulePaths();mod._compile(compiled.outputFiles[0].text,mod.filename)
function modulePaths(){return [new URL('../node_modules',import.meta.url).pathname]}
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{MemoryRouter}=require('react-router-dom')
export function renderOverview(doc=fixture(),weekly={entries:[]}) {
 const w=React.createElement(mod.exports.WeeklyDirectionContent,{document:weekly,status:'loaded'})
 return renderToStaticMarkup(React.createElement(MemoryRouter,null,React.createElement(mod.exports.GoalsContent,{document:doc,status:'loaded',weekly:w})))
}
test('actual page renders seven four-line cards, one assessment counter, and initially closed details',()=>{
 const html=renderOverview(),text=html.replace(/<[^>]+>/g,'')
 assert.equal((html.match(/class="goals-four-lines"/g)||[]).length,7)
 assert.equal((html.match(/<dt>/g)||[]).length,49) // 28 summary + 21 hidden full-detail labels.
 assert.ok(text.includes('已評分 1/7 維'));assert.ok(text.includes('55'))
 for(const forbidden of ['950157','mock','人生自由指數','舊現況不可顯示','舊子項不可顯示','0%'])assert.ok(!text.includes(forbidden),forbidden)
 assert.ok(!/<details[^>]*\sopen(?:\s|>)/.test(html))
 assert.equal((html.match(/<summary>細節<\/summary>/g)||[]).length,7)
 assert.equal((html.match(/最近三筆評分紀錄/g)||[]).length,7)
})
