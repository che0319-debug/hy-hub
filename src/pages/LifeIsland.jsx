import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'
import '../life-island/life-island.css'
import { CENTRAL_ISLAND, STATUS_INFO, WORLD_STATUS } from '../life-island/data'
import { createIslandScene, webglOk } from '../life-island/scene'

const BUILDINGS = CENTRAL_ISLAND.buildings
const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]))

function StatusBar({ onGo }) {
  const w = WORLD_STATUS
  return (
    <div className="li-status" role="group" aria-label="今日狀態">
      <button type="button" className="li-chip" data-s={w.overdue > 0 ? 'bad' : 'wait'} onClick={() => onGo('today')}>
        逾期 <b>{w.overdue}</b>・今日待辦 <b>{w.today}</b>
      </button>
      <button type="button" className="li-chip li-chip-you" data-s={w.needsYou > 0 ? 'you' : 'done'} onClick={() => onGo('dispatch')}>
        待你確認 <b>{w.needsYou}</b>
      </button>
      <button type="button" className="li-chip" data-s={w.systemIssues > 0 ? 'bad' : 'done'} onClick={() => onGo('syscenter')}>
        {w.systemIssues > 0 ? <>系統有異狀 <b>{w.systemIssues}</b></> : '系統正常'}
      </button>
      <details className="li-legend">
        <summary>狀態色說明</summary>
        <ul>
          {Object.entries(STATUS_INFO).map(([k, v]) => <li key={k}><i data-s={k} />{v}</li>)}
        </ul>
      </details>
    </div>
  )
}

function BuildingCard({ b, onClose }) {
  return (
    <section className="hy-card is-focus" aria-live="polite">
      <div className="hy-card-head">
        <h2 className="hy-card-title">{b.title}</h2>
        <button type="button" className="hy-btn" onClick={onClose} aria-label="關閉卡片">關閉</button>
      </div>
      <p className="hy-lede" style={{ marginTop: 8 }}>{b.blurb}</p>
      <dl className="hy-kv">
        <dt>所在島</dt><dd>{CENTRAL_ISLAND.name}</dd>
        <dt>負責</dt><dd>{b.agent}</dd>
        <dt>類型</dt><dd>{b.kind}</dd>
        <dt>頁面</dt><dd>{b.status === '現有' ? '已有 2D 頁，直接開啟' : b.status === '新做' ? '之後新做' : '待補'}</dd>
      </dl>
      {b.note && <p className="hy-lede" style={{ marginTop: 12 }}>{b.note}</p>}
      <div className="li-links">
        {b.links.map((l, i) => (
          <Link key={l.to} to={l.to} className={'hy-btn' + (i === 0 ? ' is-primary' : '')} style={{ display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}>{l.label}</Link>
        ))}
        {!b.links.length && <span className="hy-lede">還沒有可開啟的頁面</span>}
      </div>
    </section>
  )
}

export default function LifeIsland() {
  const stageRef = useRef(null)
  const layerRef = useRef(null)
  const apiRef = useRef(null)
  const [sel, setSel] = useState(null)
  const [gl, setGl] = useState(() => webglOk())

  useEffect(() => {
    if (!gl || !stageRef.current) return undefined
    let api
    try {
      api = createIslandScene(stageRef.current, layerRef.current, { onSelect: id => setSel(id) })
      apiRef.current = api
    } catch (e) {
      console.warn('[LifeIsland] WebGL 啟動失敗，改用清單', e)
      setGl(false)
    }
    return () => { api && api.dispose(); apiRef.current = null }
  }, [gl])

  function choose(id) {
    setSel(id)
    apiRef.current && apiRef.current.select(id, false)
  }

  const b = sel ? BY_ID[sel] : null
  return (
    <div className="hy" style={{ paddingTop: 16 }}>
      <div className="hy-pagehead">
        <div>
          <h1 className="hy-title">🏝️ HY Life 島</h1>
          <p className="hy-lede">目前只建了中央島（原型、範例內容）。點建築開卡片，舊的 2D 頁都還在。</p>
        </div>
      </div>
      <StatusBar onGo={choose} />
      {WORLD_STATUS.demo && <p className="hy-lede" style={{ marginTop: -6, marginBottom: 12, fontSize: 12 }}>狀態列的數字目前是範例，等資料接上後會換成真的。</p>}
      <div className="li-grid">
        <div>
          {gl ? (
            <div className="li-stage" role="img" aria-label="HY Life 島：中央島的 3D 場景，下方有同樣內容的清單">
              <div ref={stageRef} style={{ position: 'absolute', inset: 0 }} />
              <div ref={layerRef} className="li-layer" />
              <button type="button" className="hy-btn li-reset" onClick={() => { apiRef.current && apiRef.current.home(); }}>回中央島</button>
              <div className="li-hint">拖曳旋轉、滾輪或雙指縮放、Shift＋拖曳平移</div>
            </div>
          ) : (
            <div className="hy-empty">這台裝置不支援 3D，改用下方清單。內容與 3D 相同。</div>
          )}
        </div>
        <div style={{ display: 'grid', gap: 16 }}>
          {b ? <BuildingCard b={b} onClose={() => choose(null)} /> : (
            <div className="hy-empty">點一棟建築，這裡會顯示它的卡片。</div>
          )}
          <section className="hy-card">
            <h2 className="hy-card-title">中央島的建築</h2>
            <ul className="hy-list li-bldlist">
              {BUILDINGS.map(x => (
                <li key={x.id} style={{ padding: 0 }}>
                  <button type="button" className="hy-btn" style={{ border: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => choose(x.id)} aria-pressed={sel === x.id}>
                    <span>{x.title}</span><span style={{ color: 'var(--hy-muted)' }}>{x.agent}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
