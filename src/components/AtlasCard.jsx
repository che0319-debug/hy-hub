// Atlas＝營運長（COO）：維運 HY Life OS，不做專案工作。排在 AI 軍團 HY 欄的組員位置。
// 五項檢查與 24 小時說明收在展開區。收合時仍看得到名稱、角色與巡檢結果。
// 資料與 HY Life 島共用（由小幫手頁傳入 useBotRoster 的結果），這裡不打 API。
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'
import './bot-roster.css'
import { rosterById, avatarUrl } from '../botRoster'
import { STATUS_INFO } from '../life-island/data'
import { ATLAS_STALE_HOURS } from '../life-island/worldData'

const GO = { office: '/bot-office' }

export default function AtlasCard({ roster, open = false, onToggle }) {
  const a = roster?.bots?.atlas
  const me = rosterById('atlas')
  const status = a?.status ?? 'wait'
  return (
    <section className={'hy-card bot-card atlas-card' + (status === 'bad' ? ' is-bad' : '')} aria-labelledby="atlas-t">
      <div className="bot-head">
        <img className="bot-avatar" src={avatarUrl('atlas')} alt="" width="56" height="56" />
        <div className="bot-id">
          <div className="bot-name-row">
            <h3 className="hy-card-title" id="atlas-t">{me.name}</h3>
            <span className="hy-pill" data-s={status}>{status === 'bad' ? '有問題' : STATUS_INFO[status]}</span>
          </div>
          <div className="bot-role">{me.role}</div>
        </div>
      </div>
      <div className="bot-line">{a?.doing || '正在檢查系統…'}</div>
      <button type="button" className="hy-btn bot-toggle" aria-expanded={open} aria-controls="atlas-d" onClick={onToggle}>{open ? '收合' : '展開'}</button>
      {open && (
        <div id="atlas-d" className="hy-stack">
          <p className="hy-note atlas-note">負責維運 HY Life OS：Bot Office、工作包推進與派工。不做專案工作。</p>
          {a?.checks?.length > 0 && (
            <ul className="atlas-checks" aria-label="系統健康">
              {a.checks.map(c => (
                <li key={c.label}>
                  <span className="hy-pill" data-s={c.ok ? 'done' : 'bad'}>{c.ok ? '正常' : '異常'}</span>
                  <span className="atlas-check-label">{c.label}</span>
                  <span className="atlas-check-detail">{c.detail}</span>
                  {!c.ok && GO[c.go] && <Link to={GO[c.go]} className="li-attn-go">處理</Link>}
                </li>
              ))}
            </ul>
          )}
          <p className="hy-note atlas-note">Bot Office 超過 {ATLAS_STALE_HOURS} 小時沒更新，會視為異常。</p>
        </div>
      )}
    </section>
  )
}
