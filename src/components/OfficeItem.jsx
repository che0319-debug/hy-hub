// 小案：不開專案，格式跟專案一樣有「報告／會議室／日誌」，但報告簡化，主要在會議室直接核准。
import { useState } from 'react'
import { Decision } from './OfficeDecisions'
import { closeOfficeItem, OFFICE_NAMES } from '../botOfficeData'
import { authHeaders, expireSession } from '../auth'
import { INBOX_CATEGORIES, decisionCategory } from '../inbox/inboxData.js'
import './office-inbox.css'

const CATEGORY_LABEL = Object.fromEntries(INBOX_CATEGORIES)
const TABS = [['overview', '報告'], ['meeting', '會議室'], ['log', '日誌']]
const when = value => { const d = new Date(value); return value && !Number.isNaN(d.getTime()) ? d.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '尚未記錄' }

export default function OfficeItem({ item, reload, onBack, canClose = false }) {
  const [tab, setTab] = useState('meeting'), [busy, setBusy] = useState(false), [error, setError] = useState(null)
  const category = decisionCategory(item)
  const owner = OFFICE_NAMES[item.ownerBot] || item.ownerBot || '尚未指定'
  async function close() {
    setBusy(true); setError(null)
    try { await closeOfficeItem(item, { headers: authHeaders() }); await reload(); onBack() } catch (e) { setError(e); if (e.kind === 'conflict') await reload() } finally { setBusy(false) }
  }
  return <section className="ao ao-project oi-item" aria-label={`小案：${item.title}`}>
    <button className="ao-back" onClick={onBack}>‹ Bot Office</button>
    <header className="ao-header"><div className="ao-header-top oi-item-head"><h1>{item.title}</h1><span className="ao-type">小案</span>
      <span className="hy-pill" data-s={item.status === 'open' ? 'you' : 'done'}>{item.status === 'open' ? `${CATEGORY_LABEL[category]}・待你處理` : '已回覆・等負責 Bot 結案'}</span></div>
      <div className="oi-item-meta"><span>負責 <b>{owner}</b></span><span>屬性 <b>{CATEGORY_LABEL[category]}</b></span>{item.source && <span>來源 <b>{item.source}</b></span>}{item.deadline && <span>到期 <b>{item.deadline}</b></span>}<span>開立 <b>{when(item.askedAt)}</b></span></div>
    </header>
    <nav className="ao-tabs" aria-label="小案分頁">{TABS.map(([key, label]) => <button key={key} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}>{label}{key === 'meeting' && item.status === 'open' && <span>1</span>}</button>)}</nav>
    <div hidden={tab !== 'overview'}><section className="ao-card"><h2>報告</h2>
      <p className="ao-muted">小案不開專案、不跑規劃與審查，沒有完整報告；要你做的事在「會議室」。</p>
      {item.suggestion && <p><b>建議：</b>{item.suggestion}</p>}{item.why && <p><b>理由：</b>{item.why}</p>}
      {item.sourceRef && (item.sourceUrl ? <p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">開啟原始資料 ↗</a></p> : <p className="ao-muted">原始資料：{item.sourceRef}</p>)}
    </section></div>
    <div hidden={tab !== 'meeting'}>
      <Decision item={item} reload={reload} />
      {canClose && <div className="ao-toolbar"><button type="button" disabled={busy} onClick={close}>{item.status === 'open' ? '不用處理，直接結案' : '結案'}</button></div>}
      {error && <div role="alert"><p>{error.message}</p>{error.kind === 'auth' && <button onClick={expireSession}>重新登入</button>}</div>}
    </div>
    <div hidden={tab !== 'log'}><section className="ao-card"><h2>日誌</h2>
      {item.logs?.length ? <ol className="ao-bullets">{item.logs.map(l => <li key={l.id}><time>{when(l.at)}</time>　{l.note || l.content}</li>)}</ol> : <p className="ao-empty">還沒有紀錄。</p>}
    </section></div>
  </section>
}
