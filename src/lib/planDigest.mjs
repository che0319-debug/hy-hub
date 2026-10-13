// 規劃書「看得清楚」用的純函式：把結構化計畫整理成摘要，把長 Markdown 依 H2 切成可展開的章節。
// 不改任何資料，只改呈現；沒有資料就回空陣列，由畫面寫「待補」。

const str = value => typeof value === 'string' ? value.trim() : ''
const toText = value => {
  if (typeof value === 'string') return value.trim()
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join('；')
  if (typeof value === 'object') return str(value.text || value.title || value.task || value.name) || JSON.stringify(value)
  return String(value)
}
const list = value => Array.isArray(value) ? value.map(toText).filter(Boolean) : toText(value) ? [toText(value)] : []

export function digestPlan(plan) {
  if (!plan || typeof plan !== 'object') return null
  const milestones = (Array.isArray(plan.milestones) ? plan.milestones : []).map(m => ({
    id: str(m?.id),
    name: str(m?.name) || str(m?.id),
    goal: toText(m?.goal || m?.objective),
    deliverables: list(m?.deliverables),
    acceptance: list(m?.acceptance_criteria),
    dependencies: list(m?.dependencies),
    isMajor: m?.is_major === true,
    packages: (Array.isArray(m?.packages) ? m.packages : []).map(p => ({
      key: str(p?.key), task: toText(p?.task), executor: str(p?.executor) || 'GPT_CHAT',
      dependencies: list(p?.dependencies), acceptance: list(p?.acceptance_criteria),
    })),
  }))
  const digest = {
    goal: toText(plan.goal), scope: list(plan.scope), type: str(plan.project_type),
    required: list(plan.required_inputs), missing: list(plan.missing_inputs), risks: list(plan.risks),
    closure: plan.closure && typeof plan.closure === 'object' ? { task: toText(plan.closure.task), acceptance: list(plan.closure.acceptance_criteria) } : null,
    milestones,
  }
  digest.stats = {
    milestones: milestones.length,
    packages: milestones.reduce((n, m) => n + m.packages.length, 0),
    risks: digest.risks.length, missing: digest.missing.length,
  }
  return digest
}

// 依 H2 切章。H1 與第一個 H2 之前的文字併成「前言」；程式碼區塊內的 ## 不算標題。
export function splitSections(markdown) {
  const text = typeof markdown === 'string' ? markdown : ''
  const sections = []
  let current = { title: '前言', body: [] }
  let fenced = false
  for (const line of text.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    const heading = !fenced && /^##\s+(.+?)\s*#*\s*$/.exec(line)
    if (heading) {
      sections.push(current)
      current = { title: heading[1], body: [] }
    } else current.body.push(line)
  }
  sections.push(current)
  return sections
    .map(s => ({ title: s.title, body: s.body.join('\n').trim() }))
    .filter((s, i) => s.body || i > 0 && s.title !== '前言')
    .map((s, i) => ({ ...s, index: i, chars: s.body.length }))
}

export function docStats(markdown) {
  const sections = splitSections(markdown)
  return { chars: typeof markdown === 'string' ? markdown.length : 0, sections: sections.filter(s => s.title !== '前言').length }
}

// 容量條：只在 70% 以上或已滿才打擾 HY。
export function capacityView(capacity) {
  if (!capacity || typeof capacity.percent !== 'number') return null
  if (capacity.full) return { tone: 'bad', percent: capacity.percent, text: `AI Office 資料空間已滿（${capacity.percent}%）。新的核准與寫入會失敗，請先封存不用的專案。` }
  if (capacity.warn) return { tone: 'you', percent: capacity.percent, text: `AI Office 資料空間已用 ${capacity.percent}%。接近上限時核准與寫入會失敗，建議封存不用的專案。` }
  return null
}
