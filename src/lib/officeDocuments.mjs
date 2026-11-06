// 執行計畫與成果與審查共用的正式文件參照。
// 內文只走既有卡片讀取，或專案範圍的 drive-document。瀏覽器不直接讀 Drive。
// drive-document 契約（後端尚未提供；未部署時 404 {"detail":"Not Found"}）：
// GET /api/office/projects/{id}/drive-document?file_id=
// 200 {file_id,name,markdown,truncated,modified_time}
// 404 {error:"no_document",reason} 這份文件不可讀
// 404 {error:"drive_document_unavailable"} 或 FastAPI {"detail":"Not Found"} 路由尚未部署
// 403 {error:"document_forbidden",reason}
// 422 {error:"report_unsafe",reason}
// 後端只能匯出這個專案 state／index 已登錄的 file id，不能接受任意 Drive 檔。
// AI 執行規劃書要有 building.execution_plan（或 plan.execution_plan、卡片 doc_role=execution_plan）：
// { version, doc_url, drive_file_id, name, submitted_at }。不要從日誌句子猜網址。

const list = value => Array.isArray(value) ? value : []
const text = value => typeof value === 'string' ? value.trim() : ''

export function driveFileId(value) {
  const raw = text(value)
  if (/^[A-Za-z0-9_-]{10,200}$/.test(raw) && !raw.includes('://')) return raw
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return ''
    if (url.hostname !== 'docs.google.com' && url.hostname !== 'drive.google.com') return ''
    const match = url.pathname.match(/\/d\/([A-Za-z0-9_-]{10,200})/)
    return match ? match[1] : ''
  } catch {
    return ''
  }
}

export function safeMarkdown(value) {
  if (typeof value !== 'string') return ''
  return value
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<\/?(iframe|object|embed|link|meta)\b[^>]*>/gi, '')
}

export function documentProblem(title, message) {
  const name = title || '這份文件'
  const detail = message || '讀取失敗。'
  return detail.startsWith(`${name}：`) ? detail : `${name}：${detail}`
}

export function parseTarget(value) {
  const raw = text(value)
  const plan = /^plan-v(\d+)$/i.exec(raw)
  if (plan) return { kind: 'plan', version: Number(plan[1]), target: `plan-v${plan[1]}`, milestoneId: '' }
  const milestone = /^(M\d+|G\d+)$/i.exec(raw)
  if (milestone) {
    const id = milestone[1].toUpperCase()
    return { kind: 'milestone', version: null, target: id, milestoneId: id }
  }
  return null
}

function targetFromRequestId(value) {
  const match = text(value).match(/(?:^|-)(plan-v\d+|M\d+|G\d+)(?:-|$)/i)
  return match ? parseTarget(match[1]) : null
}

function cardsOf(index) {
  if (Array.isArray(index)) return index.filter(card => card && typeof card === 'object')
  return list(index?.cards).filter(card => card && typeof card === 'object')
}

function tableRows(table) {
  return list(table).filter(row => row && typeof row === 'object').map(row => ({
    id: text(row.id),
    name: text(row.name),
    due: text(row.due),
    output: text(row.output),
    depends: list(row.depends_on).map(item => text(item)).filter(Boolean),
  })).filter(row => row.id || row.name || row.output)
}

function byTime(a, b) {
  return String(a.at || '').localeCompare(String(b.at || '')) || String(a.key).localeCompare(String(b.key))
}

function readOf(doc) {
  if (doc.fetchBody === false) return { fetch: false, readKey: '' }
  if (doc.cardId) return { fetch: true, readKey: `card:${doc.cardId}` }
  if (doc.fileId) return { fetch: true, readKey: `file:${doc.fileId}` }
  return { fetch: false, readKey: '' }
}

function withRead(doc) {
  return { ...doc, ...readOf(doc) }
}

function reviewIdentity(review) {
  return review.fileId || (review.cardId ? `card:${review.cardId}` : `${review.target}|${review.at}|${review.verdict}`)
}

function cleanMerge(previous, incoming) {
  const next = { ...previous }
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null || value === '' || (Array.isArray(value) && !value.length)) continue
    next[key] = value
  }
  return next
}

