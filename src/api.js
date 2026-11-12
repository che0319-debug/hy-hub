import { authHeaders } from './auth'
import { parseOfficeSettings } from './lib/officeAiDefaults.mjs'
import { extractKanbanMilestones } from './lib/officeKanban.mjs'

const API_BASE = import.meta.env.VITE_API_BASE || "";

export async function fetchPersonalData() {
  const res = await fetch(`${API_BASE}/api/personal-data`, {
    method: "GET",
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`fetchPersonalData failed: ${res.status}`);
  }
  return res.json();
}

export async function postMilestone(payload) {
  const res = await fetch(`${API_BASE}/api/milestone`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`postMilestone failed: ${res.status}`);
  return res.json();
}

export async function fetchLifeGoals() {
  const res = await fetch(`${API_BASE}/api/life-goals`, {
    method: "GET",
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchLifeGoals failed: ${res.status}`);
  return res.json();
}

export async function submitHumanGoals(requestId, operations) {
  const response = await fetch(`${API_BASE}/api/life-goals/human`, {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, operations }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) {
    const error = new Error(result.error === 'STALE_USER_EDIT' ? '內容已更新，請重新讀取後再修改。' : '請稍後重試。')
    error.definitive = response.status < 500 && result.error !== 'UNKNOWN_COMMIT_OUTCOME_RETRY_SAME_REQUEST'
    throw error
  }
  return result
}

export async function fetchLifeGoalsHistory(dimensionId) {
  const response = await fetch(`${API_BASE}/api/life-goals/history/${encodeURIComponent(dimensionId)}`, { headers: authHeaders(), cache: 'no-store' })
  const result = await response.json()
  if (!response.ok || !Array.isArray(result.history)) throw new Error('完整紀錄讀取失敗。')
  return result
}

export async function submitWeeklyGoalsControl(requestId, control) {
  const response = await fetch(`${API_BASE}/api/life-goals/weekly/control`, {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...control, requestId }),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok || !result.ok) {
    const error = new Error('週評分設定尚未確認，請重新讀取或重試。')
    error.definitive = response.status < 500 && result.error !== 'UNKNOWN_COMMIT_OUTCOME_RETRY_SAME_REQUEST'
    throw error
  }
  return result
}

export async function fetchStrategyProjects() {
  const res = await fetch(`${API_BASE}/api/strategy-projects`, {
    method: "GET",
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchStrategyProjects failed: ${res.status}`);
  return res.json();
}

export async function saveStrategyProject(project) {
  const res = await fetch(`${API_BASE}/api/strategy-projects`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upsert", project }),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `saveStrategyProject failed: ${res.status}`);
  return result;
}

export async function deleteStrategyProject(id) {
  const res = await fetch(`${API_BASE}/api/strategy-projects`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `deleteStrategyProject failed: ${res.status}`);
  return result;
}

export async function assessFreedom() {
  const res = await fetch(`${API_BASE}/api/assess-freedom`, {
    method: "POST",
    headers: { ...authHeaders() },
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `assessFreedom failed: ${res.status}`);
  return result;
}

export async function saveLifeGoals(payload) {
  const res = await fetch(`${API_BASE}/api/life-goals`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `saveLifeGoals failed: ${res.status}`);
  return result;
}

export async function fetchProfile() {
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchProfile failed: ${res.status}`);
  return res.json();
}

export async function saveProfile(payload) {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `saveProfile failed: ${res.status}`);
  return result;
}

export async function fetchFamilyData() {
  const res = await fetch(`${API_BASE}/api/family-data`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchFamilyData failed: ${res.status}`);
  return res.json();
}

export async function saveFamilyData(payload) {
  const res = await fetch(`${API_BASE}/api/family-data`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `saveFamilyData failed: ${res.status}`);
  return result;
}

export async function fetchPersona(bot) {
  const res = await fetch(`${API_BASE}/api/persona?bot=${encodeURIComponent(bot)}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchPersona failed: ${res.status}`);
  return res.json();
}

export async function savePersona(bot, payload) {
  const res = await fetch(`${API_BASE}/api/persona?bot=${encodeURIComponent(bot)}`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `savePersona failed: ${res.status}`);
  return result;
}

export async function fetchAgentTools(bot) {
  const res = await fetch(`${API_BASE}/api/agent-tools?bot=${encodeURIComponent(bot)}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchAgentTools failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentModels() {
  const res = await fetch(`${API_BASE}/api/agent-models`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchAgentModels failed: ${res.status}`);
  return res.json();
}

export async function fetchDispatchSessions() {
  const res = await fetch(`${API_BASE}/api/dispatch-sessions`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchDispatchSessions failed: ${res.status}`);
  return res.json();
}

export async function postDispatchSession(payload) {
  const res = await fetch(`${API_BASE}/api/dispatch-session`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`postDispatchSession failed: ${res.status}`);
  return res.json();
}

export async function deleteDispatchSession(milestoneId) {
  const res = await fetch(`${API_BASE}/api/dispatch-session/${encodeURIComponent(milestoneId)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new Error(`deleteDispatchSession failed: ${res.status}`);
  return res.json();
}

export async function saveBriefText(milestoneId, briefText) {
  const res = await fetch(`${API_BASE}/api/dispatch-session`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ milestoneId, briefText }),
  });
  if (!res.ok) throw new Error(`saveBriefText failed: ${res.status}`);
  return res.json();
}

export async function fireDispatch(milestoneId) {
  const res = await fetch(`${API_BASE}/api/dispatch-fire`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ milestoneId }),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `fireDispatch failed: ${res.status}`);
  return result;
}

