export const LABEL = { idle:'閒置', queued:'排隊中', claimed:'已領取', running:'執行中', researching:'搜尋研究', reading:'閱讀中', analyzing:'分析中', generating:'產出中', waiting:'等待中', review:'待驗收', succeeded:'已完成', failed:'失敗', cancelled:'已取消' }
export const ACTIVE = new Set(['claimed','running','researching','reading','analyzing','generating'])
export function isStalled(work, now = Date.now()) {
  const time = Date.parse(work.updated_at)
  return ACTIVE.has(work.status) && Number.isFinite(time) && now - time > 30 * 60 * 1000
}
export function agentGroups(work) {
  const groups = new Map()
  for (const w of work) {
    const id = w.agent || '__unassigned__'
    if (!groups.has(id)) groups.set(id, { id, name: w.agent_name || '尚未標示 Agent', assigned: Boolean(w.agent), work: [] })
    groups.get(id).work.push(w)
  }
  return [...groups.values()]
}
export function contextText(selection, offices, work) {
  const office = offices.find(o => o.id === selection.bot)
  const item = work.find(w => w.work === selection.work)
  return [office?.name || 'HY', selection.agent_name, item?.project_name || selection.project_name, item?.title].filter(Boolean).join(' / ')
}
export function commandMode(selection, work) {
  const item = work.find(w => w.work === selection.work)
  if (!item) return {
    kind: 'create', label: '建立工作', placeholder: '輸入要交給這個 Bot 的新工作…',
    helper: '送出後會建立正式 AI Work，Bot 的進度、問題與成果會回到系統。',
  }
  const lifecycle = item.lifecycle_status || item.status
  if (lifecycle === 'needs_clarification' || item.status === 'waiting') return {
    kind: 'clarification', label: '回覆並繼續', placeholder: '回覆 Bot 的問題或補充限制…',
    helper: '你的回覆會寫入同一筆 AI Work，Bot 隨後繼續執行。',
  }
  if (['succeeded', 'completed', 'done'].includes(lifecycle) || item.status === 'review') return {
    kind: 'feedback', label: '要求修改', placeholder: '輸入修改要求或下一輪功能…',
    helper: '送出後會保留本輪成果，並建立同專案的修訂工作。',
  }
  return {
    kind: 'blocked', label: '工作執行中', placeholder: '這筆工作目前不能插入新指令',
    helper: '為避免覆蓋執行狀態，請等待 Bot 詢問或交付成果；也可切回 Office 建立另一筆工作。',
  }
}
export function commandDraft(selection, offices, work, text) {
  const item = work.find(w => w.work === selection.work)
  return `請透過既有 HY Life OS connector 的 dispatch_bot_command 正式派工，寫入既有 AI Work。\n對象：${contextText(selection, offices, work)}\nBot owner：${selection.bot}${selection.agent ? `\nRequested Agent ID：${selection.agent}` : ''}${selection.agent_name ? `\nRequested Agent Name：${selection.agent_name}` : ''}${(item?.project || selection.project) ? `\nProject ID：${item?.project || selection.project}` : ''}${item ? `\nRelated AI Work ID：${item.work}` : ''}\n指令：${text.trim()}\n本訊息代表 HY 明確要求執行，confirmed=true；請產生穩定唯一的 dispatch_id。派工後在本對話 claim、回報真實進度並 complete，再把結果回覆給我。若涉及重大決策，僅提出建議，仍由 HY 核准。`
}

// Read-only compatibility for deployments where the new SSE endpoint is not yet
// available. This never creates records or invents agent identities/events.
export function legacySnapshot(core, offices) {
  return {
    ok:true, offices, events:[], revision:null, proposals:[], system_improvements:[],
    work:(core.workItems||[]).map(w=>{
      const e=w.execution||{},p=w.progress||{},payload=w.payload||{}
      let status=e.status||w.status||'idle'
      if(['queued','succeeded','failed','cancelled','needs_clarification'].includes(w.status))status=w.status
      if(status==='needs_clarification')status='waiting'
      if(w.status==='succeeded'&&w.deliveryState==='awaiting_review')status='review'
      return {bot:w.owner,agent:e.agent_id||null,agent_name:e.agent_name||e.agent_id||null,run_id:w.workerRunId,
        project:payload.projectId||w.projectId,project_name:payload.projectName,work:w.id,title:w.title,
        lifecycle_status:w.status,status,stage:e.stage||p.stage,current_activity:e.current_activity||p.summary,
        updated_at:w.updatedAt||e.updated_at||p.recordedAt,waiting_for:['waiting','review'].includes(status)?'human_hy':e.waiting_for,
        telemetry_available:Boolean(w.execution||w.progress)}
    }),
  }
}