function emptyBundle() {
  return {
    projectId: '',
    currentKey: '',
    currentTarget: '',
    options: [],
    plans: [],
    executionPlans: [],
    reviews: [],
    milestones: [],
    outcomeFileId: '',
    hasPlanObject: false,
    hasPlanning: false,
    executionGap: '',
  }
}

export function canonicalOfficeDocuments(building, index, decisions = []) {
  if (!building || typeof building !== 'object') return emptyBundle()
  const cards = cardsOf(index).filter(card => !card.project || card.project === building.id)
  const planCard = cards.find(card => card.id === building.plan_card) || null
  const reviewCard = cards.find(card => card.id === building.review_card) || null
  const plan = building.plan && typeof building.plan === 'object' && !Array.isArray(building.plan) ? building.plan : null
  const latestVersion = Number.isInteger(plan?.version) ? plan.version : null
  const planFile = driveFileId(plan?.drive_file_id) || driveFileId(plan?.doc_url) || driveFileId(building.project_file)
  const planUrl = text(plan?.doc_url) || text(building.project_file)
  const cardFile = driveFileId(planCard?.drive_file_id) || driveFileId(planCard?.drive_url)
  const cardUrl = text(planCard?.drive_url)
  const fileId = planFile || cardFile
  const url = planUrl || cardUrl
  const cardId = planCard && (!cardFile || cardFile === fileId) ? text(planCard.id) : ''
  const plans = []
  if (plan || planCard) {
    const version = latestVersion
    plans.push({
      key: version == null ? 'plan:card' : `plan:${version}`,
      role: 'plan',
      version,
      latest: true,
      title: version == null ? '專案規劃書' : `專案規劃書 v${version}`,
      fileId,
      url,
      cardId,
      submittedAt: text(plan?.submitted_at),
      table: tableRows(plan?.table),
      fetchBody: Boolean(fileId || cardId),
      missingReason: plan && !fileId && !cardId ? '專案規劃書沒有登錄 Drive 文件。' : '',
    })
    for (const item of list(plan?.history)) {
      if (!item || typeof item !== 'object' || !Number.isInteger(item.version) || item.version === version) continue
      const historyFile = driveFileId(item.drive_file_id) || driveFileId(item.doc_url) || fileId
      plans.push({
        key: `plan:${item.version}`,
        role: 'plan',
        version: item.version,
        latest: false,
        title: `專案規劃書 v${item.version}`,
        fileId: historyFile,
        url: text(item.doc_url) || url,
        cardId: historyFile === fileId ? cardId : '',
        submittedAt: text(item.submitted_at),
        table: tableRows(item.table),
        fetchBody: Boolean(historyFile) && historyFile !== fileId,
        missingReason: '',
      })
    }
  }
  const executionRaw = building.execution_plan && typeof building.execution_plan === 'object'
    ? building.execution_plan
    : (plan?.execution_plan && typeof plan.execution_plan === 'object' ? plan.execution_plan : null)
  const executionCard = cards.find(card => text(card.doc_role || card.kind) === 'execution_plan') || null
  const executionPlans = []
  const pushExecution = (item, latest) => {
    if (!item) return
    const version = Number.isInteger(item.version) ? item.version : null
    const execFile = driveFileId(item.drive_file_id) || driveFileId(item.doc_url) || driveFileId(executionCard?.drive_file_id) || driveFileId(executionCard?.drive_url)
    const execUrl = text(item.doc_url) || text(executionCard?.drive_url)
    const execCard = executionCard && (!driveFileId(executionCard.drive_url) || driveFileId(executionCard.drive_url) === execFile) ? text(executionCard.id) : ''
    if (!execFile && !execCard) return
    executionPlans.push({
      key: version == null ? 'execution:current' : `execution:${version}`,
      role: 'execution_plan',
      version,
      latest,
      title: version == null
        ? (text(item.name) || 'AI 執行規劃書')
        : (text(item.name) && text(item.name).includes(`v${version}`) ? text(item.name) : `${text(item.name) || 'AI 執行規劃書'} v${version}`),
      fileId: execFile,
      url: execUrl,
      cardId: execCard,
      submittedAt: text(item.submitted_at),
      table: [],
      fetchBody: true,
      missingReason: '',
    })
  }
  if (executionRaw || executionCard) {
    pushExecution(executionRaw || { doc_url: executionCard?.drive_url, drive_file_id: executionCard?.drive_file_id, name: executionCard?.title }, true)
    for (const item of list(executionRaw?.history)) {
      if (Number.isInteger(item?.version) && item.version === executionRaw?.version) continue
      pushExecution(item, false)
    }
  }
  const reviews = []
  const upsert = entry => {
    const key = reviewIdentity(entry)
    const index = reviews.findIndex(review => reviewIdentity(review) === key)
    const next = { ...entry, key }
    if (index === -1) reviews.push(next)
    else reviews[index] = cleanMerge(reviews[index], next)
  }
  for (const request of list(building.review_requests)) {
    const result = request?.result && typeof request.result === 'object' ? request.result : {}
    const parsed = parseTarget(result.target) || targetFromRequestId(request?.request_id)
    upsert({
      role: 'review',
      target: parsed?.target || '',
      milestoneId: parsed?.milestoneId || '',
      version: parsed?.version ?? null,
      fileId: driveFileId(request?.report_file_id),
      url: '',
      cardId: '',
      name: '',
      verdict: text(result.verdict),
      verdictText: text(result.verdict_text),
      mustFix: list(result.must_fix).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()),
      at: text(result.updated),
      decisionId: text(result.decision_id),
      current: false,
    })
  }
  for (const decision of list(decisions)) {
    if (!decision || decision.project !== building.id) continue
    const review = decision.review && typeof decision.review === 'object' ? decision.review : null
    const parsed = parseTarget(decision.flow?.target) || parseTarget(review?.target)
    const fileId = driveFileId(review?.report_file_id)
    const url = text(review?.report_url)
    if (!fileId && !url) continue
    upsert({
      role: 'review',
      target: parsed?.target || '',
      milestoneId: parsed?.milestoneId || '',
      version: parsed?.version ?? null,
      fileId: driveFileId(review?.report_file_id),
      url: text(review?.report_url),
      cardId: '',
      name: '',
      verdict: text(review?.verdict),
      verdictText: text(review?.verdict_text),
      mustFix: list(review?.must_fix).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()),
      at: text(decision.asked_at || review?.at),
      decisionId: text(decision.id),
      current: false,
    })
  }
  const last = building.last_review && typeof building.last_review === 'object' && !Array.isArray(building.last_review) ? building.last_review : null
  const lastParsed = parseTarget(last?.target)
  if (last) {
    upsert({
      role: 'review',
      target: lastParsed?.target || '',
      milestoneId: lastParsed?.milestoneId || '',
      version: lastParsed?.version ?? null,
      fileId: driveFileId(last.report_file_id),
      url: '',
      cardId: '',
      name: text(last.report_name),
      verdict: text(last.verdict),
      verdictText: text(last.verdict_text),
      mustFix: list(last.must_fix).filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()),
      at: text(last.at),
      decisionId: '',
      current: false,
    })
  }
  if (reviewCard) {
    const parsed = parseTarget(reviewCard.target) || parseTarget(reviewCard.milestone)
    upsert({
      role: 'review',
      target: parsed?.target || '',
      milestoneId: parsed?.milestoneId || '',
      version: parsed?.version ?? null,
      fileId: driveFileId(reviewCard.drive_file_id) || driveFileId(reviewCard.drive_url),
      url: text(reviewCard.drive_url),
      cardId: text(reviewCard.id),
      name: text(reviewCard.title),
      verdict: text(reviewCard.verdict),
      verdictText: text(reviewCard.verdict_text),
      mustFix: [],
      at: text(reviewCard.drive_created_at || reviewCard.created_at),
      decisionId: '',
      current: false,
    })
  }
  const currentFile = driveFileId(last?.report_file_id)
  let currentReview = currentFile ? reviews.find(review => review.fileId === currentFile) : null
  if (!currentReview && reviewCard) currentReview = reviews.find(review => review.cardId === reviewCard.id) || null
  if (currentReview) currentReview.current = true
  for (const review of reviews) {
    review.title = review.target ? `審查 ${review.target}` : '審查報告'
    review.fetchBody = true
  }
  const milestones = []
  const ensureMilestone = id => {
    const key = text(id).toUpperCase()
    if (!/^M\d+$/.test(key) && !/^G\d+$/.test(key)) return null
    let row = milestones.find(item => item.id === key)
    if (!row) {
      row = { id: key, outputs: [] }
      milestones.push(row)
    }
    return row
  }
  for (const milestone of list(building.milestones)) {
    const row = ensureMilestone(milestone?.id)
    if (!row) continue
    for (const card of list(milestone.output_cards)) {
      const outputFile = driveFileId(card?.drive_file_id) || driveFileId(card?.drive_url)
      const outputCard = text(card?.id)
      if (!outputFile && !outputCard) continue
      row.outputs.push({
        key: outputCard ? `output:${outputCard}` : `output:${outputFile}`,
        role: 'output',
        title: text(card.title) || row.id,
        fileId: outputFile,
        url: text(card.drive_url),
        cardId: outputCard,
        table: [],
        fetchBody: true,
        missingReason: '',
      })
    }
  }
  for (const review of reviews) if (review.milestoneId) ensureMilestone(review.milestoneId)
  const keptMilestones = milestones.filter(row => row.outputs.length || reviews.some(review => review.milestoneId === row.id))
  const currentTarget = currentReview?.target || (latestVersion != null ? `plan-v${latestVersion}` : '')
  const latestPlan = plans.find(item => item.latest) || null
  let currentKey = latestPlan?.key || ''
  if (currentReview?.milestoneId && keptMilestones.some(row => row.id === currentReview.milestoneId)) currentKey = `milestone:${currentReview.milestoneId}`
  else if (currentReview?.version != null && plans.some(item => item.version === currentReview.version)) currentKey = `plan:${currentReview.version}`
  const options = []
  const pushOption = (key, label) => { if (key && !options.some(option => option.key === key)) options.push({ key, label }) }
  for (const item of [...plans].sort((a, b) => Number(b.latest) - Number(a.latest) || (b.version || 0) - (a.version || 0))) {
    const base = item.title
    const label = item.key === currentKey ? `${base} · 目前` : item.latest ? `${base} · 最新規劃` : base
    pushOption(item.key, label)
  }
  for (const row of keptMilestones) pushOption(`milestone:${row.id}`, row.id === currentReview?.milestoneId ? `里程碑 ${row.id} · 目前` : `里程碑 ${row.id}`)
  for (const review of reviews) {
    const primary = review.milestoneId ? `milestone:${review.milestoneId}` : (review.version != null ? `plan:${review.version}` : '')
    const chosen = reviews.filter(item => item.target && item.target === review.target).sort(byTime)
    const head = chosen.find(item => item.current) || chosen.at(-1)
    if (head && reviewIdentity(head) === reviewIdentity(review)) continue
    const stamp = text(review.at).slice(0, 16).replace('T', ' ')
    pushOption(`review:${review.fileId || review.key}`, `${review.title}${stamp ? ` · ${stamp}` : ''}`)
    if (primary) pushOption(primary, options.find(option => option.key === primary)?.label || review.title)
  }
  const outcomeFileId = driveFileId(building.report_file_id)
  const hasPlanObject = Boolean(plan)
  const hasPlanning = plans.length > 0
  return {
    projectId: text(building.id),
    currentKey,
    currentTarget,
    options,
    plans: plans.map(withRead),
    executionPlans: executionPlans.map(withRead),
    reviews: reviews.map(withRead).sort(byTime),
    milestones: keptMilestones.map(row => ({ ...row, outputs: row.outputs.map(withRead) })),
    outcomeFileId,
    hasPlanObject,
    hasPlanning,
    executionGap: hasPlanObject && !executionPlans.length ? 'AI 執行規劃書尚未登錄在專案資料，沒有可讀參照。' : '',
  }
}

