// Inbox：所有訊息集中在這裡，一則一張卡片。分類：待我處理／問題回報／過期／今日任務。
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useInbox } from '../inbox/InboxContext'
import { INBOX_KINDS, assignOwnerPanelId } from '../inbox/inboxData.js'
import OwnerBotPicker from '../components/OwnerBotPicker'
import '../../public/hy-ui/hy-ui.css'

const TONE = { decide: 'you', problem: 'bad', overdue: 'bad', today: 'wait' }
const KIND_LABEL = Object.fromEntries(INBOX_KINDS)
const TAB_LABEL = { all: '全部', decide: '待處理', problem: '問題', overdue: '過期', today: '今日' }   // 分頁用短名，手機一屏放得下
const EMPTY = { decide: '目前沒有需要你決定的事。', problem: '沒有問題回報。', overdue: '沒有過期的項目。', today: '今天沒有任務。' }
const fmtDue = d => d.slice(5).replace('-', '/')
const btn = { minHeight: 44, display: 'inline-flex', alignItems: 'center' }

function Card({ it, projects, onSaved }) {
  const [open, setOpen] = useState(false)
  const needs = it.kind === 'decide'
  const panelId = assignOwnerPanelId(it.id)
  return (
    <section className={'hy-card' + (needs ? ' needs-you' : '')}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <span className="hy-pill" data-s={TONE[it.kind]}>{KIND_LABEL[it.kind]}</span>
        <span className="hy-meta">{it.source}{it.meta ? `・${it.meta}` : ''}</span>
        {it.due && <span className="hy-meta" style={{ marginLeft: 'auto' }}>{it.kind === 'overdue' ? '逾期 ' : ''}{fmtDue(it.due)}</span>}
        {it.time && <span className="hy-meta" style={{ marginLeft: 'auto' }}>{it.time}</span>}
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>{it.title}</h2>
      {it.detail && <p style={{ whiteSpace: 'pre-line', marginTop: 4 }}>{it.detail.length > 140 ? it.detail.slice(0, 139) + '…' : it.detail}</p>}
      {it.assignOwner && it.action && (
        <p style={{ marginTop: 8 }}>
          <button type="button" className="hy-btn" style={btn} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(v => !v)}>{open ? '收合' : it.action}</button>
        </p>
      )}
      {it.assignOwner && open && <div id={panelId}><OwnerBotPicker projects={projects} onSaved={onSaved} heading={false} /></div>}
      {!it.assignOwner && it.to && it.action && <p style={{ marginTop: 8 }}><Link className="hy-btn" style={btn} to={it.to}>{it.action}</Link></p>}
    </section>
  )
}

export default function Inbox() {
  const { items, counts, loaded, actionsFailed, officeFailed, roster, reloadOffice } = useInbox()
  const [params, setParams] = useSearchParams()
  const tab = INBOX_KINDS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'all'
  const shown = tab === 'all' ? items : items.filter(i => i.kind === tab)
  const go = k => setParams(k === 'all' ? {} : { tab: k }, { replace: true })
  const tabs = [['all', TAB_LABEL.all, items.length], ...INBOX_KINDS.map(([k]) => [k, TAB_LABEL[k], counts[k]])]
  return (
    <div className="hy hy-stack" style={{ maxWidth: 720, margin: '0 auto' }}>
      <div className="hy-pagehead"><h1 style={{ fontSize: 22, fontWeight: 700 }}>Inbox</h1>{loaded && <span className="hy-pill" data-s={counts.total ? 'you' : 'done'}>{counts.total ? `${counts.total} 件要處理` : '都處理完了'}</span>}</div>
      <nav className="hy-tabs" role="tablist" aria-label="Inbox 分類" style={{ padding: 0 }}>
        {tabs.map(([k, l, n]) => <button key={k} type="button" role="tab" className="hy-tab" aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)} style={{ padding: '0 12px' }}>{l}{n > 0 ? ` ${n}` : ''}</button>)}
      </nav>
      {!loaded && <p className="hy-lede">讀取中…</p>}
      {actionsFailed && <div className="hy-card"><p>讀不到 AI Office，待確認事項可能不完整。</p></div>}
      {officeFailed && <div className="hy-card"><p>讀不到 Bot Office，待決定事項可能不完整。</p></div>}
      {loaded && !shown.length && <div className="hy-card"><p>{tab === 'all' ? '目前沒有任何訊息。' : EMPTY[tab]}</p></div>}
      {shown.map(it => <Card key={it.id} it={it} projects={roster?.office?.projects || []} onSaved={reloadOffice} />)}
    </div>
  )
}
