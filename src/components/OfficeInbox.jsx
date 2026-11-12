// Bot Office 首頁最上方「待你處理」：原本的 Inbox 併進來（Office 決策與小案卡、問題回報、過期／今日待辦）。
// 依負責 Bot 與屬性篩選。資料來源與底部導覽數字相同（buildInbox）。
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { INBOX_CATEGORIES, INBOX_OWNERS, filterInbox, assignOwnerPanelId } from '../inbox/inboxData.js'
import OwnerBotPicker from './OwnerBotPicker'
import './office-inbox.css'

const CATEGORY_LABEL = Object.fromEntries(INBOX_CATEGORIES)
const OWNER_LABEL = Object.fromEntries(INBOX_OWNERS)
const TONE = { approval: 'you', data: 'you', suggestion: 'ai', report: 'wait', problem: 'bad', todo: 'wait' }
const fmtDue = d => (d ? d.slice(5).replace('-', '/') : '')

function Row({ it, projects, onSaved, onOpenItem, onOpenProject }) {
  const [open, setOpen] = useState(false)
  const panelId = assignOwnerPanelId(it.id)
  const go = it.kind === 'decide'
    ? <button type="button" className="ao-btn ao-primary" onClick={() => (it.isItem ? onOpenItem(it.decisionId) : onOpenProject(it.projectId))}>{it.action}</button>
    : it.assignOwner ? <button type="button" className="ao-btn" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(v => !v)}>{open ? '收合' : it.action}</button>
    : it.to && it.action ? <Link className="ao-btn" to={it.to}>{it.action}</Link> : null
  return <li className={`oi-row${it.kind === 'decide' ? ' needs-you' : ''}`} data-kind={it.kind}>
    <div className="oi-tags">
      <span className="hy-pill" data-s={TONE[it.category] || 'wait'}>{CATEGORY_LABEL[it.category] || '其他'}</span>
      {it.light && it.isItem && <span className="hy-pill" data-s="wait">小案</span>}
      <span className="oi-meta">{OWNER_LABEL[it.owner] || it.source}{it.meta ? `・${it.meta}` : it.isItem && it.source ? `・${it.source}` : ''}</span>
      {it.due && <span className="oi-meta oi-due">{it.kind === 'overdue' ? '逾期 ' : '到期 '}{fmtDue(it.due)}</span>}
      {it.time && <span className="oi-meta oi-due">{it.time}</span>}
    </div>
    <div className="oi-body"><b>{it.title}</b>{it.detail && <p>{it.detail.length > 140 ? it.detail.slice(0, 139) + '…' : it.detail}</p>}</div>
    {go && <div className="oi-go">{go}</div>}
    {it.assignOwner && open && <div id={panelId} className="oi-panel"><OwnerBotPicker projects={projects} onSaved={onSaved} heading={false} /></div>}
  </li>
}

export default function OfficeInbox({ items = [], loaded = true, officeFailed = false, projects = [], onSaved, onOpenItem, onOpenProject }) {
  const [owner, setOwner] = useState('all'), [category, setCategory] = useState('all')
  const shown = filterInbox(items, { owner, category })
  const needs = items.filter(i => i.kind !== 'today').length
  const count = (key, value) => filterInbox(items, { owner: key === 'owner' ? value : owner, category: key === 'category' ? value : category }).length
  const chips = (key, list, value, set) => <div className="oi-chips" role="group" aria-label={key === 'owner' ? '依負責 Bot 篩選' : '依屬性篩選'}>
    {[['all', '全部'], ...list].map(([k, label]) => { const n = count(key, k); return <button key={k} type="button" aria-pressed={value === k} onClick={() => set(k)}>{label}{n ? ` ${n}` : ''}</button> })}
  </div>
  return <section className={`ao-card oi${needs ? ' needs-you' : ''}`} aria-label="待你處理" id="office-inbox">
    <div className="ao-card-head"><h2>待你處理</h2>{loaded && <span className="hy-pill" data-s={needs ? 'you' : 'done'}>{needs ? `${needs} 件要處理` : '都處理完了'}</span>}</div>
    <p className="ao-muted">Bot 的核示、要你確認的資料、需要你決定的建議與小案報告，還有問題回報和待辦，都集中在這裡。</p>
    <div className="oi-filters"><span className="oi-label">負責</span>{chips('owner', INBOX_OWNERS, owner, setOwner)}</div>
    <div className="oi-filters"><span className="oi-label">屬性</span>{chips('category', INBOX_CATEGORIES, category, setCategory)}</div>
    {!loaded && <p role="status">讀取中…</p>}
    {officeFailed && <p role="alert">讀不到 Bot Office，待決定事項可能不完整。</p>}
    {loaded && !shown.length && <p className="ao-empty">{items.length ? '這個篩選下沒有項目。' : '目前沒有要你處理的事。'}</p>}
    {shown.length > 0 && <ul className="oi-list">{shown.map(it => <Row key={it.id} it={it} projects={projects} onSaved={onSaved} onOpenItem={onOpenItem} onOpenProject={onOpenProject} />)}</ul>}
  </section>
}
