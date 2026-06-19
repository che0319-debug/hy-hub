import { useRef, useEffect } from 'react'

const WORLD_W = 640
const WORLD_H = 480
const DRAW_SCALE = 2
const SCALE_MIN = 0.5
const SCALE_MAX = 3.0
const HEALTH_GREEN_MAX_H = 36
const IDLE_DAYS = 3
const MAX_DOC_STACK = 5
const DONE_RECENT_H = 24
const SLIDE_MS = 2500

const HY_W = 192
const ROOMS_H = 221
const CORR_H = 43
const ROOM_W = Math.floor((WORLD_W - HY_W) / 3)
const ROOM_W3 = WORLD_W - HY_W - ROOM_W * 2
const OPEN_Y = ROOMS_H + CORR_H

const SPR = {
  rug_oval_tan:  [160,  64, 40, 24],
  rug_oval_grey: [160,  96, 40, 24],
  rug_rect:      [128,  80, 56, 24],
  rug_green:     [136, 104, 56, 40],
  bed_blue:      [ 16, 136, 40, 48],
  desk_long:     [ 56, 108, 56, 24],
  stool:         [ 80, 104, 16, 16],
  sofa:          [128, 136, 72, 32],
  plant:         [ 48, 144, 16, 32],
  character:     [ 66, 140, 22, 20],
  chair:         [136, 152, 16, 24],
}

const CHAR_W = SPR.character[2] * DRAW_SCALE
const CHAR_H = SPR.character[3] * DRAW_SCALE

const ZONES = [
  { id: 'hy_work',    x: 0,                y: 0,         w: HY_W,           h: WORLD_H / 2,          label: 'HY',      tint: '#e8dfc8' },
  { id: 'hy_meeting', x: 0,                y: WORLD_H/2, w: HY_W,           h: WORLD_H / 2,          label: '',        tint: '#ddd8c0' },
  { id: '950157',     x: HY_W,             y: 0,         w: ROOM_W,         h: ROOMS_H,              label: '950157',  tint: '#ccdde8' },
  { id: '小因',       x: HY_W + ROOM_W,    y: 0,         w: ROOM_W,         h: ROOMS_H,              label: '小因',    tint: '#cce8d4' },
  { id: 'Sam',        x: HY_W + ROOM_W * 2,y: 0,         w: ROOM_W3,        h: ROOMS_H,              label: 'Sam',     tint: '#e8d8c4' },
  { id: 'corridor',   x: HY_W,             y: ROOMS_H,   w: WORLD_W - HY_W, h: CORR_H,               label: '',        tint: '#c8b890' },
  { id: 'open',       x: HY_W,             y: OPEN_Y,    w: WORLD_W - HY_W, h: WORLD_H - OPEN_Y,     label: '開放休閒區', tint: '#d4c8a8' },
]

const ZONE_ITEMS = {
  hy_work:    [['rug_rect', 20, 100], ['desk_long', 12, 70], ['chair', 120, 90], ['plant', 6, 40]],
  hy_meeting: [['desk_long', 40, 100]],
  '950157':   [['rug_oval_grey', 34, 80], ['desk_long', 14, 60], ['chair', 112, 80], ['plant', 6, 20]],
  '小因':     [['bed_blue', 8, 18], ['plant', 108, 18], ['rug_oval_tan', 34, 110], ['desk_long', 14, 150]],
  Sam:        [['rug_green', 16, 100], ['desk_long', 16, 46], ['chair', 108, 66], ['sofa', 2, 140]],
  corridor:   [],
  open:       [['sofa', 10, 30], ['rug_oval_tan', 60, 80], ['plant', 330, 30], ['plant', 380, 80]],
}

const HOME_POS = {
  HY:      { x: 130,                        y: 160 },
  '950157':{ x: HY_W + 80,                  y: 150 },
  '小因':  { x: HY_W + ROOM_W + 80,         y: 150 },
  Sam:     { x: HY_W + ROOM_W * 2 + 70,     y: 150 },
}

