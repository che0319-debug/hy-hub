import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { authHeaders } from '../auth'
import './expert-team.css'
import { laneLabel } from '../lib/lanes'

const base = import.meta.env.VITE_API_BASE || ''
async function request(url, body) {
  const res = await fetch(url, { method: body ? 'POST' : 'GET', headers: { ...authHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), cache: 'no-store' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || data.error || `HTTP ${res.status}`)
  return data
}
const api = (path, body) => request(`${base}/api/ai-work-packages${path}`, body)

// Abstract icons only; never real people.
const ICON = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
  shield: <><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
  code: <><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  doc: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z" /><circle cx="7.5" cy="11" r="1" /><circle cx="10" cy="7.5" r="1" /><circle cx="14.5" cy="7.5" r="1" /></>,
}
const SYMBOL_ALIAS = { 'digital-phantom': 'compass' }
function ExpertIcon({ expert }) {
  const symbol = SYMBOL_ALIAS[expert.visual?.symbol] || expert.visual?.symbol
  return <span className="et-icon" aria-hidden="true">{ICON[symbol]
    ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICON[symbol]}</svg>
    : <span className="et-icon-text">{expert.name?.slice(0, 2)}</span>}</span>
}

const TIER = { high: '高級 · Opus 級', mid: '中級 · Sonnet 級' }
const stateLabel = { PUBLISHED: '已發布', CANDIDATE: '待你確認', DISABLED: '已停用' }
const GITHUB_SKILLS = new Set(['test-driven-development', 'systematic-debugging', 'verification-before-completion', 'receiving-code-review'])
function skillSource(id) {
  if (id.startsWith('hy-')) return 'hy'
  if (GITHUB_SKILLS.has(id)) return 'github'
  if (id === 'pi-integrator') return 'legacy'
  return 'other'
}
const SOURCE_GROUPS = [
  ['hy', 'HY 專屬規則', '我們自己寫的，只放 HY 特有的規則。方法類交給 Claude 原生能力或 GitHub 上的 Skill。'],
  ['github', 'GitHub 中譯', 'obra/superpowers（MIT 授權）原文翻譯，保留出處；不加入 HY 規則。'],
  ['other', '其他 Skill', '在專家團新增的 Skill。'],
  ['legacy', '舊版凍結', '已發布版本不可修改，仍被舊專案引用時保留。'],
]

function grouped(rows = []) {
  return Object.values(rows.reduce((out, row) => { (out[row.id] ||= []).push(row); return out }, {}))
    .map(rows => rows.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true })))
}
const pinKey = s => `${s.id}:${s.version}:${s.content_hash}`
function Status({ state }) { return <span className="hy-pill" data-s={state === 'PUBLISHED' ? 'done' : state === 'DISABLED' ? 'wait' : 'you'}>{stateLabel[state] || state}</span> }

function SkillContent({ body }) {
  const fields = [['適用情境', 'applies'], ['執行步驟', 'steps'], ['交付成果', 'deliverables'], ['驗收標準', 'acceptance'], ['使用工具', 'tools'], ['限制與禁止事項', 'excludes'], ['常見錯誤', 'common_errors'], ['品質依據', 'quality_references'], ['資料來源', 'sources']]
  return <div className="hy-stack">
    <p>{body.description}</p>
    <div className="et-md">{body.markdown?.replace(/^---[\s\S]*?---\n/, '')}</div>
    <details><summary>登錄欄位</summary><div className="hy-stack">{fields.map(([title, key]) => body[key]?.length ? <section key={key}><h4>{title}</h4><ol>{body[key].map((text, i) => <li key={i}>{text}</li>)}</ol></section> : null)}
      {body.good_example && <p><b>合格範例：</b>{body.good_example}</p>}{body.reject_example && <p><b>不合格範例：</b>{body.reject_example}</p>}</div></details>
    <details><summary>技術資訊</summary><p>識別：{body.id} · 版本：{body.version}</p><p className="hy-note">{body.content_hash}</p><p>維護者：{body.maintainer}</p><p>發布依據：{body.publication_basis}</p></details>
  </div>
}