export async function fetchWeeklyChange() {
  const res = await fetch(`${API_BASE}/api/weekly-change`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchWeeklyChange failed: ${res.status}`)
  return res.json()
}

export async function postWeeklyChange(payload) {
  const res = await fetch(`${API_BASE}/api/weekly-change`, {
    method: 'POST',
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await res.json()
  if (!res.ok || !result.ok) throw new Error(result.error || `postWeeklyChange failed: ${res.status}`)
  return result
}

// 多輪 continue：後端階段 1 deec8c6
//   409 = 上一輪 running；429 = turns >= 5（與後端 _MAX_TURNS_PER_CARD 對齊）
//   401 body 為空（FastAPI Response(status_code=401)）→ 提前 throw 免 res.json() 爆
export async function dispatchContinue(milestoneId, ask) {
  const res = await fetch(`${API_BASE}/api/dispatch-continue`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ milestoneId, ask }),
    cache: 'no-store',
  });
  if (res.status === 401) {
    const e = new Error('登入已失效，請重新登入');
    e.status = 401;
    throw e;
  }
  const result = await res.json();
  if (!res.ok || !result.ok) {
    const e = new Error(result.error || `dispatchContinue failed: ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return result;
}

export async function fetchMemoryHealth() {
  const res = await fetch(`${API_BASE}/api/memory-health`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchMemoryHealth failed: ${res.status}`);
  return res.json();
}

export async function fetchTodaySchedule() {
  const res = await fetch(`${API_BASE}/api/today-schedule`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchTodaySchedule failed: ${res.status}`);
  return res.json();
}

export async function fetchMobileState() {
  const res = await fetch(`${API_BASE}/api/mobile/state`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchMobileState failed: ${res.status}`)
  return res.json()
}

export async function fetchLifeOSContext() {
  const res = await fetch(`${API_BASE}/api/life-os/v1/context`, {
    method: 'GET',
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`fetchLifeOSContext failed: ${res.status}`)
  return res.json()
}

export async function setMobileTaskCompleted(source, milestoneId, completed) {
  const res = await fetch(`${API_BASE}/api/mobile/task-complete`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, milestoneId, completed }),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) {
    throw new Error(result.error || `setMobileTaskCompleted failed: ${res.status}`)
  }
  return result
}

export async function saveWeeklyPriorities(items) {
  const res = await fetch(`${API_BASE}/api/mobile/weekly-priorities`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `saveWeeklyPriorities failed: ${res.status}`)
  return result
}

// 聚合四隻 bot 的所有 milestone，回 [{title, due, _source, _project, _projectId, office_project_id}]
export async function fetchAllMilestones() {
  const headers = { ...authHeaders() };
  const [hy, itri, family, sam] = await Promise.allSettled([
    fetch(`${API_BASE}/api/personal-progress`, { headers }).then(r => r.json()),
    fetch(`${API_BASE}/api/950157-progress`,   { headers }).then(r => r.json()),
    fetch(`${API_BASE}/api/family-progress`,   { headers }).then(r => r.json()),
    fetch(`${API_BASE}/api/sam-progress`,      { headers }).then(r => r.json()),
  ]);

  const out = [];
  const extract = (result, getProjects, source) => {
    if (result.status !== "fulfilled") return;
    out.push(...extractKanbanMilestones(result.value, getProjects, source));
  };

  extract(hy,     v => v.projects,              "HY");
  extract(itri,   v => v.projects,              "950157");
  extract(family, v => v._kanban?.projects,     "家庭");
  extract(sam,    v => v._kanban?.projects,     "Sam");

  return out;
}

export async function fetchAgentMemories(owner, status = '') {
  const params = new URLSearchParams({ owner })
  if (status) params.set('status', status)
  const res = await fetch(`${API_BASE}/api/internal/memories/v1?${params}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `fetchAgentMemories failed: ${res.status}`)
  return result.memories || []
}

export async function reviewAgentMemory(memoryId, decision, note = '') {
  const res = await fetch(`${API_BASE}/api/internal/memories/v1/${encodeURIComponent(memoryId)}/review`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, reviewer: 'human_hy', note }),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `reviewAgentMemory failed: ${res.status}`)
  return result.memory
}


