import {defaultRoute,identity,normalize,replaceRule} from './router.mjs'
export const AI_NAMES={gpt:'GPT',claude:'Claude',grok:'Grok'}
export function family(r){
 if(!r)return ''
 const p=[...new Set(r.providers||[])]
 if(p.length===1&&Object.hasOwn(AI_NAMES,p[0]))return p[0]
 const known={'gpt-chat':'gpt','chatgpt-work':'gpt','claude-review':'claude','grok-review':'grok'}
 return Object.hasOwn(known,r.id)?known[r.id]:''
}
export function eligible(runners,role,owner){
 return runners.filter(r=>family(r)&&r.ready&&r.execution_verified===true&&r.roles.includes(role)&&(!r.id.startsWith('owner-bot:')||r.id==='owner-bot:'+owner)&&!(role==='PLANNING'&&family(r)==='claude'))
}
export function choices(runners,role,owner,current='',excluded=''){
 const list=eligible(runners,role,owner).filter(r=>r.id!==excluded)
 return Object.entries(AI_NAMES).flatMap(([id,label])=>{
 const matches=list.filter(r=>family(r)===id),selected=matches.find(r=>r.id===current)||matches.find(r=>r.id===(role==='CODE'?'chatgpt-work':'gpt-chat'))||matches[0]
 return selected?[{id:selected.id,label}]:[]
 })
}
export function effectiveRoute(document,role,scope,scopeId,owner,defaults){
 const scopes=scope==='project'?[['project',scopeId],['owner',owner],['global','']]:scope==='owner'?[['owner',scopeId],['global','']]:[['global','']]
 for(const [s,id] of scopes)for(const key of [role,'*']){
 if(s==='global'&&key==='*'&&role!=='GENERAL')continue
 const rule=document.rules.find(r=>r.scope===s&&r.scope_id===id&&normalize(r.selector)===key)
 if(rule){const expand=x=>x.replace('{owner}',owner);return {...structuredClone(rule.route),primary:expand(rule.route.primary),fallbacks:rule.route.fallbacks.map(expand)}}
 }
 return defaultRoute(role,owner,defaults)
}
export function setAI(document,{role,scope,scopeId,owner,route,primary,fallback,runners,health}){
 if(!health)throw new Error('後端固定派工原則尚未就緒，請更新後端。')
 const ids=[primary,...(fallback?[fallback]:[])],allowed=eligible(runners,role,owner)
 if(new Set(ids).size!==ids.length||ids.some(id=>!allowed.some(r=>r.id===id)))throw new Error('所選 AI 尚未完成此角色的領包與交件驗證。')
 const symbolic=id=>scope==='global'?id.replace('owner-bot:'+owner,'owner-bot:{owner}'):id
 const value={...route,primary:symbolic(primary),fallbacks:fallback?[symbolic(fallback)]:[],models:Object.fromEntries(ids.map(id=>[symbolic(id),'session-default'])),health:{...health,auto_reassign_enabled:!!fallback},...(role==='PI_REVIEW'?{escalation:'user'}:{})}
 const rule={scope,scope_id:scope==='global'?'':scopeId,selector:role,route:value}
 return replaceRule(document,rule,identity(rule))
}
