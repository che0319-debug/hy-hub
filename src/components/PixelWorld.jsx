import { useRef, useEffect } from 'react'

// ── World constants ───────────────────────────────────────────
const WORLD_W   = 640   // world width in world-pixels
const WORLD_H   = 480   // world height in world-pixels
const DRAW_SCALE = 2    // sprite source-pixel → world-pixel
const INIT_SCALE = 1.0  // initial canvas zoom (whole world visible)
const SCALE_MIN  = 0.5
const SCALE_MAX  = 3.0

// ── Sprite sheet coords: [srcX, srcY, srcW, srcH] ─────────────
// Source: public/pixel/interiors.png (200×200, Pixel 16 Interiors v2 free / zedpxl)
// Coordinates are HY's visual estimates; ±1–2px correction applied if edges were off.
const SPR = {
  floor_wood:    [ 96,  48, 72, 24],
  counter:       [ 96,  72, 72, 24],
  rug_oval_tan:  [160,  64, 40, 24],
  rug_oval_grey: [160,  96, 40, 24],
  rug_rect:      [128,  80, 56, 24],
  rug_green:     [136, 104, 56, 40],
  bed_green:     [ 16, 104, 40, 48],
  bed_blue:      [ 16, 136, 40, 48],
  desk_long:     [ 56, 108, 56, 24],
  stool:         [ 80, 104, 16, 16],
  nightstand:    [ 96, 116, 24, 24],
  sofa:          [128, 136, 72, 32],
  plant:         [ 48, 144, 16, 32],
  character:     [ 66, 140, 22, 20],  // H14 hotfix: reboxed to remove red-item bleed on right
  chair:         [136, 152, 16, 24],
}

// ── Zone layout ───────────────────────────────────────────────
// H14 hotfix: floor colors deepened slightly (no more floor_wood tile — no seamless tile in this sheet)
const ZONES = [
  { x:   0, y:   0, w: 320, h: 240, label: 'HY',     tint: '#e8dfc8' },
  { x: 320, y:   0, w: 320, h: 240, label: '950157', tint: '#ccdde8' },
  { x:   0, y: 240, w: 320, h: 240, label: '小因',   tint: '#cce8d4' },
  { x: 320, y: 240, w: 320, h: 240, label: 'Sam',    tint: '#e8d8c4' },
]

// Items per zone: [spriteKey, zoneOffsetX, zoneOffsetY]
// H14: rugs moved to top of each list so they render under furniture
const ZONE_ITEMS = {
  HY: [
    ['rug_rect',   55, 100],
    ['desk_long',  50,  76],
    ['chair',     170,  96],
    ['plant',      16,  52],
    ['character', 195, 128],
  ],
  '950157': [
    ['rug_oval_grey', 150, 90],
    ['counter',    20,  32],
    ['desk_long',  50,  90],
    ['stool',     160,  76],
    ['chair',     180, 106],
    ['character', 228, 128],
  ],
  '小因': [
    ['rug_oval_tan', 78, 144],
    ['bed_blue',   16,  26],
    ['sofa',       46, 148],
    ['plant',     268,  26],
    ['character', 172, 128],
  ],
  Sam: [
    ['rug_green',  28, 108],
    ['desk_long',  48,  48],
    ['chair',     170,  68],
    ['chair',      54, 118],
    ['chair',     210, 118],
    ['character', 224, 156],
  ],
}

// ── Draw helpers ──────────────────────────────────────────────
function drawSpr(ctx, img, key, wx, wy) {
  const [sx, sy, sw, sh] = SPR[key]
  ctx.drawImage(img, sx, sy, sw, sh, wx, wy, sw * DRAW_SCALE, sh * DRAW_SCALE)
}

function drawZoneFloor(ctx, _img, zone) {
  // H14 hotfix: plain solid fill — interiors.png has no seamless floor tile
  ctx.fillStyle = zone.tint
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
}

