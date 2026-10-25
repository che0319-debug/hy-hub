import test from 'node:test'
import assert from 'node:assert/strict'
import {officeView,officeEvents,officeTime} from '../src/lib/botOfficeView.mjs'
const make=source=>({id:'p',title:'Project',stage:'assigned',stageLabel:'等 HY 回答',ownerBot:'sam',active:false,pending:true,team:[],allDecisions:[],logs:[],requests:[],source})
test('Office visual adapter preserves actual structured plans, work and HTML without inventing missing records',()=>{
 const raw={goal:'Goal',plan:{goal:'Goal',milestones:[{id:'M1'}]},packages:[{id:'w',task:'Work',dependencies:['previous']}],report:{latest:{file_id:'f',html:'<h1>HTML</h1>'}},opened_at:'2026-10-25T08:00:00+08:00'}
 const before=JSON.stringify(raw), v=officeView(make(raw))
 assert.equal(v.plan,raw.plan);assert.equal(v.report,raw.report);assert.deepEqual(v.packages[0].dependencies,['previous']);assert.equal(v.started_at,1792886400);assert.equal(JSON.stringify(raw),before)
 const missing=officeView(make({}));assert.equal(missing.plan,null);assert.equal(missing._rawPackages,undefined);assert.deepEqual(missing.packages,[]);assert.deepEqual(missing.report,{})
})
test('Office journal preserves human/Bot distinction, actual event categories and ordering',()=>{
 const p=make({events:[{id:'e',kind:'artifact',at:'2026-10-25T09:00:00+08:00',text:'Registered'}]})
 p.logs=[{id:'bot',actor:'owner',answered_by:'hy',at:'2026-10-25T08:00:00+08:00',content:'Bot log'},{id:'human',actor:'hy',at:'2026-10-25T07:00:00+08:00',content:'Human log'}]
 p.allDecisions=[{id:'d',title:'Question',status:'open',history:[{at:'2026-10-25T08:30:00+08:00',actor:'hy',answer:'Answer'}]}]
 const e=officeEvents(p);assert.deepEqual(e.map(x=>x.id),['e','d:0','bot','human']);assert.equal(e[2].actor,'HY Bot');assert.equal(e[3].actor,'HY');assert.equal(e[0].kind,'artifact');assert.equal(e[1].action,'d')
 assert.equal(officeTime('invalid'),null)
})

test('Execution interaction stays identical to AIOfficeV1; styles import the original instead of a fork',async()=>{
 const {readFile}=await import('node:fs/promises')
 const ai=await readFile(new URL('../src/pages/AIOfficeV1.jsx',import.meta.url),'utf8')
 const bot=await readFile(new URL('../src/components/BotOfficePanels.jsx',import.meta.url),'utf8')
 const original=ai.slice(ai.indexOf('function Execution('),ai.indexOf('function Results(')).trim()
 const copied=bot.slice(bot.indexOf('export function OfficeExecution('),bot.indexOf('// HTML is supplied')).trim().replace('export function OfficeExecution(', 'function Execution(')
 assert.equal(copied,original)
 const css=await readFile(new URL('../src/pages/bot-office.css',import.meta.url),'utf8')
 assert.match(css,/@import url\('\.\/ai-office-v1\.css'\)/);assert(!css.includes('.ao-tabs'));assert(!css.includes('--hy-brand:'))
})
