export const OFFICE_TABS = [['overview','概況'],['meeting','會議室'],['execution','執行計畫'],['outputs','成果與審查'],['log','工作日誌']]
// One job per tab; decisions and approvals only on 概況, messages and attachments only in 會議室.
export const TAB_NOTES = { overview:'現在怎樣、你要決定什麼。核准與驗收只在這裡做。', meeting:'和 PI 溝通的唯一入口。意見與附件都從這裡送出。', execution:'已核准的時程與兩份規劃書。規劃變更請到會議室提出。', outputs:'成果報告與獨立審查。PASS 只代表內容通過，不等於核准。', log:'所有事件依時間排列，只能追加、不能修改。' }
export const isPending = a => a.status==='OPEN' && ['HY','owner'].includes(a.assigned_to)
export const PROJECT_STATUS = { ai_pending:'待 AI 接手中', ai_running:'進行中', confirmation:'等待確認', completed:'完成' }
export function activityLabel(project) {
  if (project?.system_blockers?.length) return '系統阻塞'
  if (typeof project?.activity?.label === 'string' && project.activity.label.trim()) return project.activity.label
  const active=(project?.packages || []).filter(p=>['READY','RUNNING'].includes(p.status) && p.type!=='PROJECT_REPORT' && !p.context?.superseded && !String(p.milestone_id || '').startsWith('PARKED:'))
  if (active.length && active.every(p=>p.type==='QUALITY_REVIEW' && p.executor==='CLAUDE_REVIEW')) return active.some(p=>p.status==='RUNNING')?'Claude 品質審查中':'待 Claude 品質審查'
  return PROJECT_STATUS[project?.status] || project?.status || '狀態尚未讀取'
}
export const PACKAGE_STATUS = { WAITING:'等待前置', READY:'待接手', RUNNING:'執行中', BLOCKED:'阻塞', COMPLETED:'完成', FAILED:'失敗' }
export const isWork = p => !['PROJECT_PLANNING','REVISION','PROJECT_REPORT','QUALITY_REVIEW','CLOSURE_REPORT','SPEC_CHANGE_PLANNING'].includes(p.type) && !String(p.milestone_id || '').startsWith('PARKED:')
export function progress(project) { const work=(project.packages || []).filter(isWork); return {done:work.filter(p=>p.status==='COMPLETED').length,total:work.length} }
export function milestones(project) {
  const plan=project.plan || project.packages?.find(p=>p.type==='PROJECT_PLANNING')?.result?.plan
  const ids=plan?.milestones?.map(m=>m.id) || [...new Set((project.packages || []).map(p=>p.milestone_id).filter(Boolean))]
  return ids.map(id=>({...(plan?.milestones?.find(m=>m.id===id)||{}),id,packages:(project.packages || []).filter(p=>p.milestone_id===id)}))
}
export function safeUrl(value) { try { const u=new URL(value);return u.protocol==='https:'?u.href:null }catch{return null} }
export const driveFile = id => id && /^[A-Za-z0-9_-]+$/.test(id) ? `https://drive.google.com/file/d/${id}/view` : null
const REQUESTER={PI:'PI',executor:'執行者'}
export const requester = value => REQUESTER[value] || 'AI Work 系統'   // 舊資料預設 requested_by='HY'，實際是系統建立
export const person = value => ['owner','HY','hy'].includes(value) ? 'HY' : value || 'HY'
export function journal(project) {
  const events=[]
  for(const p of project.packages || []) events.push({id:'package:'+p.id,at:p.created_at,actor:'Mission Engine',kind:'system',text:'建立工作包：'+p.task,work:p.id,milestone:p.milestone_id,detail:PACKAGE_STATUS[p.status] || p.status})
  for(const a of project.actions || []) {events.push({id:'request:'+a.action_id,at:a.created_at,actor:requester(a.requested_by),kind:'system',text:'建立正式事項：'+a.title,action:a.status==='OPEN'?a.action_id:null,work:a.package_id});if(a.resolved_at)events.push({id:'answer:'+a.action_id,at:a.resolved_at,actor:person(a.resolved_by),kind:'human',text:'處理正式事項：'+a.title,detail:typeof a.answer==='string'?a.answer:JSON.stringify(a.answer)})}
  for(const n of project.notes || [])events.push({id:n.id,at:n.created_at,actor:n.author==='system:review'?'審查系統':n.author==='system:router'?'Router 系統':person(n.author),kind:n.author==='system:review'?'notification':n.author==='system:router'?'system':'human',text:n.content})
  for(const n of project.suggestions || [])events.push({id:n.id,at:n.created_at,actor:person(n.author),kind:'human',text:n.content,detail:n.state})
  for(const f of project.files || [])events.push({id:'file:'+f.file_id,at:f.created_at,actor:f.source,kind:'artifact',text:'登錄成果：'+f.filename,file:f.file_id})
  return events.filter(e=>e.at).sort((a,b)=>b.at-a.at || a.id.localeCompare(b.id))
}