export async function fetchMemoryCenter(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
  const res = await fetch(`${API_BASE}/api/internal/memories/v1/center?${params}`, { headers: { ...authHeaders() }, cache: 'no-store' })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `fetchMemoryCenter failed: ${res.status}`)
  return result
}

export async function promoteShortTermMemory(memory) {
  const res = await fetch(`${API_BASE}/api/internal/memories/v1/short-term/promote`, {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner: memory.owner, sourceRef: memory.id, content: memory.summary, category: 'other' }),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `promote failed: ${res.status}`)
  return result.memory
}

export async function dismissShortTermMemory(sourceRef) {
  const res = await fetch(`${API_BASE}/api/internal/memories/v1/short-term/dismiss`, {
    method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ sourceRef }),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `dismiss failed: ${res.status}`)
  return result
}

export async function updateAgentMemory(memoryId, payload) {
  const res = await fetch(`${API_BASE}/api/internal/memories/v1/${encodeURIComponent(memoryId)}`, {
    method: 'PUT', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const result = await res.json().catch(() => ({}))
  if (!res.ok || !result.ok) throw new Error(result.error || `update memory failed: ${res.status}`)
  return result.memory
}

function officeSettingsError(message, status, body = {}) {
  const error = new Error(message)
  error.status = status
  error.body = body
  error.kind = status === 401 ? 'auth' : status === 409 ? 'conflict' : 'error'
  return error
}

export async function getOfficeSettings() {
  const res = await fetch(`${API_BASE}/api/office/settings`, {
    method: 'GET',
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  if (res.status === 404) throw officeSettingsError('office_settings_not_found', 404)
  if (res.status === 401) throw officeSettingsError('登入已過期，請重新登入。', 401)
  const result = await res.json().catch(() => ({}))
  if (!res.ok) throw officeSettingsError(result.error || `getOfficeSettings failed: ${res.status}`, res.status, result)
  return parseOfficeSettings(result)
}

export async function saveOfficeSettings({ expected_revision, ai_defaults }) {
  const res = await fetch(`${API_BASE}/api/office/settings`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ expected_revision, ai_defaults }),
    cache: 'no-store',
  })
  const result = await res.json().catch(() => ({}))
  if (res.status === 409) throw officeSettingsError('設定已被更新，請重新整理', 409, result)
  if (res.status === 401) throw officeSettingsError('登入已過期，請重新登入。', 401, result)
  if (res.status === 403) throw officeSettingsError('只有 HY 本人可以修改預設 AI。', 403, result)
  if (res.status === 400 && result.error === 'office_reviewer_must_differ') {
    throw officeSettingsError('執行與審查主案必須不同', 400, result)
  }
  if (!res.ok) throw officeSettingsError(result.error || `saveOfficeSettings failed: ${res.status}`, res.status, result)
  return parseOfficeSettings(result)
}
