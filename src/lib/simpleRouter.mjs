import {defaultRoute,identity,normalize,replaceRule} from './router.mjs'
export const AI_NAMES={gpt:'GPT',claude:'Claude',grok:'Grok'}
export const AI_OPTIONS=[{id:'',label:'無'},{id:'gpt',label:'GPT'},{id:'claude',label:'Claude'},{id:'grok',label:'Grok'}]
export function family(r){
 if(!r||r.id==='none'||String(r.id||'').startsWith('owner-bot:'))return ''
 const known={'grok':'grok','grok-review':'grok','gpt-chat':'gpt','chatgpt-work':'gpt','gpt-review-independent':'gpt','claude-worker':'claude','claude-review':'claude'}
 if(Object.hasOwn(known,r.id))return known[r.id]
 const p=[...new Set(r.providers||[])]
 return p.length===1&&Object.hasOwn(AI_NAMES,p[0])?p[0]:''
}
export const choices=()=>AI_OPTIONS
export const aiValue=(id,runners)=>family(runners.find(r=>r.id===id)||{id})
export function effectiveRoute(document,role,scope,scopeId,owner,defaults){
 const scopes=scope==='project'?[['project',scopeId],['owner',owner],['global','']]:scope==='owner'?[['owner',scopeId],['global','']]:[['global','']]
 for(const [s,id] of scopes)for(const key of [role,'*']){
 if(s==='global'&&key==='*'&&role!=='GENERAL')continue
 const rule=document.rules.find(r=>r.scope===s&&r.scope_id===id&&normalize(r.selector)===key)
 if(rule){const expand=x=>x.replace('{owner}',owner);return {...structuredClone(rule.route),primary:expand(rule.route.primary),fallbacks:rule.route.fallbacks.map(expand)}}
 }
 return defaultRoute(role,owner,defaults)
}
export function setAI(document,{role,scope,scopeId,route,primary,fallback,health,targets}){
 if(!health||!targets?.[role])throw new Error('後端統一派工尚未就緒，請更新後端。')
 if(!AI_OPTIONS.some(x=>x.id===primary)||!AI_OPTIONS.some(x=>x.id===fallback))throw new Error('請選擇無、GPT、Claude 或 Grok。')
 if(primary&&primary===fallback)throw new Error('主力與備案不可是同一個 AI。')
 const target=targets[role],main=target[primary||'none'],backup=fallback?target[fallback]:null
 if(!main||fallback&&!backup)throw new Error('後端尚未提供所選 AI 的派工對應，請更新後端。')
 const ids=[main,...(backup?[backup]:[])].filter(id=>id!=='none')
 const value={...route,primary:main,fallbacks:backup?[backup]:[],models:Object.fromEntries(ids.map(id=>[id,'session-default'])),health:{...health,auto_reassign_enabled:!!primary&&!!backup},escalation:role==='REVIEW'?'user':null}
 const rule={scope,scope_id:scope==='global'?'':scopeId,selector:role,route:value}
 // One visible review policy drives both deliverable and milestone checks.
 const base=role==='REVIEW'?{...document,rules:document.rules.filter(r=>!(r.scope===scope&&r.scope_id===rule.scope_id&&r.selector==='PI_REVIEW'))}:document
 return replaceRule(base,rule,identity(rule))
}
