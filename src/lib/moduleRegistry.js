export const implementationLabels = {
  NOT_STARTED: '尚未開始', IN_PROGRESS: '建置中', IMPLEMENTED: '已建置',
  NEEDS_IMPROVEMENT: '需補強', UNKNOWN: '尚未確認',
}
export const acceptanceLabels = {
  NOT_REVIEWED: '未送驗', PENDING_ACCEPTANCE: '待正式驗收', ACCEPTED: '已正式驗收', REJECTED: '驗收退回',
}
export const layerNames = ['前台功能', '核心引擎', '共用服務', '基礎設施']

export function validateModules(payload) {
  if (!Array.isArray(payload?.modules) || payload.modules.length !== 18) throw new Error('Registry 模組資料不完整，請重試')
  const ids = new Set()
  for (const m of payload.modules) {
    if (!m || typeof m.module_id !== 'string' || ids.has(m.module_id) ||
      !Object.hasOwn(implementationLabels, m.implementation_status) ||
      !Object.hasOwn(acceptanceLabels, m.acceptance_status) || !layerNames.includes(m.layer) ||
      !['module_name', 'description', 'version', 'commit', 'source_repository', 'record_hash'].every(k => typeof m[k] === 'string' && m[k]) ||
      !['evidence', 'dependencies', 'source_paths', 'completed_capabilities', 'missing_capabilities', 'next_steps', 'history'].every(k => Array.isArray(m[k])) ||
      !m.updated_at) throw new Error('Registry 模組資料無效，請重試')
    if (m.acceptance_status === 'ACCEPTED' && (!m.acceptance_record?.action_id ||
      m.acceptance_record.version !== m.version || m.acceptance_record.commit !== m.commit ||
      m.acceptance_record.actor !== 'owner' || m.acceptance_record.decision !== 'APPROVED')) {
      throw new Error('正式驗收紀錄與目前版本不符，請確認後端資料')
    }
    ids.add(m.module_id)
  }
  if (payload.modules.some(m => m.dependencies.some(id => !ids.has(id)))) throw new Error('Registry 相依資料不完整')
  return payload.modules
}

export async function fetchModules({ base = '', headers = {}, signal, fetcher = fetch } = {}) {
  const response = await fetcher(`${base}/api/module-registry`, { headers, signal, cache: 'no-store' })
  if (!response.ok) {
    if (response.status === 404) throw new Error('Module Registry API 尚未部署。請先完成後端部署，再重新讀取')
    if ([401, 403].includes(response.status)) throw new Error('無權讀取 Module Registry，請重新登入')
    throw new Error(`Module Registry 讀取失敗（${response.status}），請重試`)
  }
  return validateModules(await response.json())
}

export function safeGithubUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'github.com' &&
      /^\/che0319-debug\/(hy-hub|hy-agent-v2)\//.test(parsed.pathname) ? parsed.href : null
  } catch { return null }
}
