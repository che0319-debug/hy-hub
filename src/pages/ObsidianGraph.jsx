import { useEffect, useMemo, useRef, useState } from 'react'
import {
  GRAPH_TYPES, INDEX_CARD_ID, LABEL_ALL_WHEN_AT_MOST, LIFE_DIMENSIONS, UNLABELED_DIMENSION,
  applyCandidateVisibility, applyIndexVisibility, buildGraph, displayRadius, filterByDimensions, filterGraph, fitTransform,
  localGraph, majorLabelIds, primaryClusterId, shortTitle, simulateLayout, typeLabel,
} from '../lib/obsidianGraph'

const GLOWS = [
  ['ob-g-career', '#3ddcff'],
  ['ob-g-money', '#ffe14a'],
  ['ob-g-health', '#5dffb0'],
  ['ob-g-family', '#ff5fa2'],
  ['ob-g-work', '#7c9bff'],
  ['ob-g-play', '#d07bff'],
  ['ob-g-grow', '#ff9a3c'],
  ['ob-g-none', '#e6ecfa'],
]

const CLUSTER_GRADIENT = {
  事業: 'ob-g-career',
  財務: 'ob-g-money',
  健康: 'ob-g-health',
  家庭: 'ob-g-family',
  本業: 'ob-g-work',
  休閒: 'ob-g-play',
  成長: 'ob-g-grow',
  未標七維: 'ob-g-none',
}

