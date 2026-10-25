const list = value => Array.isArray(value) ? value : []
export const officeTime = value => { const n = typeof value === 'number' ? value : Date.parse(value) / 1000; return Number.isFinite(n) && n > 0 ? n : null }
export function officeView(project) {
 const p = project.source || {}
 const packages = list(p.packages).filter(x => x && typeof x === 'object').map(w => ({...w, dependencies:list(w.dependencies)}))
 const actions = project.allDecisions.map(d => ({action_id:d.id,project_id:project.id,title:d.title,status:d.status==='open'?'OPEN':'RESOLVED',assigned_to:'HY',created_at:officeTime(d.created_at),resolved_at:officeTime(d.answeredAt),answer:d.answer}))
 return {...p,_rawPackages:p.packages,id:project.id,title:project.title,goal:p.goal || '',owner_bot:project.ownerBot,status:project.stage==='done'?'completed':project.pending?'confirmation':project.active?'ai_running':'ai_pending',phase:p.phase || project.stageLabel,activity:{label:project.stageLabel},packages,actions,plan:p.plan || null,plan_revision:p.plan_revision,plan_state:p.plan_state,started_at:officeTime(p.started_at || p.opened_at),updated_at:officeTime(p.updated_at),notes:[],suggestions:[],files:list(p.files),team:project.team,quality:p.quality || {},report:p.report || {},system_blockers:list(p.system_blockers)}
}
export function officeEvents(project) {
 const p=project.source || {}, events=[]
 for(const l of project.logs) events.push({id:l.id,at:officeTime(l.at),actor:l.actor==='hy'?'HY':l.answered_by==='hy'?'HY Bot':l.answered_by || 'Bot',kind:'human',text:l.content})
 for(const r of project.requests) events.push({id:r.id,at:officeTime(r.created_at),actor:r.created_by==='hy'?'HY':'專案流程',kind:'human',text:r.payload?.content || r.payload?.title || '',detail:r.status==='open'?'已送出':r.status})
 for(const d of project.allDecisions) for(const [i,h] of (d.history || []).entries()) events.push({id:d.id+':'+i,at:officeTime(h.at),actor:h.actor==='hy'?'HY':h.answered_by==='hy'?'HY Bot':h.answered_by || 'Bot',kind:'human',text:d.title,detail:typeof h.answer==='string'?h.answer:h.action,action:d.status==='open'?d.id:null})
 for(const e of list(p.events)) if(e && e.id) events.push({...e,at:officeTime(e.at)})
 return events.filter(e=>e.at).sort((a,b)=>b.at-a.at || String(a.id).localeCompare(String(b.id)))
}
