import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { digestPlan, splitSections, docStats } from '../lib/planDigest.mjs'
import { laneLabel } from '../lib/lanes'

const Empty = ({ children }) => <p className="ao-empty">{children}</p>
const Bullets = ({ items, empty = '待補' }) => items.length
  ? <ul className="ao-bullets">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
  : <p className="ao-muted">{empty}</p>

// 摘要：HY 先在這裡看懂「做什麼、分幾步、驗收什麼、有什麼風險」，再決定要不要讀全文。
export function PlanSummary({ plan, project, onOpenDocument }) {
  const d = digestPlan(plan)
  if (!d) return <Empty>正式規劃尚未提供。PI 交出規劃後，摘要會顯示在這裡。</Empty>
  const draft = project.plan_state !== 'APPROVED'
  return <div className="ao-plan-summary">
    <section className={`ao-card${draft ? ' is-focus' : ''}`} aria-label="規劃摘要">
      <div className="ao-card-head"><h2>規劃摘要</h2><span className="hy-pill" data-s={draft ? 'you' : 'done'}>{draft ? '草稿・待你核准' : '已核准'} v{project.plan_revision}</span></div>
      <dl className="ao-stats">
        <div><dt>里程碑</dt><dd>{d.stats.milestones}</dd></div>
        <div><dt>工作包</dt><dd>{d.stats.packages}</dd></div>
        <div><dt>風險</dt><dd>{d.stats.risks}</dd></div>
        <div><dt>缺資料</dt><dd data-warn={d.stats.missing > 0 || undefined}>{d.stats.missing}</dd></div>
      </dl>
      <h3>目標</h3>
      <p>{d.goal || '待補'}</p>
      <h3>範圍</h3>
      <Bullets items={d.scope} />
    </section>

    <section className="ao-card" aria-label="里程碑與驗收">
      <h2>里程碑與驗收</h2>
      {d.milestones.map(m => <details key={m.id || m.name} className="ao-ms">
        <summary>
          <span className="ao-ms-id">{m.id}</span>
          <span className="ao-ms-name"><b>{m.name}</b>{m.isMajor && <span className="hy-pill" data-s="wait">重大節點</span>}<small>{m.goal || '目標待補'}</small></span>
          <span className="ao-ms-count">{m.packages.length} 工作包</span>
        </summary>
        <div className="ao-ms-body">
          <h3>交付成果</h3><Bullets items={m.deliverables} />
          <h3>驗收條件</h3><Bullets items={m.acceptance} />
          {m.dependencies.length > 0 && <p className="ao-muted">前置里程碑：{m.dependencies.join('、')}</p>}
          <h3>工作包</h3>
          {m.packages.length ? <div className="ao-table-wrap"><table className="ao-table"><thead><tr><th>任務</th><th>誰做</th><th>前置</th></tr></thead>
            <tbody>{m.packages.map(p => <tr key={p.key || p.task}><td>{p.task}</td><td>{laneLabel(p.executor)}</td><td>{p.dependencies.length ? p.dependencies.join('、') : '—'}</td></tr>)}</tbody></table></div>
            : <p className="ao-muted">待補</p>}
        </div>
      </details>)}
      {!d.milestones.length && <Empty>規劃尚未提供里程碑。小型專案不強制固定里程碑數量。</Empty>}
    </section>

    <div className="ao-plan-two">
      <section className="ao-card" aria-label="風險"><h2>風險</h2><Bullets items={d.risks} empty="規劃未列風險" /></section>
      <section className={`ao-card${d.missing.length ? ' needs-you' : ''}`} aria-label="缺少的資料"><h2>缺少的資料</h2>
        <Bullets items={d.missing} empty="沒有缺資料" />
        {d.required.length > 0 && <><h3>必要資料</h3><Bullets items={d.required} /></>}
      </section>
    </div>

    {d.closure && <section className="ao-card" aria-label="結案條件"><h2>結案條件</h2><p>{d.closure.task || '待補'}</p><Bullets items={d.closure.acceptance} /></section>}
    <div><button className="ao-primary" onClick={onOpenDocument}>看完整規劃文件</button></div>
  </div>
}

// 完整文件：依 ## 切成章節，預設只展開第一章，其他收合；目錄按鈕直接跳到該章。
export function PlanDocument({ project, plan, focus }) {
  const [which, setWhich] = useState('project')
  const markdown = (which === 'project' ? plan?.project_plan_markdown : plan?.ai_execution_plan_markdown) || ''
  const sections = splitSections(markdown), stats = docStats(markdown)
  const [open, setOpen] = useState({})
  const refs = useRef({})
  const reset = () => setOpen({ [sections[0]?.index ?? 0]: true })
  useEffect(reset, [which, markdown])
  const jump = index => {
    setOpen(o => ({ ...o, [index]: true }))
    requestAnimationFrame(() => refs.current[index]?.scrollIntoView({ block: 'start', behavior: 'smooth' }))
  }
  useEffect(() => {
    if (!focus) return
    const hit = sections.find(s => s.title.includes(focus))
    if (hit) jump(hit.index)
  }, [focus, markdown])
  const allOpen = sections.length > 0 && sections.every(s => open[s.index])
  return <section className="ao-card ao-document-pane" aria-label="正式規劃文件">
    <div className="ao-toolbar" role="group" aria-label="選擇文件">{[['project', '專案規劃書'], ['ai', 'AI 執行規劃書']].map(([key, label]) =>
      <button key={key} aria-pressed={which === key} onClick={() => setWhich(key)}>{label}</button>)}</div>
    <p className="ao-muted">正式規劃 v{project.plan_revision}・{project.plan_state === 'APPROVED' ? '已核准' : '草稿，尚未正式核准'}・{stats.chars.toLocaleString('zh-TW')} 字・{stats.sections} 節</p>
    {sections.length > 1 && <div className="ao-toc" role="navigation" aria-label="章節目錄">
      {sections.map(s => <button key={s.index} onClick={() => jump(s.index)}>{s.title}</button>)}
      <button className="ao-toc-all" onClick={() => setOpen(allOpen ? {} : Object.fromEntries(sections.map(s => [s.index, true])))}>{allOpen ? '全部收合' : '全部展開'}</button>
    </div>}
    <div className="ao-sections">{sections.map(s => <details key={s.index} ref={el => { refs.current[s.index] = el }} open={!!open[s.index]}
      onToggle={e => { const next = e.currentTarget.open; setOpen(o => o[s.index] === next ? o : { ...o, [s.index]: next }) }}>
      <summary><b>{s.title}</b><small>{s.chars.toLocaleString('zh-TW')} 字</small></summary>
      <div className="ao-document"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>{s.body}</ReactMarkdown></div>
    </details>)}</div>
    {!sections.length && <Empty>正式文件尚未提供。</Empty>}
  </section>
}

// 資料空間（後端單檔上限）。70% 以上才出現；舊版後端沒有這個端點就什麼都不顯示。