const skillFields = [['description', '用途說明'], ['applies', '適用情境'], ['excludes', '限制與禁止事項'], ['capabilities', '能力'], ['tools', '使用工具'], ['steps', '工作步驟'], ['deliverables', '交付成果'], ['quality_references', '品質依據'], ['acceptance', '驗收標準'], ['common_errors', '常見錯誤'], ['sources', '資料來源'], ['good_example', '合格範例'], ['reject_example', '不合格範例'], ['markdown', '完整工作說明']]
const listFields = new Set(['applies', 'excludes', 'capabilities', 'tools', 'steps', 'deliverables', 'quality_references', 'acceptance', 'common_errors', 'sources'])
function CandidateForm({ editor, skills, busy, onCancel, onSubmit }) {
  const [draft, setDraft] = useState(() => Object.fromEntries(Object.entries(editor.body).map(([k, v]) => [k, Array.isArray(v) && k !== 'skills' ? v.join('\n') : v])))
  const [chosen, setChosen] = useState((editor.body.skills || []).map(pinKey))
  const change = (k, v) => setDraft(d => ({ ...d, [k]: v }))
  const isSkill = editor.kind === 'skill'
  const available = skills.filter(s => s.state === 'PUBLISHED')
  function submit(event) {
    event.preventDefault()
    let body
    if (isSkill) {
      body = { id: draft.id, name: draft.name, version: draft.version, maintainer: draft.maintainer || 'HY', publication_basis: 'CANDIDATE; requires owner humanAction' }
      for (const [k] of skillFields) body[k] = listFields.has(k) ? draft[k].split('\n').map(x => x.trim()).filter(Boolean) : draft[k]
    } else {
      body = { id: draft.id, name: draft.name, version: draft.version, description: draft.description, executor: editor.body.executor || 'GPT_CHAT', ...(editor.body.model_tier ? { model_tier: editor.body.model_tier } : {}), capabilities: draft.capabilities.split('\n').map(x => x.trim()).filter(Boolean), visual: editor.body.visual || { kind: 'abstract', symbol: 'compass', real_person: false }, skills: available.filter(s => chosen.includes(pinKey(s))).map(({ id, version, content_hash }) => ({ id, version, content_hash })) }
    }
    onSubmit(body)
  }
  return <form className="candidate-form hy-stack" onSubmit={submit}>
    <h3>{editor.id ? '新增版本' : '新增' + (isSkill ? ' Skill' : '專家')}</h3>
    <p className="hy-note">先建立候選與發布申請，審閱後另行核准。</p>
    <label>識別代碼<input required value={draft.id || ''} readOnly={!!editor.id} onChange={e => change('id', e.target.value)} placeholder="例如 research-assistant" /></label>
    <label>名稱<input required value={draft.name || ''} onChange={e => change('name', e.target.value)} /></label>
    <label>新版本<input required value={draft.version || ''} onChange={e => change('version', e.target.value)} placeholder="例如 1.0.0" /></label>
    {(isSkill ? skillFields : [['description', '角色說明'], ['capabilities', '能力']]).map(([k, label]) => <label key={k}>{label}{listFields.has(k) && <span className="hy-note">（每行一項）</span>}<textarea required rows={k === 'markdown' ? 10 : 3} value={draft[k] || ''} onChange={e => change(k, e.target.value)} /></label>)}
    {!isSkill && <fieldset><legend>綁定已發布 Skill 的精確版本</legend>{available.length ? available.map(s => <label className="skill-choice" key={pinKey(s)}><input type="checkbox" checked={chosen.includes(pinKey(s))} onChange={e => setChosen(prev => e.target.checked ? [...prev, pinKey(s)] : prev.filter(k => k !== pinKey(s)))} />{s.name} · v{s.version}</label>) : <p>請先發布 Skill，再建立專家。</p>}</fieldset>}
    <div className="pi-controls"><button className="hy-btn is-primary" disabled={busy || (!isSkill && !chosen.length)} type="submit">建立候選與發布申請</button><button className="hy-btn" type="button" disabled={busy} onClick={onCancel}>取消</button></div>
  </form>
}

