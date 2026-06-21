const API_BASE = import.meta.env.VITE_API_BASE || "";
const READ_SECRET = import.meta.env.VITE_READ_SECRET || "";

export async function fetchPersonalData() {
  const res = await fetch(`${API_BASE}/api/personal-data`, {
    method: "GET",
    headers: { "X-Read-Secret": READ_SECRET },
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
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`postMilestone failed: ${res.status}`);
  return res.json();
}

export async function fetchLifeGoals() {
  const res = await fetch(`${API_BASE}/api/life-goals`, {
    method: "GET",
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchLifeGoals failed: ${res.status}`);
  return res.json();
}

export async function assessFreedom() {
  const res = await fetch(`${API_BASE}/api/assess-freedom`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET },
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `assessFreedom failed: ${res.status}`);
  return result;
}

export async function saveLifeGoals(payload) {
  const res = await fetch(`${API_BASE}/api/life-goals`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `saveLifeGoals failed: ${res.status}`);
  return result;
}

export async function fetchProfile() {
  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchProfile failed: ${res.status}`);
  return res.json();
}

export async function saveProfile(payload) {
  const res = await fetch(`${API_BASE}/api/profile`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `saveProfile failed: ${res.status}`);
  return result;
}

export async function fetchPersona(bot) {
  const res = await fetch(`${API_BASE}/api/persona?bot=${encodeURIComponent(bot)}`, {
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchPersona failed: ${res.status}`);
  return res.json();
}

export async function savePersona(bot, payload) {
  const res = await fetch(`${API_BASE}/api/persona?bot=${encodeURIComponent(bot)}`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `savePersona failed: ${res.status}`);
  return result;
}

export async function fetchAgentTools(bot) {
  const res = await fetch(`${API_BASE}/api/agent-tools?bot=${encodeURIComponent(bot)}`, {
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchAgentTools failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentModels() {
  const res = await fetch(`${API_BASE}/api/agent-models`, {
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchAgentModels failed: ${res.status}`);
  return res.json();
}

export async function fetchDispatchSessions() {
  const res = await fetch(`${API_BASE}/api/dispatch-sessions`, {
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchDispatchSessions failed: ${res.status}`);
  return res.json();
}

export async function postDispatchSession(payload) {
  const res = await fetch(`${API_BASE}/api/dispatch-session`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`postDispatchSession failed: ${res.status}`);
  return res.json();
}

export async function deleteDispatchSession(milestoneId) {
  const res = await fetch(`${API_BASE}/api/dispatch-session/${encodeURIComponent(milestoneId)}`, {
    method: "DELETE",
    headers: { "X-Read-Secret": READ_SECRET },
  });
  if (!res.ok) throw new Error(`deleteDispatchSession failed: ${res.status}`);
  return res.json();
}

export async function saveBriefText(milestoneId, briefText) {
  const res = await fetch(`${API_BASE}/api/dispatch-session`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify({ milestoneId, briefText }),
  });
  if (!res.ok) throw new Error(`saveBriefText failed: ${res.status}`);
  return res.json();
}

export async function fireDispatch(milestoneId) {
  const res = await fetch(`${API_BASE}/api/dispatch-fire`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify({ milestoneId }),
  });
  const result = await res.json();
  if (!res.ok || !result.ok) throw new Error(result.error || `fireDispatch failed: ${res.status}`);
  return result;
}

// 多輪 continue：後端階段 1 deec8c6
//   409 = 上一輪 running；429 = turns >= 5（與後端 _MAX_TURNS_PER_CARD 對齊）
//   401 body 為空（FastAPI Response(status_code=401)）→ 提前 throw 免 res.json() 爆
export async function dispatchContinue(milestoneId, ask) {
  const res = await fetch(`${API_BASE}/api/dispatch-continue`, {
    method: "POST",
    headers: { "X-Read-Secret": READ_SECRET, "Content-Type": "application/json" },
    body: JSON.stringify({ milestoneId, ask }),
    cache: 'no-store',
  });
  if (res.status === 401) {
    const e = new Error('認證失敗（X-Read-Secret）');
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
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchMemoryHealth failed: ${res.status}`);
  return res.json();
}

export async function fetchTodaySchedule() {
  const res = await fetch(`${API_BASE}/api/today-schedule`, {
    headers: { "X-Read-Secret": READ_SECRET },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`fetchTodaySchedule failed: ${res.status}`);
  return res.json();
}

// 聚合四隻 bot 的所有 milestone，回 [{title, due, _source, _project}]
export async function fetchAllMilestones() {
  const headers = { "X-Read-Secret": READ_SECRET };
  const [hy, itri, family, sam] = await Promise.allSettled([
    fetch(`${API_BASE}/api/personal-progress`, { headers }).then(r => r.json()),
    fetch(`${API_BASE}/api/950157-progress`,   { headers }).then(r => r.json()),
    fetch(`${API_BASE}/api/family-progress`,   { headers }).then(r => r.json()),
    fetch(`${API_BASE}/api/sam-progress`,      { headers }).then(r => r.json()),
  ]);

  const out = [];
  const extract = (result, getProjects, source) => {
    if (result.status !== "fulfilled") return;
    for (const p of getProjects(result.value) || []) {
      for (const m of p.milestones || []) {
        out.push({ title: m.title, due: m.due || "", _source: source, _project: p.name });
      }
    }
  };

  extract(hy,     v => v.projects,              "HY");
  extract(itri,   v => v.projects,              "950157");
  extract(family, v => v._kanban?.projects,     "家庭");
  extract(sam,    v => v._kanban?.projects,     "Sam");

  return out;
}
