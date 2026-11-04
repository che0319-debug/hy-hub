import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MARQUEE_INTERVAL_MS, advanceMarquee, buildMarqueeItems, marqueeCaption } from './marquee.js'

export default function ProjectMarquee({ projects }) {
  const items = useMemo(() => buildMarqueeItems(projects), [projects])
  const [held, setHeld] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(i => advanceMarquee(i, items.length, true))
  }, [items.length])

  useEffect(() => {
    if (held || items.length < 2) return undefined
    const timer = setInterval(() => setIndex(i => advanceMarquee(i, items.length, false)), MARQUEE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [held, items.length])

  if (!items.length) return null

  const shown = advanceMarquee(index, items.length, true)
  const item = items[shown] || items[0]
  const caption = marqueeCaption(item)

  return (
    <>
      <span className="li-sep" aria-hidden="true">｜</span>
      <div
        className="li-marquee"
        data-paused={held ? '1' : undefined}
        data-index={shown}
        aria-label="Bot Office 專案進度"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setHeld(false) }}
      >
        <Link className="li-marquee-item" to={item.href} title={caption}>{caption}</Link>
      </div>
    </>
  )
}
