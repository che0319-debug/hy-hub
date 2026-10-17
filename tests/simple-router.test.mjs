import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {AI_OPTIONS,choices,effectiveRoute,setAI,family,aiValue} from '../src/lib/simpleRouter.mjs'
const view=JSON.parse(fs.readFileSync(new URL('./fixtures/router-view.json',import.meta.url)))
const args={role:'REVIEW',scope:'global',scopeId:'',owner:'hy',route:{primary:'claude-review',fallbacks:[]},primary:'gpt',fallback:'claude',health:view.simple_health_defaults,targets:view.ai_targets}
test('every role and both selects always have exactly none GPT Claude',()=>{
 for(const role of ['PLANNING','GENERAL','CODE','REVIEW'])for(const runners of [view.runners,[],view.runners.map(r=>({...r,ready:false,execution_verified:false}))])assert.deepEqual(choices(runners,role,'hy'),AI_OPTIONS)
 assert.deepEqual(AI_OPTIONS.map(x=>x.label),['無','GPT','Claude'])
 assert.equal(family({id:'__proto__',providers:['unrecognized']}),'')
})
test('one review selection replaces old separate PI settings and preserves other scopes',()=>{
 const document={rules:[{scope:'project',scope_id:'p',selector:'DOCUMENT',route:{primary:'gpt-chat',fallbacks:[]}},{scope:'global',scope_id:'',selector:'PI_REVIEW',route:{primary:'owner-bot:hy',fallbacks:[]}}]},before=JSON.stringify(document)
 const updated=setAI(document,args)
 assert.equal(JSON.stringify(document),before);assert.deepEqual(updated.rules[0],document.rules[0]);assert(!updated.rules.some(r=>r.selector==='PI_REVIEW'))
 assert.deepEqual(updated.rules[1].route.models,{'gpt-chat':'session-default','claude-review':'session-default'})
 assert.equal(updated.rules[1].route.escalation,'user')
})
test('Claude is selectable for planning and code without prior execution gate',()=>{
 for(const role of ['PLANNING','GENERAL','CODE']){const result=setAI({rules:[]},{...args,role,primary:'claude',fallback:'gpt'}).rules[0].route;assert.equal(result.primary,'claude-worker');assert.deepEqual(result.fallbacks,[role==='CODE'?'chatgpt-work':'gpt-chat'])}
})
test('none pauses new dispatch and does not silently promote backup',()=>{
 const route=setAI({rules:[]},{...args,primary:'',fallback:'claude'}).rules[0].route
 assert.equal(route.primary,'none');assert.equal(route.health.auto_reassign_enabled,false);assert.deepEqual(route.fallbacks,['claude-review'])
 assert.equal(aiValue('none',view.runners),'')
})
test('invalid names, missing backend contract and duplicate AI are rejected',()=>{
 for(const patch of [{health:null},{targets:null},{primary:'grok'},{fallback:'gpt'}])assert.throws(()=>setAI({rules:[]},{...args,...patch}))
})
test('inheritance follows project then owner then global',()=>{
 const rule=(scope,scope_id,primary)=>({scope,scope_id,selector:'REVIEW',route:{primary,fallbacks:[]}})
 const document={rules:[rule('global','','claude-review'),rule('owner','sam','gpt-chat')]}
 assert.equal(effectiveRoute(document,'REVIEW','project','p','sam',view.role_defaults).primary,'gpt-chat')
})