function ModelsTab() {
  const [models, setModels] = useState(null), [error, setError] = useState('')
  const load = () => { setError(''); setModels(null); request(`${base}/api/ai-office/models`).then(setModels).catch(e => setError(e.message)) }
  useEffect(load, [])
  if (error) return <div className="hy-stack"><p role="alert" className="hy-alert is-bad">模型設定讀取失敗：{error}</p><button className="hy-btn" onClick={load}>重試讀取</button></div>
  if (!models) return <p className="hy-empty">讀取中…</p>
  const status = r => r.mismatch ? <span className="hy-pill" data-s="you">與設定不同</span> : r.last_reported ? <span className="hy-pill" data-s="done">一致</span> : <span className="hy-pill" data-s="wait">等首次回報</span>
  return <div className="hy-stack">
    {models.roles.some(r => r.mismatch) && <p className="hy-alert">有角色實際使用的模型和設定不同，請檢查對應的 Claude 排程設定。</p>}
    <section className="hy-card">
      <div className="hy-card-head"><h2 className="hy-card-title">角色與模型</h2></div>
      <p className="hy-note">關鍵判斷用高級模型，一般執行用中級。要調整時，PI 會出一張「模型配置」決策卡給你核准。</p>
      <div className="et-table-wrap"><table className="et-table"><thead><tr><th>角色</th><th>通道</th><th>層級</th><th>應該用</th><th>最近實際</th><th>狀態</th></tr></thead>
        <tbody>{models.roles.map(r => <tr key={r.role} className={r.mismatch ? 'needs-you' : undefined}><td><b>{r.name}</b></td><td>{laneLabel(r.lane)}</td><td>{TIER[r.tier] || r.tier_label}</td><td>{r.model}</td><td>{r.last_reported?.model || <span className="hy-note">尚未回報</span>}</td><td>{status(r)}</td></tr>)}</tbody></table></div>
      <div className="et-mobile-roles">{models.roles.map(r => <div className="et-mrole" key={r.role}><div className="hy-card-head"><b>{r.name}</b>{status(r)}</div><div className="hy-note">{laneLabel(r.lane)} · {TIER[r.tier] || r.tier_label}</div><div>應該用 {r.model}<span className="hy-note"> · 最近實際：{r.last_reported?.model || '尚未回報'}</span></div></div>)}</div>
      <p className="hy-note">實際模型由執行者交件時回報；和設定不同時，這裡會亮琥珀色提醒。</p>
    </section>
    <section className="hy-card">
      <div className="hy-card-head"><h2 className="hy-card-title">外部工具</h2></div>
      <p className="hy-note">不領工作包，只在 AI 執行規劃書指定時由執行專家呼叫。</p>
      <ul className="hy-list">{models.tools.map(t => <li key={t.id}><b>{t.name}</b><span className="hy-note">{t.use}</span></li>)}</ul>
    </section>
  </div>
}