const TYPE_GRADIENT = {
  person: 'ob-g-career',
  event: 'ob-g-money',
  know: 'ob-g-work',
  dec: 'ob-g-family',
  map: 'ob-g-play',
  pref: 'ob-g-health',
  asset: 'ob-g-grow',
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function glowId(node, colorBy) {
  if (colorBy === 'type') return TYPE_GRADIENT[node.type] || 'ob-g-none'
  return CLUSTER_GRADIENT[primaryClusterId(node)] || 'ob-g-none'
}

function paddedRadii(radii, labeled) {
  const extra = labeled ? 32 : 12
  return new Map([...radii].map(([id, radius]) => [id, radius + extra]))
}

function useTapMode() {
  const [tap, setTap] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px), (pointer: coarse)')
    const update = () => setTap(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return tap
}

export default function ObsidianGraph({ cards, selectedId, scope, onOpen, onScope, children }) {
  const tapMode = useTapMode()
  const full = useMemo(() => buildGraph(cards), [cards])
  const present = useMemo(() => {
    const seen = new Set(full.nodes.map(node => node.type))
    const extras = [...seen].filter(id => !GRAPH_TYPES.some(item => item.id === id)).sort()
    return [
      ...GRAPH_TYPES.filter(item => seen.has(item.id)),
      ...extras.map(id => ({ id, label: typeLabel(id) })),
    ]
  }, [full])
  const [hidden, setHidden] = useState(() => new Set())
  const [hiddenDims, setHiddenDims] = useState(() => new Set())
  const [showIndex, setShowIndex] = useState(false)
  const [showCandidates, setShowCandidates] = useState(false)
  const [colorBy, setColorBy] = useState('dimension')
  const typeKey = present.map(item => item.id).filter(id => !hidden.has(id)).join('|')
  const dimensionOptions = useMemo(
    () => [...LIFE_DIMENSIONS, { id: UNLABELED_DIMENSION, label: UNLABELED_DIMENSION }],
    [],
  )
  const dimKey = dimensionOptions.map(item => item.id).filter(id => !hiddenDims.has(id)).join('|')
  const candidates = useMemo(
    () => applyCandidateVisibility(full, {
      showCandidates,
      centerId: scope === 'local' ? selectedId : '',
    }),
    [full, showCandidates, scope, selectedId],
  )
  const indexed = useMemo(
    () => applyIndexVisibility(candidates, {
      showIndex,
      centerId: scope === 'local' && selectedId === INDEX_CARD_ID ? selectedId : '',
    }),
    [candidates, showIndex, scope, selectedId],
  )
  const filtered = useMemo(
    () => filterByDimensions(
      filterGraph(indexed, typeKey ? typeKey.split('|') : []),
      dimKey ? dimKey.split('|') : [],
    ),
    [indexed, typeKey, dimKey],
  )
  const viewGraph = useMemo(
    () => (scope === 'local' && selectedId ? localGraph(filtered, selectedId) : filtered),
    [filtered, scope, selectedId],
  )
  const layout = useMemo(() => simulateLayout(viewGraph.nodes, viewGraph.edges, {
    centerId: viewGraph.nodes.find(node => node.center)?.id || '',
  }), [viewGraph])
  const radii = useMemo(() => {
    const max = Math.max(1, ...viewGraph.nodes.map(node => node.degree || 0))
    return new Map(viewGraph.nodes.map(node => [node.id, displayRadius(node.degree, max, node.center, node.candidate)]))
  }, [viewGraph])
  const labeledIds = useMemo(() => new Set(majorLabelIds(viewGraph.nodes)), [viewGraph])
  const stageRef = useRef(null)
  const svgRef = useRef(null)
  const modelRef = useRef(null)
  const gesture = useRef({ moved: false, handled: false })
  const pointers = useRef(new Map())
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [model, setModel] = useState(null)
  const [hoverId, setHoverId] = useState('')
  const [peekId, setPeekId] = useState('')

  useEffect(() => {
    const element = stageRef.current
    if (!element) return undefined
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect
      if (!rect) return
      setSize({ width: Math.round(rect.width), height: Math.round(rect.height) })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!size.width || !size.height) return
    const fitRadii = paddedRadii(radii, labeledIds.size > 0)
    setModel({ positions: layout, view: fitTransform(layout, fitRadii, size.width, size.height, 28) })
    setHoverId('')
    setPeekId('')
  }, [layout, radii, size.width, size.height, labeledIds.size])

  useEffect(() => { modelRef.current = model }, [model])

  useEffect(() => {
    const element = svgRef.current
    if (!element) return undefined
    const onWheel = event => {
      event.preventDefault()
      const current = modelRef.current
      if (!current) return
      const rect = element.getBoundingClientRect()
      const mx = event.clientX - rect.left
      const my = event.clientY - rect.top
      const factor = event.deltaY < 0 ? 1.08 : 0.92
      const k = clamp(current.view.k * factor, 0.25, 3.5)
      const ratio = k / current.view.k
      const next = { ...current, view: { k, x: mx - (mx - current.view.x) * ratio, y: my - (my - current.view.y) * ratio } }
      modelRef.current = next
      setModel(next)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  const counts = useMemo(() => {
    const map = new Map()
    for (const node of indexed.nodes) map.set(node.type, (map.get(node.type) || 0) + 1)
    return map
  }, [indexed])
  const dimCounts = useMemo(() => {
    const map = new Map()
    for (const node of indexed.nodes) {
      for (const dim of node.dimensions || []) map.set(dim, (map.get(dim) || 0) + 1)
    }
    return map
  }, [indexed])
  const positions = useMemo(() => new Map((model?.positions || []).map(point => [point.id, point])), [model])
  const hover = viewGraph.nodes.find(node => node.id === (tapMode ? peekId : hoverId))
  const peek = viewGraph.nodes.find(node => node.id === peekId)
  const labelMax = viewGraph.nodes.length <= LABEL_ALL_WHEN_AT_MOST ? 12 : 8
  const candidateCount = viewGraph.nodes.filter(node => node.candidate).length

  function toggleType(id) {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleDimension(id) {
    setHiddenDims(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function zoomBy(factor) {
    const current = modelRef.current
    if (!current || !size.width) return
    const mx = size.width / 2
    const my = size.height / 2
    const k = clamp(current.view.k * factor, 0.25, 3.5)
    const ratio = k / current.view.k
    const next = { ...current, view: { k, x: mx - (mx - current.view.x) * ratio, y: my - (my - current.view.y) * ratio } }
    modelRef.current = next
    setModel(next)
  }

  function resetView() {
    if (!size.width || !size.height) return
    const fitRadii = paddedRadii(radii, labeledIds.size > 0)
    const next = { positions: layout, view: fitTransform(layout, fitRadii, size.width, size.height, 28) }
    modelRef.current = next
    setModel(next)
  }

  function activate(id) {
    if (!id) { setPeekId(''); return }
    if (tapMode) {
      // 點下去時焦點會先把標題亮起來，不能把同一次點擊當成第二次。
      if (gesture.current.peekAtStart === id) { setPeekId(''); onOpen(id) }
      else setPeekId(id)
      return
    }
    onOpen(id)
  }

  function onPointerDown(event) {
    if (event.button != null && event.button !== 0) return
    const nodeId = event.target.closest?.('[data-node]')?.getAttribute('data-node') || ''
    if (pointers.current.size === 0) gesture.current = { moved: false, handled: false, pinchDist: 0, peekAtStart: peekId }
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      originX: event.clientX,
      originY: event.clientY,
      nodeId,
    })
    svgRef.current?.setPointerCapture?.(event.pointerId)
  }

  function onPointerMove(event) {
    const point = pointers.current.get(event.pointerId)
    const current = modelRef.current
    if (!point || !current) return
    if (Math.hypot(event.clientX - point.originX, event.clientY - point.originY) > 5) gesture.current.moved = true
    const dx = event.clientX - point.x
    const dy = event.clientY - point.y
    point.x = event.clientX
    point.y = event.clientY
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()]
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const mx = (pts[0].x + pts[1].x) / 2 - rect.left
      const my = (pts[0].y + pts[1].y) / 2 - rect.top
      if (!gesture.current.pinchDist) {
        gesture.current.pinchDist = dist
        gesture.current.pinchView = current.view
        return
      }
      const k = clamp(gesture.current.pinchView.k * (dist / gesture.current.pinchDist), 0.25, 3.5)
      const ratio = k / gesture.current.pinchView.k
      const base = gesture.current.pinchView
      const next = { ...current, view: { k, x: mx - (mx - base.x) * ratio, y: my - (my - base.y) * ratio } }
      modelRef.current = next
      setModel(next)
      return
    }
    gesture.current.pinchDist = 0
    if (!gesture.current.moved || pointers.current.size !== 1) return
    if (point.nodeId) {
      const k = current.view.k || 1
      const next = {
        ...current,
        positions: current.positions.map(item => item.id === point.nodeId ? { ...item, x: item.x + dx / k, y: item.y + dy / k } : item),
      }
      modelRef.current = next
      setModel(next)
      return
    }
    const next = { ...current, view: { ...current.view, x: current.view.x + dx, y: current.view.y + dy } }
    modelRef.current = next
    setModel(next)
  }

  function onPointerUp(event) {
    const point = pointers.current.get(event.pointerId)
    pointers.current.delete(event.pointerId)
    if (pointers.current.size < 2) gesture.current.pinchDist = 0
    if (!point || gesture.current.handled) return
    if (gesture.current.moved) return
    gesture.current.handled = true
    activate(point.nodeId)
  }

  function screenOf(point, radius) {
    if (!model) return null
    return {
      x: model.view.x + point.x * model.view.k,
      y: model.view.y + point.y * model.view.k - radius * model.view.k,
    }
  }

  const hoverPoint = hover ? positions.get(hover.id) : null
  const hoverRadius = hover ? (radii.get(hover.id) || 8) : 0
  const tip = !tapMode && hoverPoint ? screenOf(hoverPoint, hoverRadius) : null
  const brokenNote = full.broken
    ? ` · 斷鏈 ${full.broken} 條已略過${full.brokenIds?.length ? `（${full.brokenIds.join('、')}）` : ''}`
    : ''
  const summary = scope === 'local'
    ? `局部圖 ${viewGraph.nodes.length} 張 · ${viewGraph.edges.length} 條連線`
    : `全圖 ${viewGraph.nodes.length} 張 · ${viewGraph.edges.length} 條連線`
  const empty = scope === 'local' && selectedId
    ? '這張卡的類型或七維被隱藏了，或是它不在目錄裡。勾選條件後會再畫出來。'
    : '勾選至少一種類型與一個七維，關係圖才會畫出來。'

  return (
    <div className="hy-stack">
      <div className="ob-toolbar">
        <fieldset className="ob-filters">
          <legend>顯示類型</legend>
          <div className="ob-filter-row">
            {present.map(item => (
              <label key={item.id}>
                <input type="checkbox" checked={!hidden.has(item.id)} onChange={() => toggleType(item.id)} />
                <i className="ob-dot" data-type={item.id} aria-hidden="true" />
                <span>{item.label}</span>
                <span className="ob-id">{counts.get(item.id) || 0}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="ob-filters">
          <legend>七維</legend>
          <div className="ob-filter-row">
            {dimensionOptions.map(item => (
              <label key={item.id}>
                <input type="checkbox" checked={!hiddenDims.has(item.id)} onChange={() => toggleDimension(item.id)} />
                <i className="ob-dim-dot" data-dim={item.id} aria-hidden="true" />
                <span>{item.label}</span>
                <span className="ob-id">{dimCounts.get(item.id) || 0}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="ob-folders ob-wrap" role="group" aria-label="圖的範圍">
          <button type="button" aria-current={scope !== 'local' ? 'true' : undefined} onClick={() => onScope('all')}>全圖</button>
          <button type="button" aria-current={scope === 'local' ? 'true' : undefined} disabled={!selectedId} onClick={() => onScope('local')}>這張卡的鄰居</button>
          <button type="button" aria-pressed={showIndex} onClick={() => setShowIndex(current => !current)}>顯示總索引</button>
          <button type="button" aria-pressed={showCandidates} onClick={() => setShowCandidates(current => !current)}>顯示待上架</button>
        </div>
        <div className="ob-folders ob-wrap" role="group" aria-label="著色方式">
          <button type="button" aria-pressed={colorBy === 'dimension'} onClick={() => setColorBy('dimension')}>依七維著色</button>
          <button type="button" aria-pressed={colorBy === 'type'} onClick={() => setColorBy('type')}>依類型著色</button>
          <span className="ob-legend-note"><i className="ob-dash-sample" aria-hidden="true" />待上架標記</span>
        </div>
        <div className="ob-folders ob-wrap" role="group" aria-label="縮放">
          <button type="button" onClick={() => zoomBy(1.2)}>放大</button>
          <button type="button" onClick={() => zoomBy(1 / 1.2)}>縮小</button>
          <button type="button" onClick={resetView}>重設</button>
        </div>
      </div>
      <p className="hy-note ob-note-break">
        {summary}
        {showCandidates ? ' · 已顯示待上架' : ' · 待上架已隱藏'}
        {brokenNote}
        {tapMode ? '。主要節點看得到標題；次要節點點一下看出全名，再點或按打開。拖節點可移動。' : '。主要節點看得到標題；滑過次要節點看出全名，點節點打開卡片。拖節點可移動，拖空白處可平移，滾輪可縮放。'}
      </p>
      <div className={children ? 'ob-graph-layout' : 'hy-stack'}>
        <div className="hy-stack ob-graph-main">
          <div
            className="ob-graph-stage hy-card is-focus"
            ref={stageRef}
            data-ready={model ? 'true' : 'false'}
            data-nodes={viewGraph.nodes.length}
            data-edges={viewGraph.edges.length}
            data-scope={scope === 'local' ? 'local' : 'all'}
            data-index={showIndex || (scope === 'local' && selectedId === INDEX_CARD_ID) ? 'on' : 'off'}
            data-candidates={showCandidates ? 'on' : 'off'}
            data-color={colorBy}
            data-labels={labeledIds.size}
            data-candidate={candidateCount}
          >
            <svg
              ref={svgRef}
              className="ob-graph-svg"
              data-color={colorBy}
              width={size.width || undefined}
              height={size.height || undefined}
              role="group"
              aria-label={summary}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {model && (
                <g transform={`translate(${model.view.x} ${model.view.y}) scale(${model.view.k})`}>
                  <defs>
                    {GLOWS.map(([id, color]) => (
                      <radialGradient key={id} id={id} cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.95" />
                        <stop offset="10%" stopColor={color} stopOpacity="0.72" />
                        <stop offset="28%" stopColor={color} stopOpacity="0.22" />
                        <stop offset="58%" stopColor={color} stopOpacity="0.06" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                      </radialGradient>
                    ))}
                  </defs>
                  {viewGraph.edges.map(edge => {
                    const a = positions.get(edge.source)
                    const b = positions.get(edge.target)
                    if (!a || !b) return null
                    return <line key={`${edge.source}-${edge.target}`} className="ob-edge" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  })}
                  {[...viewGraph.nodes].sort((a, b) => Number(a.candidate) - Number(b.candidate) || a.id.localeCompare(b.id)).map(node => {
                    const point = positions.get(node.id)
                    if (!point) return null
                    const radius = radii.get(node.id) || 8
                    const glow = Math.max(18, radius * 1.65)
                    const spark = Math.max(2.2, radius * 0.2)
                    const core = Math.max(1.15, radius * 0.09)
                    return (
                      <g
                        key={node.id}
                        className="ob-node-g"
                        transform={`translate(${point.x} ${point.y})`}
                        data-node={node.id}
                        data-type={node.type || 'other'}
                        data-cluster={primaryClusterId(node)}
                        data-candidate={node.candidate ? 'true' : 'false'}
                        data-center={node.center ? 'true' : 'false'}
                        data-labeled={labeledIds.has(node.id) ? 'true' : 'false'}
                        tabIndex={0}
                        role="button"
                        aria-label={`${node.title}，${typeLabel(node.type)}${node.candidate ? '，待上架' : ''}`}
                        onPointerEnter={() => { if (!tapMode) setHoverId(node.id) }}
                        onPointerLeave={() => setHoverId(current => (current === node.id ? '' : current))}
                        onFocus={() => { setHoverId(node.id); if (tapMode) setPeekId(node.id) }}
                        onBlur={() => setHoverId(current => (current === node.id ? '' : current))}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(node.id) }
                        }}
                      >
                        <circle className="ob-hit" r={Math.max(radius + 8, 24)} />
                        <circle className="ob-aura" r={glow} fill={`url(#${glowId(node, colorBy)})`} />
                        <circle className="ob-spark" r={spark} />
                        <circle className="ob-core" r={core} />
                        {node.center && <circle className="ob-center-ring" r={spark + 7} />}
                        {node.candidate && <circle className="ob-candidate-ring" r={glow * 0.46} />}
                        {node.candidate && (
                          <g className="ob-candidate-badge" transform={`translate(${glow * 0.34} ${-glow * 0.3})`}>
                            <circle className="ob-candidate-badge-bg" r="9" />
                            <text className="ob-candidate-tag" textAnchor="middle" dominantBaseline="central">待</text>
                          </g>
                        )}
                        {labeledIds.has(node.id) && (
                          <text className="ob-label" y={spark + 13} textAnchor="middle" stroke="#080c16" strokeWidth="3" paintOrder="stroke">
                            {shortTitle(node.title, labelMax)}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              )}
            </svg>
            {tip && hover && (
              <div className="ob-tip" style={{ left: clamp(tip.x, 12, Math.max(12, size.width - 12)), top: clamp(tip.y, 28, Math.max(28, size.height - 8)) }}>
                {hover.title}
              </div>
            )}
            {!viewGraph.nodes.length && <div className="ob-graph-empty">{empty}</div>}
          </div>
          {tapMode && peek && (
            <div className="ob-peek">
              <span className="ob-peek-title">{peek.title}</span>
              <button type="button" className="hy-btn is-primary" onClick={() => { setPeekId(''); onOpen(peek.id) }}>打開這張卡</button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}
