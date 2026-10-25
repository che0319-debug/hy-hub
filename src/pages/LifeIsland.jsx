import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../../public/hy-ui/hy-ui.css'
import '../life-island/life-island.css'
import { ALL_BUILDINGS, FIGURES, STATUS_INFO } from '../life-island/data'
import { createIslandScene, webglOk } from '../life-island/scene'
import { useWorldInfo, formatDue } from '../life-island/useWorldInfo'
import { useBotRoster } from '../life-island/useBotRoster'
import { LIVE_FIGS } from '../life-island/worldData'
import { rosterById } from '../botRoster'

const BUILDINGS = ALL_BUILDINGS
const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]))

// 小地圖：五座島的大致位置（x、y 是百分比）。built=false 的還沒建，先標示建設中。
const MAP_ISLANDS = [
  { id: 'central', name: '中央島', x: 50, y: 56, built: true },
  { id: 'biz', name: '科研島', x: 20, y: 34, built: true },
  { id: 'life', name: '隱地島', x: 80, y: 30, built: true },
  { id: 'family', name: '棲園島', x: 24, y: 80, built: true },
  { id: 'side', name: '金融島', x: 78, y: 80, built: true },
]
const FIG_BY_ID = Object.fromEntries(FIGURES.map(f => [f.id, f]))

function useStored(key, init) {
  const [v, setV] = useState(() => { try { const r = localStorage.getItem(key); return r === null ? init : r === '1' } catch { return init } })
  const set = x => { setV(x); try { localStorage.setItem(key, x ? '1' : '0') } catch { /* 無痕模式等情況，忽略 */ } }
  return [v, set]
}