const OPEN_POS = {
  '950157': { x: HY_W + 60,  y: OPEN_Y + 100 },
  '小因':   { x: HY_W + 170, y: OPEN_Y + 100 },
  Sam:      { x: HY_W + 280, y: OPEN_Y + 100 },
}

const HEALTH_KEY = { HY: 'hy', '950157': '950157', '小因': 'family', Sam: 'sam' }
const BOTS = ['HY', '950157', '小因', 'Sam']

function computeHealth(botName, healthData) {
  if (!healthData?.bots) return 'grey'
  const bot = healthData.bots[HEALTH_KEY[botName]]
  if (!bot?.daily_last) return 'grey'
  const h = (Date.now() - new Date(bot.daily_last).getTime()) / 3_600_000
  return h <= HEALTH_GREEN_MAX_H ? 'green' : 'red'
}

function computeIdle(botName, sessions) {
  if (botName === 'HY') return false
  const mine = sessions.filter(s => s.assignee === botName)
  if (!mine.length) return true
  const lastMs = Math.max(...mine.map(s => new Date(s.createdAt).getTime()))
  return (Date.now() - lastMs) / 86_400_000 > IDLE_DAYS
}

function computePending(botName, sessions) {
  return Math.min(sessions.filter(s => s.assignee === botName && s.status === 'pending').length, MAX_DOC_STACK)
}

function computeDoneFresh(botName, sessions) {
  const cutoff = Date.now() - DONE_RECENT_H * 3_600_000
  return sessions.some(s => s.assignee === botName && s.status === 'done' && new Date(s.createdAt).getTime() > cutoff)
}

function computeFailed(botName, sessions) {
  return sessions.some(s => s.assignee === botName && s.status === 'failed')
}

function drawSpr(ctx, img, key, wx, wy) {
  const [sx, sy, sw, sh] = SPR[key]
  ctx.drawImage(img, sx, sy, sw, sh, wx, wy, sw * DRAW_SCALE, sh * DRAW_SCALE)
}

function drawZone(ctx, img, zone) {
  ctx.fillStyle = zone.tint
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
  for (const [key, ox, oy] of (ZONE_ITEMS[zone.id] || [])) {
    drawSpr(ctx, img, key, zone.x + ox, zone.y + oy)
  }
  if (zone.label) {
    ctx.save()
    ctx.font = `bold ${7 * DRAW_SCALE}px monospace`
    ctx.fillStyle = '#3d2a14'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + 5)
    ctx.restore()
  }
}

function drawChar(ctx, img, x, y, health, failed) {
  ctx.save()
  if (health === 'grey') ctx.globalAlpha = 0.4
  drawSpr(ctx, img, 'character', x, y)
  ctx.globalAlpha = 1
  ctx.beginPath()
  ctx.arc(x + CHAR_W - 4, y - 8, 5, 0, Math.PI * 2)
  ctx.fillStyle = health === 'green' ? '#22c55e' : health === 'red' ? '#ef4444' : '#94a3b8'
  ctx.fill()
  if (failed) {
    ctx.font = `bold ${7 * DRAW_SCALE}px monospace`
    ctx.fillStyle = '#f59e0b'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('?', x + CHAR_W / 2, y - 10)
  }
  ctx.restore()
}

function drawDocs(ctx, docX, docY, count, fresh) {
  if (!count && !fresh) return
  const W = 14, H = 10, STEP = 4
  ctx.save()
  for (let i = 0; i < count; i++) {
    const dy = docY - i * STEP
    ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#d97706'; ctx.lineWidth = 1
    ctx.fillRect(docX, dy, W, H); ctx.strokeRect(docX, dy, W, H)
  }
  if (fresh) {
    const dy = docY - count * STEP - 4
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6
    ctx.fillStyle = '#fde68a'; ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 1.5
    ctx.fillRect(docX, dy, W + 2, H + 2); ctx.strokeRect(docX, dy, W + 2, H + 2)
  }
  ctx.restore()
}

