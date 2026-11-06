import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { safeUrl } from '../lib/aiOffice.mjs'
import { verdictLabel } from '../lib/officeFlow.mjs'
import { splitSections } from '../lib/planDigest.mjs'
import { safeMarkdown } from '../lib/officeDocuments.mjs'

function taipei(value) {
  const time = Date.parse(value)
  if (!Number.isFinite(time)) return ''
  return new Date(time).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false })
}

function toneOf(verdict) {
  const key = String(verdict || '').toLowerCase()
  if (key === 'pass') return 'done'
  if (key === 'fail') return 'bad'
  if (key === 'conditional_pass') return 'you'
  return 'wait'
}

function shortId(value) {
  const id = typeof value === 'string' ? value : ''
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

function MarkdownBody({ markdown }) {
  const source = safeMarkdown(markdown)
  const sections = splitSections(source).filter(section => section.body)
  const [open, setOpen] = useState(() => {
    const total = sections.reduce((sum, section) => sum + section.chars, 0)
    if (total > 0 && total < 2500) return Object.fromEntries(sections.map(section => [section.index, true]))
    return { [sections[0]?.index ?? 0]: true }
  })
  if (!source.trim() || !sections.length) return <p className="ao-muted">這份文件沒有內文。</p>
  if (sections.length <= 1 && sections[0]?.title === '前言') {
    return <div className="ao-document"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{source}</ReactMarkdown></div>
  }
  const allOpen = sections.every(section => open[section.index])
  return <div className="ao-sections">
    {sections.length > 1 && <div className="ao-toc" role="navigation" aria-label="章節目錄">
      {sections.map(section => <button key={section.index} type="button" onClick={() => setOpen(current => ({ ...current, [section.index]: true }))}>{section.title}</button>)}
      <button type="button" className="ao-toc-all" onClick={() => setOpen(allOpen ? {} : Object.fromEntries(sections.map(section => [section.index, true])))}>{allOpen ? '全部收合' : '全部展開'}</button>
    </div>}
    {sections.map(section => <details key={section.index} open={!!open[section.index]} onToggle={event => {
      const next = event.currentTarget.open
      setOpen(current => current[section.index] === next ? current : { ...current, [section.index]: next })
    }}>
      <summary><b>{section.title}</b><small>{section.chars.toLocaleString('zh-TW')} 字</small></summary>
      <div className="ao-document"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{section.body}</ReactMarkdown></div>
    </details>)}
  </div>
}

function Snapshot({ table, open }) {
  if (!table?.length) return null
  return <details className="ao-ms" open={open}>
    <summary>提交時寫入的里程碑表</summary>
    <div className="ao-ms-body">{table.map(row => <p key={`${row.id}-${row.name}`}><b>{[row.id, row.name].filter(Boolean).join(' ')}</b>{row.due ? ` · ${row.due}` : ''}{row.depends?.length ? ` · 前置 ${row.depends.join('、')}` : ''}<br />{row.output}</p>)}</div>
  </details>
}

function DriveLink({ url }) {
  const href = safeUrl(url)
  if (!href) return null
  return <p><a href={href} target="_blank" rel="noopener noreferrer">在 Drive 開啟</a></p>
}

function DocCard({ doc, body, focus = false }) {
  if (!doc) return null
  const ready = body?.status === 'ready'
  const failed = body?.status === 'error'
  return <section className={`ao-card${focus ? ' is-focus' : ''}`} aria-label={doc.title}>
    <div className="ao-card-head">
      <h2>{doc.title}</h2>
      {doc.latest && <span className="hy-pill" data-s="done">最新</span>}
    </div>
    <p className="ao-muted">{[doc.submittedAt ? `提交 ${taipei(doc.submittedAt)}` : '', doc.fileId ? `文件 ${shortId(doc.fileId)}` : ''].filter(Boolean).join(' · ') || '文件參照待補'}</p>
    {doc.missingReason && <p role="status">{doc.missingReason}</p>}
    {doc.fetch && !body && <p className="ao-muted" role="status">正在讀取{doc.title}…</p>}
    {body?.status === 'loading' && <p className="ao-muted" role="status">正在讀取{doc.title}…</p>}
    {failed && <p role="alert">{body.error}</p>}
    {ready && body.truncated && <p className="ao-muted">文件超過上限，以下為截斷內容。</p>}
    {ready && <MarkdownBody markdown={body.markdown} />}
    <Snapshot table={doc.table} open={!ready} />
    <DriveLink url={doc.url} />
  </section>
}

function ReviewCard({ review, body, focus = false }) {
  if (!review) return <section className="ao-card" aria-label="對應審查"><h2>對應審查</h2><p>這個版本還沒有對上的審查報告。</p></section>
  const verdict = review.verdictText || verdictLabel(review.verdict) || review.verdict
  return <section className={`ao-card${focus ? ' is-focus' : ''}`} aria-label={review.title}>
    <div className="ao-card-head">
      <h2>{review.title}</h2>
      <span>
        {review.current && <span className="hy-pill" data-s="you">目前</span>}
        {verdict && <span className="hy-pill" data-s={toneOf(review.verdict)}>{verdict}</span>}
      </span>
    </div>
    <p className="ao-muted">{[review.name, review.at ? taipei(review.at) : '', review.fileId ? `文件 ${shortId(review.fileId)}` : ''].filter(Boolean).join(' · ')}</p>
    {review.mustFix?.length > 0 && <><h3>必改</h3><ul className="ao-bullets">{review.mustFix.map(item => <li key={item}>{item}</li>)}</ul></>}
    {review.fetch && (!body || body.status === 'loading') && <p className="ao-muted" role="status">正在讀取{review.title}…</p>}
    {body?.status === 'error' && <p role="alert">{body.error}</p>}
    {body?.status === 'ready' && body.truncated && <p className="ao-muted">文件超過上限，以下為截斷內容。</p>}
    {body?.status === 'ready' && <MarkdownBody markdown={body.markdown} />}
    <DriveLink url={review.url} />
  </section>
}

export default function OfficialDocuments({ view, bodies = {}, onSelect, mode = 'plan' }) {
  if (!view?.hasPlanning && !view?.review && !view?.outputs?.length) return null
  const bodyFor = doc => (doc?.readKey ? bodies[doc.readKey] : null)
  return <div className="ao-doc-stack">
    {view.options?.length > 0 && <div className="ao-version">
      <label>版本
        <select aria-label="文件版本" value={view.key || ''} onChange={event => onSelect?.(event.target.value)}>
          {view.options.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </label>
    </div>}
    {view.milestoneId && <p className="ao-muted" role="status">這一節是里程碑 {view.milestoneId} 的交付與對應審查。</p>}
    {view.sameFileNote && <p className="ao-muted" role="status">{view.sameFileNote}</p>}
    {view.plan && <DocCard doc={view.plan} body={bodyFor(view.plan)} focus={mode === 'plan'} />}
    {view.outputs?.map((output, index) => <DocCard key={output.key} doc={output} body={bodyFor(output)} focus={mode === 'plan' && !view.plan && index === 0} />)}
    {view.execution && <DocCard doc={view.execution} body={bodyFor(view.execution)} />}
    {view.executionNote && <p className="ao-muted" role="status">{view.executionNote}</p>}
    {view.executionGap && <p role="status">{view.executionGap}</p>}
    {mode === 'review' && <ReviewCard review={view.review} body={bodyFor(view.review)} focus />}
    {mode === 'review' && view.history?.length > 0 && <section className="ao-card" aria-label="其他版本的審查">
      <h2>其他版本的審查</h2>
      <ul className="ao-bullets">{view.history.map(item => {
        const specific = view.options.find(entry => entry.key === `review:${item.fileId}` || entry.key === `review:${item.key}`)
        const option = specific || view.options.find(entry => entry.key === (item.milestoneId ? `milestone:${item.milestoneId}` : (item.version != null ? `plan:${item.version}` : '')))
        const verdict = item.verdictText || verdictLabel(item.verdict) || item.verdict
        return <li key={item.key}>{option ? <button type="button" onClick={() => onSelect?.(option.key)}>{item.title}{verdict ? ` · ${verdict}` : ''}</button> : <span>{item.title}{verdict ? ` · ${verdict}` : ''}</span>}</li>
      })}</ul>
    </section>}
  </div>
}
