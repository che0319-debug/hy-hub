import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {defaultRoute,identity,validateRule,replaceRule,removeRule,normalize,roleOf,when,describeSource,eventText,label,reasonText} from '../src/lib/router.mjs'
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/router-view.json',import.meta.url)))
const rule=(selector='GENERAL',route=defaultRoute(selector))=>({scope:'global',scope_id:'',selector,route})
const valid = candidate => validateRule(candidate,{rules:[]},fixture.runners,fixture.health_defaults)
for(const [role,primary,fallbacks] of [['PLANNING','gpt-chat',[]],['GENERAL','gpt-chat',['chatgpt-work']],['CODE','chatgpt-work',[]],['REVIEW','claude-review',['grok-review']],['PI_REVIEW','owner-bot:sam',[]]])test('confirmed default '+role,()=>{assert.deepEqual(defaultRoute(role,'sam').primary,primary);assert.deepEqual(defaultRoute(role,'sam').fallbacks,fallbacks)})
test('compatible independent GPT review is permitted without adding a runner',()=>assert.deepEqual(valid(rule('REVIEW',{primary:'gpt-review-independent',fallbacks:[]})),[]))
test('planning rejects Claude and provider mismatch',()=>assert(valid(rule('PLANNING',{primary:'claude-review',fallbacks:[]})).length))
test('CODE and planning prohibit fallbacks',()=>{for(const type of ['CODE','PLANNING'])assert(valid(rule(type,{...defaultRoute(type),fallbacks:['chatgpt-work']})).length)})
test('unknown and unready runner is rejected without hidden fallback',()=>{assert(valid(rule('GENERAL',{primary:'invented',fallbacks:[]})).length);const catalog=fixture.runners.map(r=>({...r,ready:false}));assert(validateRule(rule(),{rules:[]},catalog,fixture.health_defaults).length)})
test('duplicate aliases cannot evade same scope identity',()=>{const one=rule('CODE');assert.equal(identity(one),identity(rule('BUGFIX')));assert(validateRule(rule('BUGFIX'),{rules:[one]},fixture.runners,fixture.health_defaults).length);assert.equal(normalize('spec_change_planning'),'PLANNING')})
test('owner/proj scope missing id and global PI override rejected',()=>{assert(valid({...rule(),scope:'owner'}).length);assert(valid(rule('PI_REVIEW')).length);assert.deepEqual(valid({...rule('PI_REVIEW',defaultRoute('PI_REVIEW','sam')),scope:'owner',scope_id:'sam'}),[])})
for(const [key,value] of [['window_size',0],['window_size',101],['min_samples',101],['window_seconds',604801],['cooldown_seconds',0],['timeout_rate',0],['error_rate',1.01],['error_rate',NaN],['max_reassignments',4],['unclaimed_threshold',1.1]])test('bounded health '+key+'='+value,()=>assert(valid(rule('GENERAL',{...defaultRoute('GENERAL'),health:{[key]:value}})).length))
test('minimum samples cannot exceed N',()=>assert(valid(rule('GENERAL',{...defaultRoute('GENERAL'),health:{window_size:1,min_samples:2}})).length))
test('draft replace/delete preserve other scopes without rewriting fixtures',()=>{const original={rules:[rule(),{...rule('CODE'),scope:'owner',scope_id:'sam'}]},before=JSON.stringify(original);const updated=replaceRule(original,rule('GENERAL',{primary:'chatgpt-work',fallbacks:[]}),identity(rule()));assert.equal(updated.rules.length,2);assert.equal(JSON.stringify(original),before);const reverted=removeRule(updated,identity(rule()));assert.deepEqual(reverted.rules,[original.rules[1]])})
test('times use Taiwan regardless of browser timezone and missing data is explicit',()=>{assert.match(when(1792137600),/16:00:00/);assert.equal(when(null),'尚無紀錄');assert.equal(describeSource('owner:sam:GENERAL'),'owner Sam · 一般工作');assert.equal(roleOf('REVISION'),'GENERAL')})
test('cooldown/recovery/reassignment events remain facts, no quota diagnosis',()=>{assert.match(eventText({kind:'REASSIGNED',runner_id:'gpt-chat',body:{old_runner:'gpt-chat',new_runner:'chatgpt-work',reason:'frozen'}}),/GPT Chat → ChatGPT Work/);assert.match(eventText({kind:'RECOVERED',runner_id:'gpt-chat'}),/冷卻到期恢復/)})

test('Router notes are system events, never attributed to a human',async()=>{const {journal}=await import('../src/lib/aiOffice.mjs');const events=journal({notes:[{id:'r',author:'system:router',content:'派工',created_at:1}]});assert.equal(events[0].kind,'system');assert.equal(events[0].actor,'Router 系統')})

test('names and free-text reasons never resolve Object prototype members',()=>{for(const name of ['__proto__','constructor','toString']){assert.equal(label(name),name);assert.equal(reasonText(name),name)}})
test('sub-one-percent positive thresholds match backend bounds',()=>assert.deepEqual(valid(rule('GENERAL',{...defaultRoute('GENERAL'),health:{error_rate:0.005,timeout_rate:0.001}})),[]))
