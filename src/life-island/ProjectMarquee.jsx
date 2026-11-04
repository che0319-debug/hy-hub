import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { buildMarqueeItems } from './marquee.js'

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduce(!!mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])
  return reduce
}

export default function ProjectMarquee({ projects }) {
  const items = useMemo(() => buildMarqueeItems(projects), [projects])
  const reduce = useReducedMotion()
  const [held, setHeld] = useState(false)
  const [touchPaused, setTouchPaused] = useState(false)
  const [index, setIndex] = useState(0)
  const paused = held || touchPaused

  useEffect(() => { setIndex(i => (items.length ? i % items.length : 0)) }, [items.length])

  useEffect(() => {
    if (!reduce || paused || items.length < 2) return undefined
    const timer = setInterval(() => setIndex(i => (i + 1) % items.length), 4000)
    return () => clearInterval(timer)
  }, [reduce, paused, items.length])

  if (!items.length) return null

  const pauseProps = {
    onMouseEnter: () => setHeld(true),
    onMouseLeave: () => setHeld(false),
    onFocus: () => setHeld(true),
    onBlur: event => { if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false) },
    onPointerUp: event => { if (event.pointerType === 'touch') setTouchPaused(v => !v) },
  }

  if (reduce) {
    const item = items[index] || items[0]
    return (
      <div className="li-marquee" data-mode="static" data-paused={paused ? '1' : undefined} aria-label="Bot Office 專案進度" {...pauseProps}>
        <Link key={item.id + ':' + index} className="li-marquee-item" to={item.href}>{item.line}</Link>
      </div>
    )
  }

  const seconds = Math.max(18, items.length * 8)
  return (
    <div className={'li-marquee' + (paused ? ' is-paused' : '')} data-mode="scroll" data-paused={paused ? '1' : undefined} aria-label="Bot Office 專案進度" {...pauseProps}>
      <div className="li-marquee-track" style={{ animationDuration: seconds + 's' }}>
        <div className="li-marquee-group">
          {items.map((item, i) => <Link key={(item.id || 'p') + i} className="li-marquee-item" to={item.href}>{item.line}</Link>)}
        </div>
        <div className="li-marquee-group" aria-hidden="true">
          {items.map((item, i) => <Link key={'c' + (item.id || 'p') + i} className="li-marquee-item" tabIndex={-1} to={item.href}>{item.line}</Link>)}
        </div>
      </div>
    </div>
  )
}