function StatusBar({ onGo, info, data, panel, setPanel }) {
  const overdue = info.overdue, todayN = info.todayCount
  const real = overdue !== null
  const needs = data.needsYou, sysN = data.systemIssues
  const toggle = k => setPanel(panel === k ? null : k)
  const nextText = info.schedFailed ? '行程讀取失敗' : info.sched === null ? '行程載入中' : info.next ? `${info.next.start} ${info.next.title}` : info.sched.length ? '今天的行程結束了' : '今天沒有行程'
  return (
    <div className="li-status" role="group" aria-label="今日狀態">
      <button type="button" className="li-chip" data-panel="todo" data-s={overdue > 0 ? 'bad' : 'wait'} onClick={() => toggle('todo')} aria-expanded={panel === 'todo'} aria-controls="li-panel">
        逾期 <b>{real ? overdue : '—'}</b>・今日待辦 <b>{real ? todayN : '—'}</b><i className="li-caret" aria-hidden="true" />
      </button>
      <button type="button" className="li-chip li-chip-next" data-panel="sched" data-s="wait" onClick={() => toggle('sched')} aria-expanded={panel === 'sched'} aria-controls="li-panel" title={nextText}>
        <span className="li-next-t">{nextText}</span><i className="li-caret" aria-hidden="true" />
      </button>
      <button type="button" className="li-chip li-chip-you" data-s={needs > 0 ? 'you' : needs === 0 ? 'done' : 'wait'} onClick={() => onGo('dispatch')}>
        待你確認 <b>{needs ?? '—'}</b>
      </button>
      <button type="button" className="li-chip" data-s={sysN > 0 ? 'bad' : sysN === 0 ? 'done' : 'wait'} onClick={() => onGo('syscenter')}>
        {sysN === null ? '系統載入中' : sysN > 0 ? <>資料讀取異常 <b>{sysN}</b></> : '系統正常'}
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

// 從頂欄往下展開的面板：待辦清單／今日行程
function InfoPanel({ kind, info, onClose }) {
  useEffect(() => {
    const down = e => { if (!e.target.closest('.li-panel') && !e.target.closest('[data-panel]')) onClose() }
    const key = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', down); document.addEventListener('keydown', key)
    return () => { document.removeEventListener('pointerdown', down); document.removeEventListener('keydown', key) }
  }, [onClose])
  const colorOf = due => { const d = String(due).replace(/\//g, '-'); return d < info.today ? 'bad' : d === info.today ? 'today' : 'wait' }
  return (
    <section className="hy-card li-panel" id="li-panel" aria-label={kind === 'todo' ? '待辦清單' : '今日行程'}>
      <div className="hy-card-head">
        <h2 className="hy-card-title">{kind === 'todo' ? '待辦清單' : '今日行程'} <span className="li-panel-sub">{kind === 'todo' ? '逾期＋今天＋近 3 天' : info.today.slice(5).replace('-', '/')}</span></h2>
        <button type="button" className="hy-btn" onClick={onClose} aria-label="收起">收起</button>
      </div>
      {kind === 'todo' ? (
        info.todoFailed ? <p className="hy-lede">待辦暫時讀取失敗，稍後會自動重試。</p>
          : info.list === null ? <p className="hy-lede">載入中…</p>
          : info.list.length === 0 ? <p className="hy-lede">近 3 天沒有待辦。</p>
          : <ul className="li-rows">{info.list.map((m, i) => (
              <li key={i} data-c={colorOf(m.due)}><span className="li-row-main">{m.title}</span><span className="li-row-aux">{formatDue(m.due)}</span></li>
            ))}</ul>
      ) : (
        info.schedFailed ? <p className="hy-lede">行程暫時讀取失敗，稍後會自動重試。</p>
          : info.sched === null ? <p className="hy-lede">載入中…</p>
          : info.sched.length === 0 ? <p className="hy-lede">今天沒有行程。</p>
          : <ul className="li-rows li-rows-t">{info.sched.map((e, i) => (
              <li key={i} data-past={e.start && e.start < info.hm && e !== info.next ? '1' : '0'} data-next={e === info.next ? '1' : '0'}>
                <span className="li-row-aux">{e.start || '全天'}</span><span className="li-row-main">{e.title}</span>{e === info.next && <span className="hy-pill" data-s="ai">下一個</span>}
              </li>
            ))}</ul>
      )}
    </section>
  )
}

function MiniMap({ onGo, current }) {
  return (
    <div className="li-map" role="group" aria-label="小地圖">
      {MAP_ISLANDS.map(m => (
        <button key={m.id} type="button" className={'li-map-isl' + (current === m.id ? ' is-cur' : '')} data-built={m.built ? '1' : '0'} style={{ left: m.x + '%', top: m.y + '%' }}
          disabled={!m.built} onClick={() => onGo(m.id)} aria-label={m.built ? '前往' + m.name : m.name + '（建設中）'}>
          <span>{m.name}</span>{!m.built && <em>建設中</em>}
        </button>
      ))}
    </div>
  )
}

function BotCard({ f: fig, live, loaded, onClose }) {
  const f = { ...fig, status: live?.status ?? 'wait', doing: live?.doing || '—' }
  const note = !LIVE_FIGS.has(fig.id) ? '這位的狀態還沒接資料。' : live ? (live.inferred ? '依工作通道推測，後端尚無派工紀錄。' : '') : loaded ? '讀不到這位的狀態資料。' : '正在讀取狀態…'
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
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <button type="button" className="hy-btn" onClick={() => setMin(true)} aria-label="縮小卡片">縮小</button>
          <button type="button" className="hy-btn" onClick={onClose} aria-label="關閉卡片">關閉</button>
        </div>
      </div>
      <p className="hy-lede" style={{ marginTop: 8 }}>{f.role}</p>
      <dl className="hy-kv">
        <dt>正在做</dt><dd>{f.doing}</dd>
        {live?.office && <><dt>完成的專案</dt><dd>{live.office.done}</dd></>}
        {live?.todos && <><dt>待辦</dt><dd>逾期 {live.todos.overdue}・今日 {live.todos.today}</dd></>}
      </dl>
      {note && <p className="hy-lede" style={{ marginTop: 12, fontSize: 12 }}>{note}</p>}
      <div className="li-links">
        {f.status === 'you' && <Link to="/bot-office" className="hy-btn is-primary" style={btn}>去確認</Link>}
        <Link to="/bot-office" className="hy-btn" style={btn}>專案</Link>
        {f.board && <Link to={f.board} className="hy-btn" style={btn}>待辦</Link>}
        {rosterById(fig.id)?.group === 'helper' && <Link to="/ai-army?tab=helpers" className="hy-btn" style={btn}>詳細</Link>}
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
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, whiteSpace: 'nowrap' }}>
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
  const info = useWorldInfo()
  const data = useBotRoster(info)
  const [panel, setPanel] = useState(null)

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

  // 把真實狀態同步到 3D 小人（光環、標籤、是否停在原地）
  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    for (const [id, v] of Object.entries(data.bots)) if (v) api.setBotStatus(id, v.status)
  }, [data.bots, gl])

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
            <StatusBar onGo={choose} info={info} data={data} panel={panel} setPanel={setPanel} />
          </div>
          {panel && <InfoPanel kind={panel} info={info} onClose={() => setPanel(null)} />}
          {sky && (
            <div className={'li-sign' + (sky.night > 0.6 ? ' is-night' : '')} aria-label={`新竹 ${sky.date} ${sky.weekday} ${sky.time}，${sky.phase}，${sky.weather}`}>
              <span className="li-sign-d">{sky.date} {sky.weekday}</span>
              <span className="li-sign-t">{sky.time} · {sky.phase} · {sky.weather}{sky.temp != null ? ` ${sky.temp}°` : ''}</span>
            </div>
          )}
          {(b || fig) && <div className="li-float">{fig ? <BotCard f={fig} live={data.bots[fig.id]} loaded={data.loaded} onClose={() => choose(null)} /> : <BuildingCard floating b={b} onClose={() => choose(null)} />}</div>}
          <div className="li-hint">拖曳旋轉、滾輪或雙指縮放、Shift＋拖曳平移</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="hy-empty">這台裝置不支援 3D，改用下方清單。內容與 3D 相同。</div>
          <StatusBar onGo={choose} info={info} data={data} panel={panel} setPanel={setPanel} />
          {panel && <InfoPanel kind={panel} info={info} onClose={() => setPanel(null)} />}
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
