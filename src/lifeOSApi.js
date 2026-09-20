import { authHeaders } from './auth'

const API_BASE = import.meta.env.VITE_API_BASE || ''

async function parseResponse(response, operation) {
  const text = await response.text()
  let result = {}
  try { result = text ? JSON.parse(text) : {} } catch { result = { error: text } }
  if (!response.ok || !result.ok) throw new Error(result.error || `${operation} failed: ${response.status}`)
  return result
}

export async function fetchDailyOS() {
  const response = await fetch(`${API_BASE}/api/life-os/v1/today`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  return parseResponse(response, 'fetchDailyOS')
}

export async function fetchAutonomousPlans({ owner = '', status = 'waiting_approval' } = {}) {
  const params = new URLSearchParams()
  if (owner) params.set('owner', owner)
  if (status) params.set('status', status)
  const response = await fetch(`${API_BASE}/api/life-os/v1/autonomous-plans?${params}`, {
    headers: { ...authHeaders() },
    cache: 'no-store',
  })
  const result = await parseResponse(response, 'fetchAutonomousPlans')
  return result.plans || []
}

export async function decideAutonomousPlan(planId, decision, note = '') {
  const response = await fetch(`${API_BASE}/api/life-os/v1/autonomous-plans/${encodeURIComponent(planId)}/decision`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, note }),
  })
  return parseResponse(response, 'decideAutonomousPlan')
}

export async function createDirectWorkItem(payload) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/work-items/direct-assignment`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse(response, 'createDirectWorkItem')
}

export async function answerWorkClarification(workId, answer) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/work-items/${encodeURIComponent(workId)}/clarification`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ answer }),
  })
  return parseResponse(response, 'answerWorkClarification')
}

export async function submitWorkFeedback(workId, feedback, idempotencyKey) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/work-items/${encodeURIComponent(workId)}/feedback`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ feedback }),
  })
  return parseResponse(response, 'submitWorkFeedback')
}

export async function submitOperatingReview(payload, idempotencyKey) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/reviews`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  })
  return parseResponse(response, 'submitOperatingReview')
}

export async function retryWorkItem(workId) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/work-items/${encodeURIComponent(workId)}/retry`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return parseResponse(response, 'retryWorkItem')
}

export async function retryNotification(notificationId) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/notifications/${encodeURIComponent(notificationId)}/retry`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return parseResponse(response, 'retryNotification')
}

export async function reviewLearning(learningId, decision, memoryContent = '') {
  const response = await fetch(`${API_BASE}/api/life-os/v1/learnings/${encodeURIComponent(learningId)}/review`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, memoryContent }),
  })
  return parseResponse(response, 'reviewLearning')
}

export async function runProactiveScan() {
  const response = await fetch(`${API_BASE}/api/life-os/v1/proactive-scan/run`, {
    method: 'POST',
    headers: { ...authHeaders() },
  })
  return parseResponse(response, 'runProactiveScan')
}


export async function dismissWorkItem(workId) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/work-items/${encodeURIComponent(workId)}`, {
    method: 'DELETE',
    headers: { ...authHeaders() },
  })
  return parseResponse(response, 'dismissWorkItem')
}


export async function fetchResearchCenter({ owner = '', status = '' } = {}) {
  const params = new URLSearchParams()
  if (owner) params.set('owner', owner)
  if (status) params.set('status', status)
  const response = await fetch(`${API_BASE}/api/internal/research-center/v1?${params}`, {
    headers: { ...authHeaders() }, cache: 'no-store',
  })
  return parseResponse(response, 'fetchResearchCenter')
}

export async function actOnResearch(findingId, action, note = '') {
  const response = await fetch(`${API_BASE}/api/internal/research-center/v1/${encodeURIComponent(findingId)}/action`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, note }),
  })
  return parseResponse(response, 'actOnResearch')
}


export async function fetchWorkspace() {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace`, {
    headers: { ...authHeaders() }, cache: 'no-store',
  })
  return parseResponse(response, 'fetchWorkspace')
}

export async function createWorkspaceProject(payload) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/projects`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse(response, 'createWorkspaceProject')
}

export async function archiveWorkspaceProject(projectId) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/projects/${encodeURIComponent(projectId)}`, {
    method: 'DELETE', headers: { ...authHeaders() },
  })
  return parseResponse(response, 'archiveWorkspaceProject')
}

export async function approveWorkspacePlan(projectId) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/projects/${encodeURIComponent(projectId)}/plan/approve`, {
    method: 'POST', headers: { ...authHeaders() },
  })
  return parseResponse(response, 'approveWorkspacePlan')
}

export async function saveWorkspacePlan(projectId, payload) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/projects/${encodeURIComponent(projectId)}/plan`, {
    method: 'PUT',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse(response, 'saveWorkspacePlan')
}

export async function requestWorkspacePlanAnalysis(projectId) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/projects/${encodeURIComponent(projectId)}/plan/analyze`, {
    method: 'POST', headers: { ...authHeaders() },
  })
  return parseResponse(response, 'requestWorkspacePlanAnalysis')
}

export async function createWorkspacePlanRevision(projectId, payload) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/projects/${encodeURIComponent(projectId)}/plan/revisions`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return parseResponse(response, 'createWorkspacePlanRevision')
}

export async function clearLegacyWorkspaceWork() {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/legacy-work`, {
    method: 'DELETE', headers: { ...authHeaders() },
  })
  return parseResponse(response, 'clearLegacyWorkspaceWork')
}

export async function approveWorkspaceMilestone(projectId, milestoneId, workId) {
  const response = await fetch(`${API_BASE}/api/life-os/v1/workspace/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(milestoneId)}/approve`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ workId }),
  })
  return parseResponse(response, 'approveWorkspaceMilestone')
}