export default function PixelWorld({ healthData, sessions = [], onBotClick, onDocClick }) {
  const canvasRef    = useRef(null)
  const imgRef       = useRef(null)
  const trRef        = useRef({ ox: 0, oy: 0, scale: 1 })
  const dragRef      = useRef(null)
  const wasDragRef   = useRef(false)
  const rafRef       = useRef(null)
  const isFirstRef   = useRef(true)
  const actionsRef   = useRef({ render: null, startAnim: null })
  const charsRef     = useRef(
    Object.fromEntries(BOTS.map(b => {
      const p = HOME_POS[b]
      return [b, { x: p.x, y: p.y, targetX: p.x, targetY: p.y, startX: p.x, startY: p.y, startTime: 0 }]
    }))
  )
  const botStatesRef = useRef({})

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1

    function render() {
      const img = imgRef.current
      if (!canvas || !img) return
      const ctx = canvas.getContext('2d')
      const { ox, oy, scale } = trRef.current
      ctx.imageSmoothingEnabled = false
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, Math.round(ox * dpr), Math.round(oy * dpr))

      ctx.fillStyle = '#b8a882'
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)

      for (const z of ZONES) drawZone(ctx, img, z)

      const mtg = ZONES.find(z => z.id === 'hy_meeting')
      ctx.save()
      ctx.font = `${5 * DRAW_SCALE}px monospace`
      ctx.fillStyle = '#7a6a4a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText('協作時啟用', mtg.x + mtg.w / 2, mtg.y + mtg.h / 2 + 40)
      ctx.restore()

      ctx.save()
      ctx.strokeStyle = '#9a8462'; ctx.lineWidth = 2; ctx.setLineDash([6, 4])
      for (const [x1, y1, x2, y2] of [
        [HY_W, 0, HY_W, WORLD_H],
        [0, WORLD_H / 2, HY_W, WORLD_H / 2],
        [HY_W + ROOM_W, 0, HY_W + ROOM_W, ROOMS_H],
        [HY_W + ROOM_W * 2, 0, HY_W + ROOM_W * 2, ROOMS_H],
        [HY_W, OPEN_Y, WORLD_W, OPEN_Y],
      ]) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke() }
      ctx.setLineDash([]); ctx.restore()

      const states = botStatesRef.current
      for (const b of BOTS) {
        const c = charsRef.current[b]
        const s = states[b] || {}
        const hp = HOME_POS[b]
        drawDocs(ctx, hp.x - 10, hp.y - 24, s.pendingCount || 0, s.doneFresh || false)
        drawChar(ctx, img, c.x, c.y, s.health || 'grey', s.failed || false)
      }
    }

    function tick(ts) {
      let moving = false
      for (const c of Object.values(charsRef.current)) {
        if (c.x === c.targetX && c.y === c.targetY) continue
        const t = Math.min((ts - c.startTime) / SLIDE_MS, 1)
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
        c.x = c.startX + (c.targetX - c.startX) * ease
        c.y = c.startY + (c.targetY - c.startY) * ease
        if (t < 1) moving = true
        else { c.x = c.targetX; c.y = c.targetY }
      }
      render()
      rafRef.current = (moving && !document.hidden) ? requestAnimationFrame(tick) : null
    }

    function startAnim() {
      if (!rafRef.current) rafRef.current = requestAnimationFrame(tick)
    }

    actionsRef.current = { render, startAnim }

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      const cssW = parent.clientWidth
      const cssH = parent.clientHeight
      canvas.width = cssW * dpr; canvas.height = cssH * dpr
      canvas.style.width = cssW + 'px'; canvas.style.height = cssH + 'px'
      const scale = Math.min(cssW / WORLD_W, cssH / WORLD_H)
      trRef.current = { scale, ox: (cssW - WORLD_W * scale) / 2, oy: (cssH - WORLD_H * scale) / 2 }
      render()
    }

    const img = new Image()
    img.src = './pixel/interiors.png'
    img.onload = () => { imgRef.current = img; resize() }
    img.onerror = () => {
      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#f0e8d8'; ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#9a8060'; ctx.font = '14px monospace'; ctx.textAlign = 'center'
      ctx.fillText('等待 interiors.png…', canvas.width / 2, canvas.height / 2)
    }

    const onWheel = e => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const tr = trRef.current
      const f = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const ns = Math.min(SCALE_MAX, Math.max(SCALE_MIN, tr.scale * f))
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      trRef.current = { scale: ns, ox: mx - (mx - tr.ox) * (ns / tr.scale), oy: my - (my - tr.oy) * (ns / tr.scale) }
      render()
    }

    const onMouseDown = e => {
      wasDragRef.current = false
      const tr = trRef.current
      dragRef.current = { sx: e.clientX, sy: e.clientY, ox: tr.ox, oy: tr.oy }
      canvas.style.cursor = 'grabbing'
    }
    const onMouseMove = e => {
      if (!dragRef.current) return
      const d = dragRef.current
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) wasDragRef.current = true
      trRef.current.ox = d.ox + (e.clientX - d.sx)
      trRef.current.oy = d.oy + (e.clientY - d.sy)
      render()
    }
    const onMouseUp = () => { dragRef.current = null; canvas.style.cursor = 'grab' }

    const onClick = e => {
      if (wasDragRef.current) return
      const rect = canvas.getBoundingClientRect()
      const { ox, oy, scale } = trRef.current
      const wx = (e.clientX - rect.left - ox) / scale
      const wy = (e.clientY - rect.top - oy) / scale
      for (const b of BOTS) {
        const c = charsRef.current[b]
        if (wx >= c.x && wx <= c.x + CHAR_W && wy >= c.y && wy <= c.y + CHAR_H) {
          onBotClick?.(b); return
        }
      }
      for (const b of BOTS) {
        const s = botStatesRef.current[b] || {}
        if (!s.pendingCount && !s.doneFresh) continue
        const hp = HOME_POS[b]
        if (wx >= hp.x - 14 && wx <= hp.x + 14 && wy >= hp.y - 54 && wy <= hp.y) {
          onDocClick?.(); return
        }
      }
    }

    const onVisChange = () => {
      if (!document.hidden) {
        const needsAnim = Object.values(charsRef.current).some(c => c.x !== c.targetX || c.y !== c.targetY)
        if (needsAnim) startAnim()
      }
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('click', onClick)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    document.addEventListener('visibilitychange', onVisChange)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('click', onClick)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('visibilitychange', onVisChange)
      ro.disconnect()
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!healthData && sessions.length === 0) return

    const states = {}
    for (const b of BOTS) {
      states[b] = {
        health:       computeHealth(b, healthData),
        pendingCount: computePending(b, sessions),
        doneFresh:    computeDoneFresh(b, sessions),
        failed:       computeFailed(b, sessions),
      }
    }
    botStatesRef.current = states

    let needsAnim = false
    const now = performance.now()
    for (const b of BOTS) {
      const idle = computeIdle(b, sessions)
      const goOpen = idle && states[b].health !== 'red' && OPEN_POS[b]
      const target = goOpen ? OPEN_POS[b] : HOME_POS[b]
      const c = charsRef.current[b]
      if (isFirstRef.current) {
        c.x = c.startX = c.targetX = target.x
        c.y = c.startY = c.targetY = target.y
        c.startTime = now
      } else if (c.targetX !== target.x || c.targetY !== target.y) {
        c.startX = c.x; c.startY = c.y
        c.targetX = target.x; c.targetY = target.y
        c.startTime = now
        needsAnim = true
      }
    }

    if (isFirstRef.current) {
      isFirstRef.current = false
      actionsRef.current.render?.()
    } else if (needsAnim) {
      actionsRef.current.startAnim?.()
    } else {
      actionsRef.current.render?.()
    }
  }, [healthData, sessions]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor: 'grab', imageRendering: 'pixelated' }}
    />
  )
}
