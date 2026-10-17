import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {choices,effectiveRoute,setAI,family} from '../src/lib/simpleRouter.mjs'
const view=JSON.parse(fs.readFileSync(new URL('./fixtures/router-view.json',import.meta.url)))
const runners=view.runners.map(r=>({...r,execution_verified:true}))
const args={role:'REVIEW',scope:'global',scopeId:'',owner:'hy',route:{primary:'claude-review',fallbacks:['grok-review']},primary:'grok-review',fallback:'claude-review',runners,health:view.simple_health_defaults}
test('three AI names, actual role capabilities and successful execution are required',()=>{
 assert.deepEqual(choices(runners,'REVIEW','hy').map(c=>c.label),['GPT','Claude','Grok'])
 assert.deepEqual(choices(runners.map(r=>({...r,execution_verified:false})),'REVIEW','hy'),[])
 assert.deepEqual(choices(runners,'CODE','hy').map(c=>c.id),['chatgpt-work'])
 assert(!choices(runners,'PLANNING','hy').some(c=>c.label==='Claude'))
 assert.equal(family({id:'__proto__',providers:['unrecognized']}),'')
})
test('editing one role follows schedule models, server defaults and preserves all unrelated rules',()=>{
 const document={rules:[{scope:'project',scope_id:'p',selector:'DOCUMENT',route:{primary:'gpt-chat',fallbacks:[]}}]},before=JSON.stringify(document)
 const updated=setAI(document,args)
 assert.equal(JSON.stringify(document),before)
 assert.deepEqual(updated.rules[0],document.rules[0])
 const route=updated.rules[1].route
 assert.deepEqual(route.models,{'grok-review':'session-default','claude-review':'session-default'})
 assert.equal(route.health.unclaimed_threshold,3);assert.equal(route.health.auto_reassign_enabled,true)
 assert.deepEqual(setAI(document,{...args,fallback:''}).rules[1].route.fallbacks,[])
})
test('missing backend settings, unknown, unverified and duplicate runners cannot be saved',()=>{
 for(const patch of [{health:null},{primary:'invented'},{fallback:'grok-review'},{runners:runners.map(r=>({...r,ready:false}))}])assert.throws(()=>setAI({rules:[]},{...args,...patch}))
})
test('inheritance follows project then owner then global, including scope defaults',()=>{
 const rule=(scope,scope_id,selector,primary)=>({scope,scope_id,selector,route:{primary,fallbacks:[]}})
 let document={rules:[rule('global','','REVIEW','claude-review'),rule('owner','sam','*','grok-review')]}
 assert.equal(effectiveRoute(document,'REVIEW','project','p','sam',view.role_defaults).primary,'grok-review')
 document.rules.push(rule('project','p','REVIEW','gpt-review-independent'))
 assert.equal(effectiveRoute(document,'REVIEW','project','p','sam',view.role_defaults).primary,'gpt-review-independent')
 assert.equal(effectiveRoute({rules:[rule('global','','*','grok-review')]},'REVIEW','global','','hy',view.role_defaults).primary,'claude-review')
})
