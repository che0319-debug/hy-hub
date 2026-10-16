export const OWNERS = [['hy','HY'],['950157','950157'],['sam','Sam'],['family','小因']]
export const ROLES = [['PLANNING','規劃'],['GENERAL','一般工作'],['CODE','程式'],['REVIEW','交件外審'],['PI_REVIEW','里程碑 PI 審核'],['*','範圍預設']]
export const LABELS = {'gpt-chat':'GPT Chat','chatgpt-work':'ChatGPT Work','claude-review':'Claude','grok-review':'Grok Bot',...Object.fromEntries(OWNERS.map(([id,name])=>['owner-bot:'+id,name+' owner bot']))}
export const label = id => (Object.hasOwn(LABELS,id)?LABELS[id]:id) || '無備援'
export const when = time => time ? new Date(time*1000).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}) : '尚無紀錄'
export function roleOf(value){const type=(value||'').trim().toUpperCase();return ['CODE','IMPLEMENTATION','CODING','BUGFIX','BUG_FIX','REFACTOR','DEPLOYMENT','FRONTEND','BACKEND'].includes(type)?'CODE':['PROJECT_PLANNING','SPEC_CHANGE_PLANNING'].includes(type)?'PLANNING':['QUALITY_REVIEW','CLAUDE_REVIEW'].includes(type)?'REVIEW':ROLES.some(([id])=>id===type)?type:'GENERAL'}
export const normalize = type => ['CODE','PLANNING','REVIEW'].includes(roleOf(type)) ? roleOf(type) : type.trim().toUpperCase()
export const identity = rule => JSON.stringify([rule.scope,rule.scope_id,normalize(rule.selector)])
export const defaultRoute = (role,owner='hy') => ({primary:({PLANNING:'gpt-chat',GENERAL:'gpt-chat',CODE:'chatgpt-work',REVIEW:'claude-review',PI_REVIEW:'owner-bot:'+owner})[role] || 'gpt-chat',fallbacks:role==='GENERAL'?['chatgpt-work']:role==='REVIEW'?['grok-review']:[],...(role==='PI_REVIEW'?{escalation:'user'}:{})})
export function validateRule(rule, document, catalog, defaults) {
 const errors=[],role=roleOf(rule.selector),route=rule.route,h={...defaults,...route.health}
 if(!rule.selector.trim()||rule.selector.length>64)errors.push('請填寫工作角色或類型（最多 64 字）。')
 if(!['global','owner','project'].includes(rule.scope)||rule.scope!=='global'&&!rule.scope_id)errors.push('請選擇設定範圍。')
 if(document.rules.some(r=>identity(r)===identity(rule)))errors.push('相同範圍已有這一列，請編輯原列。')
 if(['PLANNING','CODE'].includes(role)&&route.fallbacks.length)errors.push('規劃與程式不允許備援。')
 if(role==='PI_REVIEW'&&(rule.scope==='global'||route.fallbacks.length||!route.primary.startsWith('owner-bot:')))errors.push('PI 審核須指定所屬 owner，僅升級使用者。')
 if(new Set([route.primary,...route.fallbacks]).size!==1+route.fallbacks.length)errors.push('主端與備援不可重複。')
 if(route.fallbacks.length>3)errors.push('備援最多三個。')
 for(const id of [route.primary,...route.fallbacks]){
  const runner=catalog.find(x=>x.id===id)
  if(!runner?.roles.includes(role==='*'?'GENERAL':role))errors.push(`${label(id)} 不支援這個工作角色。`)
  if(!runner?.ready)errors.push(`${label(id)} 未就緒，請先完成可信身分與能力配置。`)
  if(role==='PLANNING'&&(id.toLowerCase().includes('claude')||runner?.providers.some(p=>p!=='gpt')))errors.push('規劃只能使用 GPT，不能交給 Claude。')
 }
 for(const key of ['window_size','min_samples','unclaimed_threshold'])if(!Number.isInteger(h[key])||h[key]<1||h[key]>100)errors.push(`${key} 須為 1–100 的整數。`)
 if(h.min_samples>h.window_size)errors.push('最少樣本不可超過窗口 N。')
 for(const key of ['window_seconds','unclaimed_after_seconds','cooldown_seconds'])if(!Number.isInteger(h[key])||h[key]<1||h[key]>604800)errors.push(`${key} 須為 1–604800 秒。`)
 for(const key of ['timeout_rate','error_rate'])if(!Number.isFinite(h[key])||h[key]<=0||h[key]>1)errors.push('比率門檻須大於 0%、不超過 100%。')
 if(!Number.isInteger(h.max_reassignments)||h.max_reassignments<0||h.max_reassignments>3)errors.push('改派上限須為 0–3。')
 return [...new Set(errors)]
}
export function replaceRule(document,rule,editingKey=null){
 const copy=structuredClone(document),normalized={...rule,selector:normalize(rule.selector)}
 copy.rules=copy.rules.filter(r=>identity(r)!==editingKey)
 copy.rules.push(normalized)
 return copy
}
export const removeRule = (document,key) => ({...document,rules:document.rules.filter(r=>identity(r)!==key)})
export function describeSource(source){
 if(!source)return '尚無紀錄'
 if(source==='frozen-route-snapshot')return '包內凍結規則'
 if(!source.includes(':'))return source
 if(source.startsWith('builtin:'))return '系統預設'
 const [scope,id,type]=source.split(':')
 return `${({global:'全域',owner:'owner',project:'專案'})[scope] || scope}${id?' '+(OWNERS.find(([key])=>key===id)?.[1] || id):''} · ${ROLES.find(([key])=>key===type)?.[1] || type}`
}
const REASONS = {FROZEN_FALLBACK_AUTHORIZED:'主端達健康門檻，依凍結授權改派備援',AUTO_REASSIGN_PAUSED:'運維已暫停自動改派',AUTO_REASSIGN_DISABLED:'此包未授權自動改派',MAX_REASSIGNMENTS:'已達此包的自動改派上限',NO_FALLBACK:'此包沒有備援',NOT_READY_OR_LOCKED:'尚未重新可領，或仍有執行鎖',HUMAN_ACTION_PENDING:'等待使用者處理正式事項',EXECUTION_HISTORY_INCOMPLETE:'歷次執行紀錄不足，需使用者確認',TERMINAL_EVIDENCE_MISSING:'缺少執行終結證據，停止交接',RETRY_NOT_VERIFIED:'此重試情境未通過安全交接驗證',EXTERNAL_EFFECT_WITHOUT_ACCEPTED_OUTPUT:'外部寫入尚無合法收據，需使用者確認',UNRECEIPTED_FILE_OR_PR:'檔案或 PR 副作用待核對',REVIEW_LINK_INCONSISTENT:'受審版本關聯不一致，停止交接',NO_ELIGIBLE_INDEPENDENT_FALLBACK:'沒有相容、未冷卻且獨立的備援'}
export const reasonText = value => (Object.hasOwn(REASONS,value)?REASONS[value]:value) || '尚無紀錄'
export function eventText(event){
 const b=event.body||{}
 const names={ASSIGNED:'建立派工',CLAIMED:'領取工作包',TERMINAL:'交件或鎖回收',UNCLAIMED:'超時未領',COOLED:'進入冷卻',RECOVERED:'冷卻到期恢復',REASSIGNED:'備援改派',NOT_REASSIGNED:'保留原派工',OWNER_REVIEW_TIMEOUT:'owner 審核逾時',ARCHIVED:'稽核歸檔',ATTEMPT_ERROR:'執行工具錯誤'}
 return `${names[event.kind]||event.kind}${b.old_runner?'：'+label(b.old_runner)+' → '+label(b.new_runner||b.old_runner):'：'+label(event.runner_id)}${b.reason?'；'+reasonText(b.reason):''}`
}
