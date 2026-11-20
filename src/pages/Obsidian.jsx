// HY Obsidian：列出目錄、打開卡片、看關係圖。待上架勾選只寫這台裝置。
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { authHeaders } from '../auth'
import {
  FOLDERS, applyDecision, cardTitle, decisionFor, fetchBrainCard, fetchBrainIndex,
  filterCards, folderLabel, folderOf, isPending, linkifyWikilinks, loadQueue,
  parseFrontmatter, queueMarkdown, saveQueue, sortedDecisions, splitPendingReview, wikiIdFromHref,
} from '../lib/obsidian'
import ObsidianGraph from './ObsidianGraph'
import '../../public/hy-ui/hy-ui.css'
import './obsidian.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const FIELD_LABEL = {
  id: '編號', type: '類型', aliases: '代稱', tags: '標籤', date: '日期', as_of: '資料日期',
  confidence: '可信度', written_by: '作者', people: '相關人物', related: '相關卡片',
  period: '年代', path: '位置', state: '狀態', sources: '來源', '個資檢查': '個資檢查',
}
const FIELD_ORDER = ['id', 'type', 'aliases', 'tags', 'date', 'as_of', 'confidence', 'written_by', 'people', 'related', 'period', 'path', 'state', 'sources', '個資檢查']
const btn = { minHeight: 44 }

function nearestScroller(node) {
  let cur = node.parentElement
  while (cur) {
    const style = window.getComputedStyle(cur)
    if (/(auto|scroll)/.test(style.overflowY) && cur.scrollHeight > cur.clientHeight + 1) return cur
    cur = cur.parentElement
  }
  return null
}

function decisionLabel(decision) {
  if (decision === 'approve') return '已勾核准'
  if (decision === 'reject') return '已勾退回'
  return ''
}

function FieldValue({ name, value, titles, onOpen }) {
  const items = Array.isArray(value) ? value : [value]
  return items.map((item, index) => {
    const text = item == null ? '' : String(item)
    const wiki = text.match(/^\[\[([A-Za-z0-9_-]+)\]\]$/)
    const id = wiki ? wiki[1] : ''
    const label = id ? (titles.get(id) || id) : text
    return (
      <span key={`${name}-${index}`}>
        {index > 0 ? '、' : ''}
        {id ? <a href={`#card-${id}`} onClick={event => { event.preventDefault(); onOpen(id) }}>{label}</a> : label}
      </span>
    )
  })
}

