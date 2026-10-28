// 「我的小幫手」分頁的卡片：每位一張，可展開／收合。資料來自 useBotRoster（HY Life 島也讀同一份），這裡不打 API。
import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'
import './bot-roster.css'
import { HELPERS, avatarUrl } from '../botRoster'
import { STATUS_INFO } from '../life-island/data'
import { freshness } from '../lib/memoryFreshness'

const OPEN_KEY = 'hy_roster_open'
const FRESH_TONE = { fresh: 'done', aging: 'wait', stale: 'bad', none: 'wait' }
const dash = v => (v === null || v === undefined ? '—' : v)

function readOpen() { try { return JSON.parse(localStorage.getItem(OPEN_KEY) || '{}') || {} } catch { return {} } }
function writeOpen(v) { try { localStorage.setItem(OPEN_KEY, JSON.stringify(v)) } catch { /* 無痕模式等情況，忽略 */ } }

function Fresh({ iso }) {
  if (!iso) return <span className="bot-soon">—</span>
  const f = freshness(iso)
  return <span className="hy-pill" data-s={FRESH_TONE[f.level]}>{f.label}</span>
}

function Card({ h, d, loaded, open, onToggle }) {
  const o = d?.office, t = d?.todos
  const status = d?.status ?? 'wait'
  const line = o ? `進行中 ${o.running + o.review}・完成 ${o.done}` : loaded ? '—' : '讀取中…'
  const id = 'bot-' + h.id
  return (
    <section className={'hy-card bot-card' + (status === 'you' ? ' needs-you' : '')} aria-labelledby={id + '-t'}>
      <div className="bot-head">
        <img className="bot-avatar" src={avatarUrl(h.id)} alt="" width="56" height="56" />
        <div className="bot-id">
          <h3 className="hy-card-title" id={id + '-t'}>{h.name}</h3>
          <div className="bot-role">{h.role}</div>
        </div>
        <span className="hy-pill" data-s={status}>{STATUS_INFO[status]}</span>
      </div>
      <div className="bot-line">{line}</div>
      <button type="button" className="hy-btn bot-toggle" aria-expanded={open} aria-controls={id + '-d'} onClick={onToggle}>{open ? '收合' : '展開'}</button>
      {open && (
        <div id={id + '-d'} className="hy-stack">
          <dl className="hy-kv">
            <dt>正在做</dt><dd>{d?.doing || '—'}</dd>
            <dt>進行中</dt><dd>{o ? `${o.running} 執行中・${o.review} 待審` : '—'}</dd>
            <dt>待你確認</dt><dd>{o ? (o.asks + o.hyDecision > 0 ? <span className="hy-pill" data-s="you">{o.asks + o.hyDecision}</span> : 0) : '—'}</dd>
            <dt>等待派工</dt><dd>{dash(o?.waiting)}</dd>
            <dt>完成的專案</dt><dd>{dash(o?.done)}</dd>
            <dt>被退回</dt><dd>{o ? (o.returned > 0 ? <span className="hy-pill" data-s="bad">{o.returned}</span> : 0) : '—'}</dd>
            <dt>全部專案</dt><dd>{dash(o?.total)}</dd>
            <dt>待辦</dt><dd>{t ? <>逾期 {t.overdue > 0 ? <span className="hy-pill" data-s="bad">{t.overdue}</span> : 0}・今日 {t.today}</> : '—'}</dd>
            <dt>要詢問你的事</dt><dd><span className="hy-pill" data-s="wait">待建立</span></dd>
            <dt>長期記憶</dt><dd><Fresh iso={d?.memory?.memory_last} /></dd>
            <dt>短期記憶</dt><dd><Fresh iso={d?.memory?.short_term_last} /></dd>
          </dl>
          <div className="bot-links">
            {status === 'you' && <Link to="/bot-office" className="hy-btn is-primary">去確認</Link>}
            <Link to="/bot-office" className="hy-btn">專案</Link>
            {h.board && <Link to={h.board} className="hy-btn">待辦</Link>}
            <Link to={`/agent/${h.persona}`} className="hy-btn">人設與記憶</Link>
          </div>
        </div>
      )}
    </section>
  )
}

export default function BotRosterCards({ roster }) {
  const [open, setOpen] = useState(readOpen)
  const set = next => { setOpen(next); writeOpen(next) }
  const allOpen = HELPERS.every(h => open[h.id])
  const toggleAll = () => set(Object.fromEntries(HELPERS.map(h => [h.id, !allOpen])))
  return (
    <div className="hy-stack">
      <div className="bot-tools">
        <p className="hy-note">
          {roster.officeEmpty ? 'Bot Office 還沒有資料，等 Atlas 產生第一份狀態。'
            : roster.unowned > 0 ? `有 ${roster.unowned} 個專案沒有指定負責 Bot。到 Inbox 的「專案歸屬」按處理，或在 Bot Office 上方直接指定。` : ' '}
        </p>
        <button type="button" className="hy-btn" onClick={toggleAll}>{allOpen ? '全部收合' : '全部展開'}</button>
      </div>
      <div className="bot-grid">
        {HELPERS.map(h => (
          <Card key={h.id} h={h} d={roster.bots[h.id]} loaded={roster.loaded} open={!!open[h.id]} onToggle={() => set({ ...open, [h.id]: !open[h.id] })} />
        ))}
      </div>
    </div>
  )
}
