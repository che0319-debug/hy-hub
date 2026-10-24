import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'
import '../life-island/life-island.css'
import { ALL_BUILDINGS, FIGURES, STATUS_INFO, WORLD_STATUS } from '../life-island/data'
import { createIslandScene, webglOk } from '../life-island/scene'

const BUILDINGS = ALL_BUILDINGS
const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]))

// 小地圖：五座島的大致位置（x、y 是百分比）。built=false 的還沒建，先標示建設中。
const MAP_ISLANDS = [
  { id: 'central', name: '中央島', x: 50, y: 56, built: true },
  { id: 'biz', name: '本業島', x: 20, y: 34, built: true },
  { id: 'life', name: '人生島', x: 80, y: 30, built: true },
  { id: 'family', name: '家庭島', x: 24, y: 80, built: true },
  { id: 'side', name: '副業島', x: 78, y: 80, built: true },
]
const FIG_BY_ID = Object.fromEntries(FIGURES.map(f => [f.id, f]))

function useStored(key, init) {
  const [v, setV] = useState(() => { try { const r = localStorage.getItem(key); return r === null ? init : r === '1' } catch { return init } })
  const set = x => { setV(x); try { localStorage.setItem(key, x ? '1' : '0') } catch { /* 無痕模式等情況，忽略 */ } }
  return [v, set]
}

function StatusBar({ onGo }) {
  const w = WORLD_STATUS
  const [min, setMin] = useStored('li_status_min', false)
  const worst = w.needsYou > 0 ? 'you' : (w.overdue > 0 || w.systemIssues > 0) ? 'bad' : 'done'
  if (min) {
    return (
      <div className="li-status">
        <button type="button" className="li-chip li-chip-mini" data-s={worst} onClick={() => setMin(false)} aria-label="展開今日狀態" aria-expanded="false">
          <i className="li-dot" />今日狀態
        </button>
      </div>
    )
  }
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
      <button type="button" className="li-mini-btn" onClick={() => setMin(true)} aria-label="收起今日狀態" title="收起">－</button>
      <details className="li-legend">
        <summary>狀態色說明</summary>
        <ul>
          {Object.entries(STATUS_INFO).map(([k, v]) => <li key={k}><i data-s={k} />{v}</li>)}
          {WORLD_STATUS.demo && <li className="li-legend-note">上方狀態列的數字目前是範例，資料接上後會換成真的。</li>}
        </ul>
      </details>
    </div>
  )
}

function MiniMap({ onGo, current }) {
  const [min, setMin] = useStored('li_map_min', false)
  if (min) return <button type="button" className="li-chip li-chip-mini li-map-mini" data-s="wait" onClick={() => setMin(false)} aria-expanded="false" aria-label="展開小地圖"><i className="li-dot" />小地圖</button>
  return (
    <div className="li-map" role="group" aria-label="小地圖">
      <button type="button" className="li-mini-btn li-map-close" onClick={() => setMin(true)} aria-label="收起小地圖" title="收起">－</button>
      {MAP_ISLANDS.map(m => (
        <button key={m.id} type="button" className={'li-map-isl' + (current === m.id ? ' is-cur' : '')} data-built={m.built ? '1' : '0'} style={{ left: m.x + '%', top: m.y + '%' }}
          disabled={!m.built} onClick={() => onGo(m.id)} aria-label={m.built ? '前往' + m.name : m.name + '（建設中）'}>
          <span>{m.name}</span>{!m.built && <em>建設中</em>}
        </button>
      ))}
    </div>
  )
}