function CardReader({ card, markdown, error, loading, titles, onOpen, queue, onDecide, featured = true, onShowLocal }) {
  const pending = isPending(card)
  const decision = decisionFor(queue, card?.id)
  const parsed = parseFrontmatter(markdown || '')
  const fields = { ...(parsed.data || {}) }
  if (card?.path) fields.path = card.path
  if (card?.state) fields.state = card.state === 'candidate' ? '候選' : card.state === 'current' ? '正式' : card.state === 'archived' ? '已歸檔' : card.state
  const keys = [...FIELD_ORDER.filter(key => fields[key] != null && fields[key] !== ''), ...Object.keys(fields).filter(key => key !== 'title' && !FIELD_ORDER.includes(key))]
  const body = linkifyWikilinks(parsed.data ? parsed.body : (markdown || ''), titles)
  return (
    <article className={featured ? 'hy-card is-focus' : 'hy-card'}>
      <div className="hy-summary">
        <span className="hy-pill" data-s={pending ? 'you' : 'wait'}>{pending ? '待上架' : folderLabel(folderOf(card))}</span>
        {decision && <span className="hy-pill" data-s={decision.decision === 'approve' ? 'done' : 'wait'}>{decisionLabel(decision.decision)}</span>}
        {card?.confidence && <span className="hy-pill" data-s="ai">{card.confidence}</span>}
      </div>
      <h2 className="hy-card-title" style={{ marginTop: 8 }}>{cardTitle(card)}</h2>
      {onShowLocal && (
        <div className="ob-actions">
          <button type="button" className="hy-btn" style={btn} onClick={onShowLocal}>看局部圖</button>
        </div>
      )}
      {loading && <p className="hy-lede">讀取正文…</p>}
      {error && <p className="hy-alert is-bad" role="alert">{error}</p>}
      {keys.length > 0 && (
        <dl className="hy-kv">
          {keys.map(key => (
            <span key={key} style={{ display: 'contents' }}>
              <dt>{FIELD_LABEL[key] || key}</dt>
              <dd><FieldValue name={key} value={fields[key]} titles={titles} onOpen={onOpen} /></dd>
            </span>
          ))}
        </dl>
      )}
      {body.trim() && (
        <div className="ob-md" style={{ marginTop: 16 }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            skipHtml
            components={{
              a: ({ href, children }) => {
                const id = wikiIdFromHref(href)
                if (id) return <a href={`#card-${id}`} onClick={event => { event.preventDefault(); onOpen(id) }}>{children}</a>
                if (typeof href === 'string' && /^https?:\/\//i.test(href)) return <a href={href} rel="noreferrer">{children}</a>
                return <span>{children}</span>
              },
            }}
          >{body}</ReactMarkdown>
        </div>
      )}
      {pending && (
        <div className="ob-actions">
          <button type="button" className="hy-btn is-primary" style={btn} onClick={() => onDecide(card, 'approve')}>核准</button>
          <button type="button" className="hy-btn" style={btn} onClick={() => onDecide(card, 'reject')}>退回</button>
          {decision && <button type="button" className="hy-btn" style={btn} onClick={() => onDecide(card, 'clear')}>取消勾選</button>}
        </div>
      )}
      {pending && <p className="hy-note" style={{ marginTop: 8 }}>這只記下你的決定。正式分類還沒改，要等 Atlas 搬檔。</p>}
    </article>
  )
}

function QueuePanel({ queue, onCopy, copied, copyText }) {
  const items = sortedDecisions(queue)
  return (
    <section className="hy-card needs-you is-focus">
      <div className="hy-card-head">
        <h2 className="hy-card-title">待處理清單</h2>
        <span className="hy-pill" data-s={items.length ? 'you' : 'wait'}>{items.length ? `${items.length} 筆決定` : '尚未勾選'}</span>
      </div>
      <p className="hy-lede" style={{ marginTop: 8 }}>核准或退回只記在這台裝置，不會改正式分類，也不會寫進雲端硬碟。</p>
      {!items.length && <p className="hy-empty" style={{ marginTop: 12 }}>還沒有決定。打開下面的卡，勾核准或退回。</p>}
      {items.length > 0 && (
        <ul className="hy-list">
          {items.map(item => (
            <li key={item.id}><span>{item.decision === 'approve' ? '核准' : '退回'} · {item.title}</span><span className="ob-id">{item.id}</span></li>
          ))}
        </ul>
      )}
      <div className="ob-actions">
        <button type="button" className="hy-btn" style={btn} onClick={onCopy}>複製清單</button>
        {copied && <span className="hy-pill" data-s="done">已複製</span>}
        <p className="hy-lede ob-queue-hint">審完請按『複製清單』，把內容貼給 Atlas，Atlas 才會搬卡。</p>
      </div>
      {copyText && <textarea className="ob-copy" readOnly value={copyText} aria-label="待處理清單原文" />}
    </section>
  )
}

export default function Obsidian() {
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'graph' ? 'graph' : (params.get('tab') === 'pending' ? 'pending' : 'cards')
  const scope = params.get('scope') === 'local' ? 'local' : 'all'
  const selectedId = params.get('card') || ''
  const [cards, setCards] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [folder, setFolder] = useState('')
  const [query, setQuery] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [cardError, setCardError] = useState('')
  const [cardLoading, setCardLoading] = useState(false)
  const [queue, setQueue] = useState(() => loadQueue(window.localStorage))
  const [copied, setCopied] = useState(false)
  const [copyText, setCopyText] = useState('')
  const [showReviewed, setShowReviewed] = useState(false)
  const [listPick, setListPick] = useState(0)
  const scrollPending = useRef(false)
  const [loadedId, setLoadedId] = useState('')
  const readerRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    setLoadError('')
    fetchBrainIndex({ base: API_BASE, headers: authHeaders(), signal: controller.signal })
      .then(setCards)
      .catch(error => {
        if (error.name === 'AbortError') return
        setCards([])
        setLoadError(error.message || '讀取失敗，請稍後再試。')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!selectedId) { setMarkdown(''); setCardError(''); setCardLoading(false); return }
    const controller = new AbortController()
    setCardLoading(true)
    setCardError('')
    setMarkdown('')
    fetchBrainCard(selectedId, { base: API_BASE, headers: authHeaders(), signal: controller.signal })
      .then(result => { setMarkdown(result.markdown); setLoadedId(selectedId); setCardLoading(false) })
      .catch(error => {
        if (error.name === 'AbortError') return
        setCardLoading(false)
        setLoadedId(selectedId)
        setCardError(error.message || '讀取失敗，請稍後再試。')
      })
    return () => controller.abort()
  }, [selectedId])

  const titles = useMemo(() => new Map((cards || []).map(card => [card.id, cardTitle(card)])), [cards])
  const pendingCards = useMemo(() => (cards || []).filter(isPending), [cards])
  const shown = useMemo(() => filterCards(cards || [], {
    folder: view === 'pending' ? '00_待上架' : folder,
    query,
  }), [cards, view, folder, query])
  const reviewSplit = useMemo(
    () => (view === 'pending' ? splitPendingReview(shown, queue) : null),
    [view, shown, queue],
  )
  const visibleCards = reviewSplit && !showReviewed ? reviewSplit.open : shown
  const selected = (cards || []).find(card => card.id === selectedId) || (selectedId ? { id: selectedId, title: titles.get(selectedId) || selectedId, path: '' } : null)

  // 手機單欄：點列表的卡後把內容捲進視窗。卡片內容是非同步載入的，
  // 載入前面板很矮、捲動會被夾住，所以點擊時捲一次，載入完成後再補捲一次。
  useEffect(() => {
    if (!listPick) return
    scrollPending.current = true
  }, [listPick])

  useEffect(() => {
    if (!scrollPending.current || !readerRef.current) return
    if (!window.matchMedia('(max-width: 640px)').matches) { scrollPending.current = false; return }
    const node = readerRef.current
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    node.scrollIntoView({ behavior, block: 'start' })
    // 手機殼把捲動放在 app-main，scrollIntoView 會捲到外層、畫面不動。
    const scroller = nearestScroller(node)
    if (scroller) {
      const top = scroller.scrollTop + node.getBoundingClientRect().top - scroller.getBoundingClientRect().top - 8
      scroller.scrollTo({ top: Math.max(0, top), behavior })
    }
    if (!cardLoading && loadedId === selectedId) scrollPending.current = false
  }, [listPick, selectedId, cardLoading, loadedId, markdown, cardError])

  function setRoute({ next = view, card = '', graphScope = 'all' }) {
    const queryParams = {}
    if (next === 'graph') queryParams.view = 'graph'
    if (next === 'pending') queryParams.tab = 'pending'
    if (card) queryParams.card = card
    if (next === 'graph' && graphScope === 'local' && card) queryParams.scope = 'local'
    setParams(queryParams, { replace: true })
  }

  function openView(next) {
    setRoute({ next, card: selectedId, graphScope: next === 'graph' && scope === 'local' ? 'local' : 'all' })
  }

  function openCard(id) {
    setRoute({ card: id, graphScope: scope })
  }

  function openListedCard(id) {
    setListPick(count => count + 1)
    openCard(id)
  }

  function showLocal(id) {
    setRoute({ next: 'graph', card: id, graphScope: 'local' })
  }

  function decide(card, decision) {
    const next = applyDecision(queue, { id: card.id, title: cardTitle(card), decision, now: new Date().toISOString() })
    setQueue(next)
    saveQueue(window.localStorage, next)
    setCopied(false)
  }

  async function copyQueue() {
    const text = queueMarkdown(queue)
    try {
      await navigator.clipboard.writeText(text)
      setCopyText('')
      setCopied(true)
    } catch {
      setCopyText(text)
      setCopied(false)
    }
  }

  const counts = new Map(FOLDERS.map(([id]) => [id, (cards || []).filter(card => folderOf(card) === id).length]))

  const reader = selected ? (
    <CardReader
      card={selected}
      markdown={markdown}
      error={cardError}
      loading={cardLoading}
      titles={titles}
      onOpen={openCard}
      queue={queue}
      onDecide={decide}
      featured={view !== 'graph'}
      onShowLocal={view === 'graph' && scope === 'local' ? undefined : () => showLocal(selected.id)}
    />
  ) : null

  return (
    <div className="hy hy-stack ob-page">
      <div className="hy-pagehead">
        <div>
          <h1 className="hy-title">HY Obsidian</h1>
          <p className="hy-lede">看卡片與關係圖。待上架可以勾核准或退回，正式分類仍由 Atlas 搬。</p>
        </div>
        {cards && <span className="hy-pill" data-s={pendingCards.length ? 'you' : 'done'}>{pendingCards.length ? `${pendingCards.length} 張待上架` : '沒有待上架'}</span>}
      </div>
      <nav className="hy-tabs" role="tablist" aria-label="HY Obsidian" style={{ padding: 0 }}>
        <button type="button" role="tab" className="hy-tab" aria-current={view === 'cards' ? 'page' : undefined} onClick={() => openView('cards')}>卡片</button>
        <button type="button" role="tab" className="hy-tab" aria-current={view === 'graph' ? 'page' : undefined} onClick={() => openView('graph')}>關係圖</button>
        <button type="button" role="tab" className="hy-tab" aria-current={view === 'pending' ? 'page' : undefined} onClick={() => openView('pending')}>待上架{pendingCards.length ? ` ${pendingCards.length}` : ''}</button>
      </nav>

      {cards === null && <p className="hy-lede">讀取目錄…</p>}
      {loadError && <div className="hy-alert is-bad" role="alert">{loadError}</div>}
      {cards && !cards.length && !loadError && <div className="hy-empty">目錄裡還沒有卡片。鏡像完成後，這裡會列出待上架的卡。</div>}

      {view === 'pending' && cards && <QueuePanel queue={queue} onCopy={copyQueue} copied={copied} copyText={copyText} />}

      {view === 'graph' && cards && cards.length > 0 && (
        <ObsidianGraph
          cards={cards}
          selectedId={selectedId}
          scope={scope === 'local' && selectedId ? 'local' : 'all'}
          onOpen={openCard}
          onScope={next => setRoute({ next: 'graph', card: selectedId, graphScope: next })}
        >
          {reader}
        </ObsidianGraph>
      )}

      {view !== 'graph' && cards && cards.length > 0 && (
        <div className="ob-split">
          <div className="hy-stack">
            <input className="ob-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="搜尋標題或代稱" aria-label="搜尋標題或代稱" />
            {view === 'cards' && (
              <div className="ob-folders" role="tablist" aria-label="分類">
                <button type="button" aria-current={folder === '' ? 'true' : undefined} onClick={() => setFolder('')}>全部 {cards.length}</button>
                {FOLDERS.map(([id, label]) => (
                  <button key={id} type="button" aria-current={folder === id ? 'true' : undefined} onClick={() => setFolder(id)}>{label} {counts.get(id) || 0}</button>
                ))}
              </div>
            )}
            {view === 'pending' && reviewSplit.reviewedCount > 0 && (
              <button
                type="button"
                className="hy-btn"
                style={{ ...btn, alignSelf: 'flex-start' }}
                aria-pressed={showReviewed}
                onClick={() => setShowReviewed(value => !value)}
              >
                {showReviewed ? `收起已審（${reviewSplit.reviewedCount}）` : `顯示已審（${reviewSplit.reviewedCount}）`}
              </button>
            )}
            {!visibleCards.length && (
              <div className="hy-empty">
                {view === 'pending'
                  ? (shown.length > 0 && reviewSplit.open.length === 0 ? '待上架的卡都審完了。' : '目前沒有待上架的卡。')
                  : '這個條件底下沒有卡。'}
              </div>
            )}
            <ul className="ob-list">
              {visibleCards.map(card => {
                const decision = decisionFor(queue, card.id)
                return (
                  <li key={card.id}>
                    <button type="button" aria-current={card.id === selectedId ? 'true' : undefined} onClick={() => openListedCard(card.id)}>
                      <span style={{ display: 'block', fontWeight: 700 }}>{cardTitle(card)}</span>
                      <span className="ob-id">{folderLabel(folderOf(card))} · {card.id}{decision ? ` · ${decisionLabel(decision.decision)}` : ''}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <div className="ob-reader" ref={readerRef}>
            <div className="hy-stack ob-reader-body">
              {!selected && <div className="hy-empty">從左邊選一張卡，就可以看標題、屬性與正文。</div>}
              {reader}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