function drawZone(ctx, img, zone) {
  drawZoneFloor(ctx, img, zone)

  const items = ZONE_ITEMS[zone.label] || []
  items.forEach(([key, ox, oy]) => {
    drawSpr(ctx, img, key, zone.x + ox, zone.y + oy)
  })

  // zone label (above the zone, inside top margin)
  ctx.save()
  ctx.font = `bold ${7 * DRAW_SCALE}px monospace`
  ctx.fillStyle = '#3d2a14'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(zone.label, zone.x + zone.w / 2, zone.y + 5)
  ctx.restore()
}

function drawWorld(ctx, img) {
  // walkway/border background
  ctx.fillStyle = '#b8a882'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)

  ZONES.forEach(zone => drawZone(ctx, img, zone))

  // zone dividers
  ctx.save()
  ctx.strokeStyle = '#9a8462'
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath(); ctx.moveTo(320, 0); ctx.lineTo(320, WORLD_H); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, 240); ctx.lineTo(WORLD_W, 240); ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

// ── Component ─────────────────────────────────────────────────
export default function PixelWorld() {
  const canvasRef = useRef(null)
  const imgRef    = useRef(null)
  const trRef     = useRef({ ox: 0, oy: 0, scale: INIT_SCALE })
  const dragRef   = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1

    function render() {
      if (!imgRef.current) return
      const ctx = canvas.getContext('2d')
      const { ox, oy, scale } = trRef.current
      ctx.imageSmoothingEnabled = false
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(
        scale * dpr, 0,
        0, scale * dpr,
        Math.round(ox * dpr),
        Math.round(oy * dpr),
      )
      drawWorld(ctx, imgRef.current)
    }

    function resize() {
      const parent = canvas.parentElement
      if (!parent) return
      const cssW = parent.clientWidth
      const cssH = parent.clientHeight
      canvas.width  = cssW * dpr
      canvas.height = cssH * dpr
      canvas.style.width  = cssW + 'px'
      canvas.style.height = cssH + 'px'
      const tr = trRef.current
      tr.ox = (cssW - WORLD_W * tr.scale) / 2
      tr.oy = (cssH - WORLD_H * tr.scale) / 2
      render()
    }

    // load spritesheet
    const img = new Image()
    img.src = './pixel/interiors.png'
    img.onload = () => { imgRef.current = img; resize() }
    img.onerror = () => {
      // draw placeholder if image missing
      const ctx = canvas.getContext('2d')
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = '#f0e8d8'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#9a8060'
      ctx.font = '14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('等待 interiors.png 素材…', canvas.width / 2, canvas.height / 2)
    }

    // wheel zoom – anchor to mouse position
    const onWheel = e => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const mx   = e.clientX - rect.left
      const my   = e.clientY - rect.top
      const tr   = trRef.current
      const f    = e.deltaY < 0 ? 1.12 : 1 / 1.12
      const ns   = Math.min(SCALE_MAX, Math.max(SCALE_MIN, tr.scale * f))
      tr.ox    = mx - (mx - tr.ox) * (ns / tr.scale)
      tr.oy    = my - (my - tr.oy) * (ns / tr.scale)
      tr.scale = ns
      render()
    }

    // drag pan
    const onMouseDown = e => {
      const tr = trRef.current
      dragRef.current = { sx: e.clientX, sy: e.clientY, ox: tr.ox, oy: tr.oy }
      canvas.style.cursor = 'grabbing'
    }
    const onMouseMove = e => {
      if (!dragRef.current) return
      const d = dragRef.current
      trRef.current.ox = d.ox + (e.clientX - d.sx)
      trRef.current.oy = d.oy + (e.clientY - d.sy)
      render()
    }
    const onMouseUp = () => {
      dragRef.current = null
      canvas.style.cursor = 'grab'
    }

    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', cursor: 'grab', imageRendering: 'pixelated' }}
    />
  )
}