export function activeDocumentKey(bundle, selected = '') {
  if (!bundle) return ''
  if (selected && list(bundle.options).some(option => option.key === selected)) return selected
  return bundle.currentKey || ''
}

function chosenReview(reviews, target) {
  const rows = reviews.filter(review => review.target === target).sort(byTime)
  return rows.find(review => review.current) || rows.at(-1) || null
}

export function presentOfficeDocuments(bundle, key = '') {
  const pack = bundle || emptyBundle()
  const selected = activeDocumentKey(pack, key)
  const directReview = selected.startsWith('review:')
    ? pack.reviews.find(review => selected === `review:${review.fileId}` || selected === `review:${review.key}`) || null
    : null
  let plan = null
  let milestone = null
  if (directReview?.version != null) plan = pack.plans.find(item => item.version === directReview.version) || null
  else if (directReview?.milestoneId) milestone = pack.milestones.find(item => item.id === directReview.milestoneId) || { id: directReview.milestoneId, outputs: [] }
  else if (selected.startsWith('milestone:')) milestone = pack.milestones.find(item => item.id === selected.slice('milestone:'.length)) || null
  else plan = pack.plans.find(item => item.key === selected) || pack.plans.find(item => item.latest) || null
  const latest = pack.plans.find(item => item.latest) || null
  const execution = (() => {
    if (!plan) return null
    const match = pack.executionPlans.find(item => item.version != null && item.version === plan.version)
      || (plan.latest ? pack.executionPlans.find(item => item.latest && item.version == null) || pack.executionPlans.find(item => item.latest) : null)
    if (match && (match.version == null || match.version === plan.version)) return match
    return null
  })()
  const registeredExecution = pack.executionPlans.find(item => item.latest) || pack.executionPlans[0] || null
  const executionNote = plan && !execution && registeredExecution?.version != null && registeredExecution.version !== plan.version
    ? `AI 執行規劃書登錄的版本是 v${registeredExecution.version}。`
    : ''
  const target = plan?.version != null ? `plan-v${plan.version}` : (milestone?.id || '')
  const review = directReview || (plan?.key === 'plan:card' ? pack.reviews.find(item => item.current) || null : (target ? chosenReview(pack.reviews, target) : null))
  const sameFileNote = plan && latest && !plan.latest && plan.fileId && plan.fileId === latest.fileId
    ? `規劃書 v${plan.version} 與最新 v${latest.version} 共用同一份 Drive 文件。這一節是 v${plan.version} 提交時寫入的里程碑表。文件內文現況在最新版本。`
    : ''
  const history = pack.reviews.filter(item => !review || reviewIdentity(item) !== reviewIdentity(review)).slice().reverse()
  return {
    key: selected,
    options: pack.options,
    plan,
    execution,
    executionNote,
    executionGap: plan?.latest ? pack.executionGap : '',
    review,
    outputs: milestone?.outputs || [],
    history,
    sameFileNote,
    hasPlanning: pack.hasPlanning,
    outcomeFileId: pack.outcomeFileId,
    showEmptyReport: !pack.hasPlanning && !pack.outcomeFileId && !pack.reviews.length,
    milestoneId: milestone?.id || '',
  }
}

