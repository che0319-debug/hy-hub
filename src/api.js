import { authHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE || "";

async function apiJson(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
    cache: options.cache || 'no-store',
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || result.ok === false) throw new Error(result.error || `${path} failed: ${res.status}`)
  return result
}

export async function fetchPersonalData() {
  const res = await fetch(`${API_BASE}/api/personal-data`, { method: "GET", headers: { ...authHeaders() }, cache: 'no-store' });
  if (!res.ok) throw new Error(`fetchPersonalData failed: ${res.status}`);
  return res.json();
}
export async function postMilestone(payload) { return apiJson('/api/milestone', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) }) }
export async function fetchLifeGoals() { const r=await fetch(`${API_BASE}/api/life-goals`,{headers:{...authHeaders()},cache:'no-store'}); if(!r.ok) throw new Error(`fetchLifeGoals failed: ${r.status}`); return r.json() }
export async function fetchStrategyProjects() { const r=await fetch(`${API_BASE}/api/strategy-projects`,{headers:{...authHeaders()},cache:'no-store'}); if(!r.ok) throw new Error(`fetchStrategyProjects failed: ${r.status}`); return r.json() }
export async function saveStrategyProject(project) { return apiJson('/api/strategy-projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'upsert',project})}) }
export async function deleteStrategyProject(id) { return apiJson('/api/strategy-projects',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete',id})}) }
export async function assessFreedom() { return apiJson('/api/assess-freedom',{method:'POST'}) }
export async function saveLifeGoals(payload) { return apiJson('/api/life-goals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}) }
export async function fetchProfile() { const r=await fetch(`${API_BASE}/api/profile`,{headers:{...authHeaders()},cache:'no-store'}); if(!r.ok) throw new Error(`fetchProfile failed: ${r.status}`); return r.json() }
export async function saveProfile(payload) { return apiJson('/api/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}) }
export async function fetchPersona(bot) { const r=await fetch(`${API_BASE}/api/persona?bot=${encodeURIComponent(bot)}`,{headers:{...authHeaders()},cache:'no-store'}); if(!r.ok) throw new Error(`fetchPersona failed: ${r.status}`); return r.json() }
export async function savePersona(bot,payload){return apiJson(`/api/persona?bot=${encodeURIComponent(bot)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}
export async function fetchAgentTools(bot){const r=await fetch(`${API_BASE}/api/agent-tools?bot=${encodeURIComponent(bot)}`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchAgentTools failed: ${r.status}`);return r.json()}
export async function fetchAgentModels(){const r=await fetch(`${API_BASE}/api/agent-models`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchAgentModels failed: ${r.status}`);return r.json()}
export async function fetchDispatchSessions(){const r=await fetch(`${API_BASE}/api/dispatch-sessions`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchDispatchSessions failed: ${r.status}`);return r.json()}
export async function postDispatchSession(payload){return apiJson('/api/dispatch-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}
export async function deleteDispatchSession(milestoneId){const r=await fetch(`${API_BASE}/api/dispatch-session/${encodeURIComponent(milestoneId)}`,{method:'DELETE',headers:{...authHeaders()}});if(!r.ok)throw new Error(`deleteDispatchSession failed: ${r.status}`);return r.json()}
export async function saveBriefText(milestoneId,briefText){return apiJson('/api/dispatch-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({milestoneId,briefText})})}
export async function fireDispatch(milestoneId){return apiJson('/api/dispatch-fire',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({milestoneId})})}
export async function fetchWeeklyChange(){const r=await fetch(`${API_BASE}/api/weekly-change`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchWeeklyChange failed: ${r.status}`);return r.json()}
export async function postWeeklyChange(payload){return apiJson('/api/weekly-change',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})}
export async function dispatchContinue(milestoneId,ask){return apiJson('/api/dispatch-continue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({milestoneId,ask})})}
export async function fetchMemoryHealth(){const r=await fetch(`${API_BASE}/api/memory-health`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchMemoryHealth failed: ${r.status}`);return r.json()}
export async function fetchTodaySchedule(){const r=await fetch(`${API_BASE}/api/today-schedule`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchTodaySchedule failed: ${r.status}`);return r.json()}
export async function fetchMobileState(){const r=await fetch(`${API_BASE}/api/mobile/state`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchMobileState failed: ${r.status}`);return r.json()}
export async function fetchLifeOSContext(){const r=await fetch(`${API_BASE}/api/life-os/v1/context`,{headers:{...authHeaders()},cache:'no-store'});if(!r.ok)throw new Error(`fetchLifeOSContext failed: ${r.status}`);return r.json()}
export async function fetchAutonomousPlans(status='waiting_approval'){return apiJson(`/api/life-os/v1/autonomous-plans?owner=950157&status=${encodeURIComponent(status)}`)}
export async function decideAutonomousPlan(planId,decision,note=''){return apiJson(`/api/life-os/v1/autonomous-plans/${encodeURIComponent(planId)}/decision`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision,note})})}
export async function setMobileTaskCompleted(source,milestoneId,completed){return apiJson('/api/mobile/task-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source,milestoneId,completed})})}
export async function saveWeeklyPriorities(items){return apiJson('/api/mobile/weekly-priorities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({items})})}

export async function fetchAllMilestones() {
  const headers = { ...authHeaders() };
  const [hy,itri,family,sam] = await Promise.allSettled([
    fetch(`${API_BASE}/api/personal-progress`,{headers}).then(r=>r.json()),
    fetch(`${API_BASE}/api/950157-progress`,{headers}).then(r=>r.json()),
    fetch(`${API_BASE}/api/family-progress`,{headers}).then(r=>r.json()),
    fetch(`${API_BASE}/api/sam-progress`,{headers}).then(r=>r.json()),
  ]);
  const out=[]; const extract=(result,getProjects,source)=>{if(result.status!=="fulfilled")return;for(const p of getProjects(result.value)||[])for(const m of p.milestones||[])out.push({title:m.title,due:m.due||"",_source:source,_project:p.name})};
  extract(hy,v=>v.projects,"HY"); extract(itri,v=>v.projects,"950157"); extract(family,v=>v._kanban?.projects,"家庭"); extract(sam,v=>v._kanban?.projects,"Sam");
  return out;
}