export default function ExpertTeam() {
  const [params] = useSearchParams(), initialTab = ['experts','skills','models','requests'].includes(params.get('tab')) ? params.get('tab') : 'experts'
  const [data, setData] = useState(null), [tab, setTab] = useState(initialTab), [error, setError] = useState(''), [busy, setBusy] = useState(false), [contents, setContents] = useState({}), [projects, setProjects] = useState([]), [project, setProject] = useState(''), [requests, setRequests] = useState([]), [search, setSearch] = useState(''), [editor, setEditor] = useState(null), [panel, setPanel] = useState(null)
  async function load() { setData(await api('/experts/registry')) }
  useEffect(() => { load().catch(e => setError(e.message)) }, [])
  useEffect(() => { if (tab === 'requests') api('/projects').then(setProjects).catch(e => setError(e.message)) }, [tab])
  useEffect(() => { if (!panel) return; const close = e => { if (e.key === 'Escape') setPanel(null) }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close) }, [panel])
  async function act(fn) { setBusy(true); setError(''); try { await fn(); await load() } catch (e) { setError(e.message) } finally { setBusy(false) } }
  async function read(s) { const body = await api(`/experts/pi/skills/${s.id}/${s.version}/${s.content_hash}`); setContents(prev => ({ ...prev, [pinKey(s)]: body })); return body }
  const actions = data?.actions || []
  const skillAction = s => actions.find(a => a.payload.skill && pinKey(a.payload.skill) === pinKey(s))
  const expertAction = v => actions.find(a => a.payload.expert && a.payload.expert.id === v.id && a.payload.expert.version === v.version)
  function decisions(a, readable) {
    return <div className="pi-controls"><button className="hy-btn is-primary" disabled={busy || !readable} onClick={() => act(() => api(`/inbox/${a.id}/resolve`, { answer: 'APPROVED' }))}>核准此版本發布</button><button className="hy-btn" disabled={busy} onClick={() => act(() => api(`/inbox/${a.id}/resolve`, { answer: 'REJECTED' }))}>拒絕發布</button></div>
  }
  const q = search.toLowerCase()
  const skillGroups = grouped(data?.skills).filter(rows => `${rows[0].name} ${rows[0].id} ${rows[0].description}`.toLowerCase().includes(q))
  const expertGroups = grouped(data?.experts).filter(rows => `${rows[0].name} ${rows[0].id} ${rows[0].capabilities?.join(' ')}`.toLowerCase().includes(q))
  const skillName = id => data?.skills.find(x => x.id === id)?.name || id
  const usedBy = id => grouped(data?.experts).map(rows => rows.find(e => e.state === 'PUBLISHED')).filter(e => e?.skills.some(s => s.id === id)).map(e => e.name)
  async function remove(s) {
    if (!window.confirm(`刪除「${s.name}」版本 ${s.version}？此操作會移除內容與尚未完成的發布申請，無法還原。`)) return
    await act(() => api('/experts/skills/delete-version', { id: s.id, version: s.version, content_hash: s.content_hash }))
    setPanel(null)
  }
  function openEditor(kind, seed = {}) {
    const id = seed.id || ''
    const parts = (seed.version || '0.0.0').split('.').map(Number)
    const next = parts.length === 3 && parts.every(Number.isFinite) ? `${parts[0]}.${parts[1]}.${parts[2] + 1}` : ''
    setEditor({ kind, id, body: { ...seed, version: id ? next : '1.0.0' } })
  }
  function renderEditor() { return <CandidateForm key={`${editor.kind}:${editor.id}:${editor.body.version}`} editor={editor} skills={data?.skills || []} busy={busy} onCancel={() => setEditor(null)} onSubmit={body => act(async () => { await api(`/experts/registry/${editor.kind}/candidate`, body); setEditor(null) })} /> }
  function openSkill(id) { setPanel(id); const rows = grouped(data?.skills).find(r => r[0].id === id); if (rows) for (const s of rows) if (!contents[pinKey(s)]) read(s).catch(e => setError(e.message)) }

  const publishedExperts = grouped(data?.experts).filter(rows => rows.some(e => e.state === 'PUBLISHED')).length
  const publishedSkills = grouped(data?.skills).filter(rows => rows.some(s => s.state === 'PUBLISHED') && skillSource(rows[0].id) !== 'legacy').length
  const panelRows = panel && grouped(data?.skills).find(r => r[0].id === panel)

  return <div className="hy expert-team hy-stack">
    <div className="hy-pagehead">
      <div><h1 className="hy-title">專家團</h1><p className="hy-lede">PI 帶隊規劃，各專家依自己的 Skill 執行。全部由 Claude 執行，GPT／Grok 只當外部工具。</p></div>
      <div className="et-head-end">
        {data && <div className="hy-summary"><span className="hy-pill" data-s="done">{publishedExperts} 位專家已上線</span><span className="hy-pill" data-s="done">{publishedSkills} 份 Skill 已發布</span><span className="hy-pill" data-s={actions.length ? 'you' : 'wait'}>待你確認 {actions.length}</span></div>}
        <button className="hy-btn" disabled={busy} onClick={() => act(load)}>重新整理</button>
      </div>
    </div>
    {error && <p role="alert" className="hy-alert is-bad">{error}</p>}
    {!data && !error && <p className="hy-empty">讀取中…</p>}
    {actions.length > 0 && <p className="hy-alert">{actions.length} 個版本等你核准發布，已在對應的專家卡或 Skill 標示「待你確認」。</p>}

    <nav className="hy-tabs" role="tablist">{[['experts', '專家'], ['skills', 'Skill 庫'], ['models', '執行者與模型'], ['requests', '能力請求']].map(([id, label]) => <button className="hy-tab" role="tab" key={id} aria-current={tab === id ? 'page' : undefined} onClick={() => { setTab(id); setSearch(''); setEditor(null) }}>{label}</button>)}</nav>

    {(tab === 'experts' || tab === 'skills') && <label className="pi-search">搜尋{tab === 'experts' ? '專家' : 'Skill'}<input value={search} onChange={e => setSearch(e.target.value)} placeholder="輸入名稱或能力" /></label>}

    {tab === 'experts' && data && <>
      <h2 className="et-h">全部專家 <span>{expertGroups.length}</span></h2>
      <div className="expert-grid">{expertGroups.map(rows => {
        const e = rows.find(v => v.state === 'PUBLISHED') || rows[0]
        const pending = rows.filter(v => expertAction(v))
        const older = rows.filter(v => v !== e && v.state === 'PUBLISHED')
        return <article className={`hy-card expert-card${pending.length ? ' needs-you' : ''}`} key={e.id}>
          <div className="et-card-top"><ExpertIcon expert={e} /><div className="et-grow"><div className="hy-card-head"><h2 className="hy-card-title">{e.name}</h2><Status state={pending.length ? 'CANDIDATE' : e.state} /></div>{(e.description && e.description !== e.capabilities?.join('、') || older.length > 0) && <p className="et-role">{e.description !== e.capabilities?.join('、') ? e.description : ''}{older.length ? `另有 ${older.map(v => 'v' + v.version).join('、')} 供舊專案使用。` : ''}</p>}</div></div>
          {e.capabilities?.length > 0 && <div className="et-caps">{e.capabilities.map(c => <span key={c}>{c}</span>)}</div>}
          <div className="et-label">Skill {e.skills.length}</div>
          <div className="et-chips">{e.skills.map(s => <button className="et-chip" key={s.id} onClick={() => { setTab('skills'); openSkill(s.id) }}>{skillName(s.id)}<span>v{s.version}</span></button>)}</div>
          <div className="et-meta">{TIER[e.model_tier] && <span className="hy-pill" data-s="ai">{TIER[e.model_tier]}</span>}<span>{laneLabel(e.executor)}</span><span>v{e.version}</span></div>
          {pending.map(v => <div className="et-pending" key={v.version}><p><b>v{v.version} 等你核准</b>：綁定 {v.skills.map(s => `${skillName(s.id)} v${s.version}`).join('、')}</p>{decisions(expertAction(v), true)}</div>)}
          <details className="et-versions"><summary>版本與管理（{rows.length}）</summary><div className="hy-stack">
            {rows.map(v => <section className="pi-version" key={v.version}><div className="hy-card-head"><h3>版本 {v.version}</h3><Status state={v.state} /></div><p>{laneLabel(v.executor)}{TIER[v.model_tier] ? ` · ${TIER[v.model_tier]}` : ''}</p><p className="hy-note">Skill：{v.skills.map(s => `${skillName(s.id)} v${s.version}`).join('、')}</p></section>)}
            <button className="hy-btn" disabled={busy} onClick={() => openEditor('expert', e)}>新增專家版本</button>
            {editor?.kind === 'expert' && editor.id === e.id && renderEditor()}
          </div></details>
        </article>
      })}</div>
      {!expertGroups.length && <p className="hy-empty">{search ? '沒有符合的專家。' : '尚無已登錄專家，請先發布 Skill，再建立專家候選。'}</p>}
      <div className="et-actions"><button className="hy-btn is-primary" disabled={busy} onClick={() => openEditor('expert')}>新增專家</button><span className="hy-note">新增後先成為候選，需你核准才上線。</span></div>
      {editor?.kind === 'expert' && !editor.id && <section className="hy-card">{renderEditor()}</section>}
    </>}

    {tab === 'skills' && data && <div className="hy-stack">
      {SOURCE_GROUPS.map(([source, title, note]) => {
        const groups = skillGroups.filter(rows => skillSource(rows[0].id) === source)
        if (!groups.length) return null
        return <section className="hy-card" key={source}>
          <div className="hy-card-head"><h2 className="hy-card-title">{title} <span className="et-count">{groups.length}</span></h2></div>
          <p className="hy-note">{note}</p>
          <ul className="hy-list et-skill-list">{groups.map(rows => {
            const s = rows.find(v => v.state === 'PUBLISHED') || rows[0], users = usedBy(s.id), waiting = rows.some(v => skillAction(v))
            return <li key={s.id} className={waiting ? 'needs-you' : undefined}><div className="et-grow"><b>{s.name}</b> <span className="hy-note">v{s.version}{rows.length > 1 ? ` · ${rows.length} 個版本` : ''}</span><div className="hy-note">{s.description}</div><div className="hy-note">用在：{users.length ? users.join('、') : source === 'legacy' ? '舊專案' : '尚未綁定專家'}</div></div>
              <div className="et-row-end"><Status state={waiting ? 'CANDIDATE' : s.state} /><button className="hy-btn" onClick={() => openSkill(s.id)}>看內容</button></div></li>
          })}</ul>
        </section>
      })}
      {!skillGroups.length && <p className="hy-empty">{search ? '沒有符合的 Skill。' : '尚無 Skill，請先建立候選版本。'}</p>}
      <div className="et-actions"><button className="hy-btn is-primary" disabled={busy} onClick={() => openEditor('skill')}>新增 Skill</button><span className="hy-note">新增後先成為候選，需你核准才發布。</span></div>
      {editor?.kind === 'skill' && <section className="hy-card">{renderEditor()}</section>}
    </div>}

    {tab === 'models' && <ModelsTab />}

    {tab === 'requests' && <section className="hy-card hy-stack"><div className="hy-card-head"><h2 className="hy-card-title">能力請求</h2></div><p className="hy-note">PI 規劃時發現缺少專家、Skill 或工具，會在這裡提出；需要你核准的會同時出現在待辦匣。</p>
      <div className="pi-controls"><label>專案<select value={project} onChange={e => setProject(e.target.value)}><option value="">請選專案</option>{projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button className="hy-btn" disabled={!project || busy} onClick={() => act(async () => setRequests((await api(`/experts/capabilities/requests/${project}`)).requests))}>讀取所選專案缺口</button></div>
      {requests.map(r => <p key={r.request_id}>{r.need} · {r.state}</p>)}</section>}

    {panelRows && <div className="et-panel" onClick={e => { if (e.target === e.currentTarget) setPanel(null) }}>
      <div className="et-panel-box" role="dialog" aria-modal="true" aria-label={panelRows[0].name}>
        <div className="hy-card-head"><h2 className="hy-card-title">{panelRows[0].name}</h2><button className="hy-btn" onClick={() => setPanel(null)}>關閉</button></div>
        <p className="hy-note">用在：{usedBy(panelRows[0].id).join('、') || '尚未綁定專家'}</p>
        {panelRows.map(s => { const a = skillAction(s), body = contents[pinKey(s)]; return <section className="pi-version" key={pinKey(s)}>
          <div className="hy-card-head"><h3>v{s.version}</h3><Status state={s.state} /></div>
          {body ? <SkillContent body={body} /> : <p>讀取中…</p>}
          {a && decisions(a, !!body)}
          <div className="pi-controls"><button className="hy-btn" disabled={busy || !body} onClick={() => { setPanel(null); setTab('skills'); openEditor('skill', body) }}>新增 Skill 版本</button><button className="hy-btn is-danger" disabled={busy || !s.can_delete} onClick={() => remove(s)}>刪除版本 {s.version}</button></div>
          {!s.can_delete && <p className="hy-note">{s.references?.length ? '此版本被專家、工作包或紀錄引用，無法刪除。' : '此版本由系統管理，無法刪除。'}</p>}
        </section> })}
      </div>
    </div>}
  </div>
}