function BotCard({ f, onClose }) {
  const [min, setMin] = useStored('li_card_min', false)
  const btn = { display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }
  if (min) {
    return (
      <section className="hy-card li-card-min">
        <button type="button" className="li-card-bar" onClick={() => setMin(false)} aria-expanded="false" aria-label={'展開' + f.name}>
          <span className="hy-card-title">{f.name}</span><span className="hy-pill" data-s={f.status}>{STATUS_INFO[f.status]}</span>
        </button>
        <button type="button" className="hy-btn" onClick={onClose} aria-label="關閉卡片">關閉</button>
      </section>
    )
  }
  return (
    <section className={'hy-card is-focus' + (f.status === 'you' ? ' needs-you' : '')} aria-live="polite">
      <div className="hy-card-head">
        <h2 className="hy-card-title">{f.name} <span className="hy-pill" data-s={f.status}>{STATUS_INFO[f.status]}</span></h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="hy-btn" onClick={() => setMin(true)} aria-label="縮小卡片">縮小</button>
          <button type="button" className="hy-btn" onClick={onClose} aria-label="關閉卡片">關閉</button>
        </div>
      </div>
      <p className="hy-lede" style={{ marginTop: 8 }}>{f.role}</p>
      <dl className="hy-kv">
        <dt>正在做</dt><dd>{f.doing}</dd>
        <dt>最近完成</dt><dd>{f.last}</dd>
      </dl>
      <p className="hy-lede" style={{ marginTop: 12, fontSize: 12 }}>內容目前是範例，資料接上後會換成真的。</p>
      <div className="li-links">
        {f.status === 'you' && <Link to="/bot-office" className="hy-btn is-primary" style={btn}>去確認</Link>}
        <Link to="/bot-office" className="hy-btn" style={btn}>專案</Link>
        {f.board && <Link to={f.board} className="hy-btn" style={btn}>待辦</Link>}
        <button type="button" className="hy-btn li-btn-soon" disabled title="對話功能建置中">對話（建置中）</button>
      </div>
    </section>
  )
}

function BuildingCard({ b, onClose, floating }) {
  const [min, setMin] = useStored('li_card_min', false)
  if (floating && min) {
    return (
      <section className="hy-card li-card-min">
        <button type="button" className="li-card-bar" onClick={() => setMin(false)} aria-expanded="false" aria-label={'展開' + b.title}>
          <span className="hy-card-title">{b.title}</span><span className="li-card-act">展開</span>
        </button>
        <button type="button" className="hy-btn" onClick={onClose} aria-label="關閉卡片">關閉</button>
      </section>
    )
  }
  return (
    <section className="hy-card is-focus" aria-live="polite">
      <div className="hy-card-head">
        <h2 className="hy-card-title">{b.title}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {floating && <button type="button" className="hy-btn" onClick={() => setMin(true)} aria-label="縮小卡片">縮小</button>}
          <button type="button" className="hy-btn" onClick={onClose} aria-label="關閉卡片">關閉</button>
        </div>
      </div>
      <p className="hy-lede" style={{ marginTop: 8 }}>{b.blurb}</p>
      <dl className="hy-kv">
        <dt>所在島</dt><dd>{b.islandName}</dd>
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
  const [mapCur, setMapCur] = useState('central')
  const [sky, setSky] = useState(null)

  useEffect(() => {
    if (!gl || !stageRef.current) return undefined
    let api
    try {
      api = createIslandScene(stageRef.current, layerRef.current, { onSelect: id => setSel(id), onSky: v => setSky(v) })
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

  const b = sel && !sel.startsWith('bot:') ? BY_ID[sel] : null
  const fig = sel && sel.startsWith('bot:') ? FIG_BY_ID[sel.slice(4)] : null
  return (
    <div className="hy li-page">
      <h1 className="li-sr">HY Life 島</h1>
      {gl ? (
        <div className="li-stage" role="group" aria-label="HY Life 島：中央島的 3D 場景">
          <div ref={stageRef} style={{ position: 'absolute', inset: 0 }} />
          <div ref={layerRef} className="li-layer" />
          <MiniMap onGo={id => { setSel(null); setMapCur(id); apiRef.current && apiRef.current.focus(id) }} current={mapCur} />
          <div className="li-hud">
            <StatusBar onGo={choose} />
            <button type="button" className="hy-btn li-reset" onClick={() => { apiRef.current && apiRef.current.home(); }}>回中央島</button>
          </div>
          {sky && (
            <div className={'li-sign' + (sky.night > 0.6 ? ' is-night' : '')} aria-label={`新竹 ${sky.date} ${sky.weekday} ${sky.time}，${sky.phase}，${sky.weather}`}>
              <span className="li-sign-d">{sky.date} {sky.weekday}</span>
              <span className="li-sign-t">{sky.time} · {sky.phase} · {sky.weather}{sky.temp != null ? ` ${sky.temp}°` : ''}</span>
            </div>
          )}
          {(b || fig) && <div className="li-float">{fig ? <BotCard f={fig} onClose={() => choose(null)} /> : <BuildingCard floating b={b} onClose={() => choose(null)} />}</div>}
          <div className="li-hint">拖曳旋轉、滾輪或雙指縮放、Shift＋拖曳平移</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="hy-empty">這台裝置不支援 3D，改用下方清單。內容與 3D 相同。</div>
          <StatusBar onGo={choose} />
          {b && <BuildingCard b={b} onClose={() => choose(null)} />}
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
      )}
    </div>
  )
}