export function bodyReads(view) {
  const reads = []
  const push = doc => {
    if (!doc?.fetch || !doc.readKey) return
    if (reads.some(item => item.key === doc.readKey)) return
    reads.push({ key: doc.readKey, cardId: doc.cardId || '', fileId: doc.fileId || '', title: doc.title || '文件', role: doc.role || '' })
  }
  if (!view) return reads
  push(view.plan)
  push(view.execution)
  for (const output of view.outputs || []) push(output)
  push(view.review)
  return reads
}

export function outcomeCopy(view, reason = '') {
  if (view?.outcomeFileId) return { kind: 'legacy', text: '' }
  if (view?.hasPlanning || view?.review) {
    const why = text(reason) ? `（${text(reason)}）` : ''
    return { kind: 'not-created', text: `執行期成果報告還沒建立${why}。規劃書與對應審查在這一頁上方。` }
  }
  return { kind: 'missing', text: '這個專案還沒有專案報告', reason: text(reason) }
}

export function snapshotLines(view) {
  if (!view) return []
  const lines = []
  if (view.plan?.title) lines.push(view.plan.latest ? `${view.plan.title}，最新版本` : view.plan.title)
  if (view.execution?.title) lines.push(`${view.execution.title}已登錄`)
  else if (view.executionGap) lines.push(view.executionGap)
  if (view.review) {
    const verdict = view.review.verdictText || view.review.verdict
    lines.push([view.review.target ? `審查 ${view.review.target}` : '審查', verdict].filter(Boolean).join('：'))
  }
  return lines
}
