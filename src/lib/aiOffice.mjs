export const OFFICE_TABS = [['overview','專案概況'],['meeting','PI 會議室'],['execution','執行計畫'],['outputs','成果與審查'],['log','工作日誌']]
export const PROJECT_STATUS = { ai_pending:'待 AI 接手中', ai_running:'進行中', confirmation:'等待確認', completed:'完成' }
export function activityLabel(project) {
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
export function journal(project) {
  const events=[]
  for(const p of project.packages || []) events.push({id:'package:'+p.id,at:p.created_at,actor:'Mission Engine',kind:'system',text:'建立工作包：'+p.task,work:p.id,milestone:p.milestone_id,detail:PACKAGE_STATUS[p.status] || p.status})
  for(const a of project.actions || []) {events.push({id:'request:'+a.action_id,at:a.created_at,actor:a.requested_by || '系統',kind:'system',text:'建立正式事項：'+a.title,action:a.action_id,work:a.package_id});if(a.resolved_at)events.push({id:'answer:'+a.action_id,at:a.resolved_at,actor:a.resolved_by,kind:'human',text:'處理正式事項：'+a.title,action:a.action_id,detail:typeof a.answer==='string'?a.answer:JSON.stringify(a.answer)})}
  for(const n of project.notes || [])events.push({id:n.id,at:n.created_at,actor:n.author,kind:'human',text:n.content})
  for(const n of project.suggestions || [])events.push({id:n.id,at:n.created_at,actor:n.author,kind:'human',text:n.content,detail:n.state})
  for(const f of project.files || [])events.push({id:'file:'+f.file_id,at:f.created_at,actor:f.source,kind:'artifact',text:'登錄成果：'+f.filename,file:f.file_id})
  return events.filter(e=>e.at).sort((a,b)=>b.at-a.at || a.id.localeCompare(b.id))
}
