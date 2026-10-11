import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { wl, MOCK } from '../workLabApi'
import {
  TASK_COLUMNS, groupTasks, progress, taskPill, taskLabel, projectPill, healthPill, evidencePill,
  feedbackPill, decisionTitle, isOverdue, shortTime, ratingPayload, filterLogs, nextRunText, inboxCount,
} from '../lib/workLab.mjs'
import './work-lab.css'

// ── 共用 ─────────────────────────────────────────────────────────────────────
const Pill = ({ s, children }) => <span className="hy-pill" data-s={s}>{children}</span>

function Md({ text }) {
  return <div className="wl-md"><ReactMarkdown remarkPlugins={[remarkGfm]}>{text || ''}</ReactMarkdown></div>
}

function useAction(onDone) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const run = useCallback(async fn => {
    setBusy(true); setError('')
    try { await fn(); await onDone?.() } catch (e) { setError(e.message || String(e)) } finally { setBusy(false) }
  }, [onDone])
  return { busy, error, run, setError }
}

function ErrorLine({ error }) {
  return error ? <p className="hy-alert is-bad" role="alert">{error}</p> : null
}

function Loading() {
  return <div className="hy-empty" aria-busy="true">讀取中…</div>
}

// ── 頁首 ─────────────────────────────────────────────────────────────────────
function Header({ lastRun, onRefresh, onNew }) {
  return (
    <header className="hy-header wl-header">
      <span className="hy-badge">Work Lab</span>
      <span className="hy-header-sub">PI 負責制專案團隊{MOCK ? '｜示意資料' : ''}</span>
      <div className="hy-header-actions">
        <span className="hy-sync">{nextRunText(lastRun)}</span>
        <button className="hy-hbtn" onClick={onRefresh}>重新整理</button>
        <button className="hy-hbtn is-primary" onClick={onNew}>＋新增專案</button>
      </div>
    </header>
  )
}

// ── 新增專案 ─────────────────────────────────────────────────────────────────
function NewProject({ onClose, onCreated }) {
  const [f, setF] = useState({ name: '', goal: '', scope: '', acceptance: '', deadline: '', constraints: '' })
  const { busy, error, run } = useAction()
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }))
  const lines = s => s.split('\n').map(x => x.trim()).filter(Boolean)
  function submit(e) {
    e.preventDefault()
    run(async () => {
      const p = await wl.createProject({ ...f, acceptance: lines(f.acceptance), constraints: lines(f.constraints) })
      onCreated(p)
    })
  }
  return (
    <Drawer title="新增專案" onClose={onClose}>
      <form className="hy-stack wl-form" onSubmit={submit}>
        <p className="hy-note">建立後狀態是「規劃中」。PI 會在下一輪排程提出團隊與第一期規劃，等你核准。</p>
        <label>專案名稱<input required value={f.name} onChange={set('name')} maxLength={80} /></label>
        <label>目標<textarea required rows={3} value={f.goal} onChange={set('goal')} /></label>
        <label>範圍<textarea rows={2} value={f.scope} onChange={set('scope')} placeholder="做什麼、不做什麼" /></label>
        <label>驗收標準<span className="hy-note">（每行一項）</span><textarea rows={3} value={f.acceptance} onChange={set('acceptance')} /></label>
        <label>限制<span className="hy-note">（每行一項，例如：不得對外報價）</span><textarea rows={2} value={f.constraints} onChange={set('constraints')} /></label>
        <label>期限<input value={f.deadline} onChange={set('deadline')} placeholder="YYYY-MM" /></label>
        <ErrorLine error={error} />
        <div className="wl-actions"><button className="hy-btn is-primary" disabled={busy}>建立專案</button><button type="button" className="hy-btn" onClick={onClose}>取消</button></div>
      </form>
    </Drawer>
  )
}

function Drawer({ title, onClose, children, wide }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="wl-drawer-backdrop" onClick={onClose}>
      <aside className={`wl-drawer${wide ? ' is-wide' : ''}`} role="dialog" aria-label={title} onClick={e => e.stopPropagation()}>
        <div className="wl-drawer-head"><h2 className="hy-card-title">{title}</h2><button className="hy-btn" onClick={onClose}>關閉</button></div>
        <div className="wl-drawer-body">{children}</div>
      </aside>
    </div>
  )
}

// ── 決策 ─────────────────────────────────────────────────────────────────────
function DraftPreview({ draft }) {
  if (!draft) return null
  return (
    <div className="wl-draft">
      {draft.team && <>
        <h4>團隊</h4>
        <ul className="hy-list">{draft.team.map(m => <li key={m.role}><span>{m.role}{m.lead ? '（負責人）' : ''}</span><span className="hy-note">{m.skills.join('、')}</span></li>)}</ul>
      </>}
      <h4>本期問題</h4>
      <p>{draft.cycle.question}<span className="hy-note">（{draft.cycle.days} 天）</span></p>
      <h4>任務</h4>
      <ol className="wl-ol">{draft.cycle.tasks.map((x, i) => <li key={i}><b>{x.title}</b><span className="hy-note">　{x.role}・{x.skill}</span><div className="hy-note">完成標準：{x.acceptance.join('；')}</div></li>)}</ol>
      {draft.cycle.assumptions?.length > 0 && <><h4>假設</h4><ul className="wl-ol">{draft.cycle.assumptions.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
    </div>
  )
}

function DecisionItem({ d, pid, onDone, showProject }) {
  const [comment, setComment] = useState('')
  const [open, setOpen] = useState(d.kind !== 'general' ? false : true)
  const { busy, error, run } = useAction(onDone)
  const plan = d.kind === 'plan_approval' || d.kind === 'next_cycle'
  const late = isOverdue(d.due)
  const answer = a => run(() => wl.decide(pid || d.project, d.id, a, comment))
  return (
    <article className="hy-card needs-you wl-item">
      <div className="hy-card-head">
        <h3 className="wl-item-title">{decisionTitle(d)}</h3>
        <Pill s={late ? 'bad' : 'you'}>{late ? `逾期 ${shortTime(d.due)}` : '待你決定'}</Pill>
      </div>
      <div className="hy-meta"><span>{showProject ? `${d.project_name}・` : ''}{d.by} 提出</span><span>期限 {shortTime(d.due)}</span></div>
      {d.body && <Md text={d.body} />}
      {plan && <button className="wl-link" onClick={() => setOpen(v => !v)}>{open ? '收起規劃內容' : '看規劃內容'}</button>}
      {plan && open && <DraftPreview draft={d.draft} />}
      {d.recommendation && !plan && <p className="hy-note">PI 建議：{d.recommendation}</p>}
      <label className="wl-form wl-comment">補充意見<textarea rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder={plan ? '退回時寫要改什麼' : '可選'} /></label>
      <ErrorLine error={error} />
      <div className="wl-actions">
        {plan ? <>
          <button className="hy-btn is-primary" disabled={busy} onClick={() => answer('approve')}>核准並開始</button>
          <button className="hy-btn" disabled={busy || !comment.trim()} onClick={() => answer('reject')} title={comment.trim() ? '' : '請先寫要改什麼'}>退回重做</button>
        </> : d.options?.length ? d.options.map(o =>
          <button key={o} className={`hy-btn${o === d.recommendation ? ' is-primary' : ''}`} disabled={busy} onClick={() => answer(o)}>選「{o}」</button>
        ) : <button className="hy-btn is-primary" disabled={busy || !comment.trim()} onClick={() => answer(comment)}>送出回答</button>}
      </div>
    </article>
  )
}

// ── 建議 ─────────────────────────────────────────────────────────────────────
function FeedbackItem({ f, pid, onDone, showProject }) {
  const [text, setText] = useState('')
  const { busy, error, run } = useAction(onDone)
  const waiting = f.state === '待你驗收'
  const label = { 待處理: '等 PI 讀取', 處理中: 'PI 處理中', 再議: '等 PI 再回覆', 待你驗收: '待你驗收', 已結案: '已結案' }[f.state] || f.state
  return (
    <article className={`hy-card wl-item${waiting ? ' needs-you' : ''}`}>
      <div className="hy-card-head">
        <h3 className="wl-item-title">{f.text}</h3>
        <Pill s={feedbackPill(f.state)}>{label}</Pill>
      </div>
      <div className="hy-meta"><span>{showProject ? `${f.project_name}・` : ''}對象：{f.target === 'project' ? '整個專案' : f.target}</span><span>{shortTime(f.ts)}</span></div>
      <ol className="wl-thread">
        {(f.thread || []).slice(1).map((m, i) => <li key={i}><b>{m.by}</b>{m.accepted != null && <Pill s={m.accepted ? 'done' : 'wait'}>{m.accepted ? '採納' : '不採納'}</Pill>}<p>{m.text}</p></li>)}
      </ol>
      {waiting && <>
        <label className="wl-form wl-comment">回覆 PI<textarea rows={2} value={text} onChange={e => setText(e.target.value)} placeholder="要再議時寫原因" /></label>
        <ErrorLine error={error} />
        <div className="wl-actions">
          <button className="hy-btn is-primary" disabled={busy} onClick={() => run(() => wl.resolveFeedback(pid || f.project, f.id, 'close', text))}>驗收結案</button>
          <button className="hy-btn" disabled={busy || !text.trim()} onClick={() => run(() => wl.resolveFeedback(pid || f.project, f.id, 'reopen', text))}>再議</button>
        </div>
      </>}
    </article>
  )
}

function FeedbackBox({ pid, target = 'project', onDone, compact }) {
  const [text, setText] = useState('')
  const { busy, error, run } = useAction(onDone)
  return (
    <form className="wl-form hy-stack" onSubmit={e => { e.preventDefault(); run(async () => { await wl.feedback(pid, target, text); setText('') }) }}>
      <label>{compact ? '給建議' : '給 PI 的建議'}<textarea rows={compact ? 2 : 3} value={text} onChange={e => setText(e.target.value)} placeholder="方向、要補的資料、想改的地方" /></label>
      <ErrorLine error={error} />
      <div className="wl-actions"><button className="hy-btn is-primary" disabled={busy || !text.trim()}>送出建議</button></div>
      <p className="hy-note">PI 會在下一輪排程回覆，回覆後出現在「待你驗收」。</p>
    </form>
  )
}

// ── 評分 ─────────────────────────────────────────────────────────────────────
function RatingForm({ pid, tid, onDone }) {
  const [scores, setScores] = useState({})
  const [usability, setUsability] = useState('')
  const [comment, setComment] = useState('')
  const { busy, error, run, setError } = useAction(onDone)
  function submit() {
    const p = ratingPayload(scores, usability, comment)
    if (p.error) return setError(p.error)
    run(() => wl.rate(pid, tid, p.body))
  }
  return (
    <div className="wl-rating hy-stack">
      {['正確性', '完成度', '一致性'].map(k => (
        <div key={k} className="wl-seg-row"><span>{k}</span>
          <div className="wl-seg" role="radiogroup" aria-label={k}>
            {[1, 2, 3, 4, 5].map(n => <button key={n} type="button" role="radio" aria-checked={scores[k] === n} className="wl-seg-btn" onClick={() => setScores(s => ({ ...s, [k]: n }))}>{n}</button>)}
          </div>
        </div>
      ))}
      <div className="wl-seg-row"><span>可用度</span>
        <div className="wl-seg" role="radiogroup" aria-label="可用度">
          {['直接用', '小修', '重做'].map(u => <button key={u} type="button" role="radio" aria-checked={usability === u} className="wl-seg-btn is-wide" onClick={() => setUsability(u)}>{u}</button>)}
        </div>
      </div>
      <label className="wl-form">一句意見<input value={comment} onChange={e => setComment(e.target.value)} placeholder="可選" /></label>
      <ErrorLine error={error} />
      <div className="wl-actions">
        <button className="hy-btn is-primary" disabled={busy} onClick={submit}>送出評分</button>
        <button className="hy-btn" disabled={busy} onClick={() => run(() => wl.rate(pid, tid, { skip: true }))}>略過</button>
      </div>
    </div>
  )
}

function RateItem({ r, onDone, onOpen }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="hy-card needs-you wl-item">
      <div className="hy-card-head"><h3 className="wl-item-title">{r.title}</h3><Pill s="you">待你評分</Pill></div>
      <div className="hy-meta"><span>{r.project_name}・{r.role}・v{r.version}</span><button className="wl-link" onClick={onOpen}>看產出</button></div>
      {open ? <RatingForm pid={r.project} tid={r.task_id} onDone={onDone} /> : <div className="wl-actions"><button className="hy-btn" onClick={() => setOpen(true)}>評分</button></div>}
    </article>
  )
}

// ── 總覽 ─────────────────────────────────────────────────────────────────────
function QualityCard({ q }) {
  const all = q?.all
  if (!all?.count) return (
    <section className="hy-card"><h2 className="hy-card-title">品質儀表</h2>
      <p className="hy-note wl-gap">還沒有評分。任務完成後在「待你處理」評分，這裡會統計平均分與可用度。</p></section>
  )
  return (
    <section className="hy-card">
      <div className="hy-card-head"><h2 className="hy-card-title">品質儀表</h2><span className="hy-note">{all.count} 份評分</span></div>
      <div className="wl-stat"><b>{all.平均}</b><span className="hy-note">平均分（5 分滿）</span></div>
      <dl className="hy-kv"><dt>正確性</dt><dd>{all.正確性}</dd><dt>完成度</dt><dd>{all.完成度}</dd><dt>一致性</dt><dd>{all.一致性}</dd>
        <dt>可用度</dt><dd className="hy-summary"><Pill s="done">直接用 {all.可用度.直接用}</Pill><Pill s="you">小修 {all.可用度.小修}</Pill><Pill s="bad">重做 {all.可用度.重做}</Pill></dd></dl>
      {Object.keys(q.by_skill || {}).length > 1 && <>
        <h4 className="wl-h4">依方法</h4>
        <ul className="hy-list">{Object.entries(q.by_skill).map(([k, v]) => <li key={k}><span>{k}</span><span>{v.平均}（{v.count}）</span></li>)}</ul>
      </>}
    </section>
  )
}

function Overview({ ov, reload, openFile }) {
  const nav = useNavigate()
  const n = inboxCount(ov)
  return (
    <main className="hy-main">
      <div className="hy-pagehead">
        <div><h1 className="hy-title">總覽</h1><p className="hy-lede">只放需要你處理、或剛發生的事。</p></div>
        <div className="hy-summary">
          <Pill s={n ? 'you' : 'done'}>{n ? `待你處理 ${n}` : '沒有待你處理'}</Pill>
          {ov.alerts.length > 0 && <Pill s="bad">警示 {ov.alerts.length}</Pill>}
        </div>
      </div>
      {ov.alerts.length > 0 && <div className="hy-stack wl-alerts">{ov.alerts.map((a, i) =>
        <p key={i} className="hy-alert is-bad">{a.project_name ? <Link to={`/work-lab/${a.project}`}>{a.project_name}</Link> : null}{a.project_name ? '：' : ''}{a.text}</p>)}</div>}
      <div className="hy-split">
        <div className="hy-stack">
          <section className="hy-card is-focus">
            <div className="hy-card-head"><h2 className="hy-card-title">待你處理</h2><span className="hy-note">{n} 件</span></div>
            {n === 0 && <p className="hy-note wl-gap">目前沒有要你處理的事。PI 有新規劃、回覆或完成任務時會出現在這裡。</p>}
            <div className="hy-stack wl-gap">
              {ov.decisions.map(d => <DecisionItem key={d.id} d={d} onDone={reload} showProject />)}
              {ov.feedback_to_accept.map(f => <FeedbackItem key={f.id} f={f} onDone={reload} showProject />)}
              {ov.to_rate.map(r => <RateItem key={r.task_id} r={r} onDone={reload} onOpen={() => nav(`/work-lab/${r.project}?tab=tasks&task=${r.task_id}`)} />)}
            </div>
          </section>
          <section className="hy-card">
            <h2 className="hy-card-title">最新循環報告</h2>
            {ov.reports.length ? <ul className="hy-list">{ov.reports.map(r =>
              <li key={r.path}><button className="wl-link" onClick={() => openFile(r.path, `${r.project_name}・第 ${r.no} 期報告`)}>{r.project_name}・第 {r.no} 期</button><span className="hy-note">{shortTime(r.ts)}</span></li>)}</ul>
              : <p className="hy-note wl-gap">還沒有報告。每期結束時 PI 會寫循環報告。</p>}
          </section>
        </div>
        <div className="hy-stack">
          <section className="hy-card">
            <div className="hy-card-head"><h2 className="hy-card-title">專案</h2><span className="hy-note">{ov.projects.length} 個</span></div>
            {ov.projects.length ? <ul className="hy-list wl-projects">{ov.projects.map(p =>
              <li key={p.id}><Link to={`/work-lab/${p.id}`} className="wl-project-row">
                <span className="wl-project-name">{p.name}</span>
                <span className="wl-project-meta"><Pill s={healthPill(p.health)}>{p.health}</Pill><Pill s={projectPill(p.status)}>{p.status}</Pill>
                <span className="hy-note">{p.cycle ? `第 ${p.cycle.no} 期・完成 ${p.task_counts.完成}/${Object.values(p.task_counts).reduce((a, b) => a + b, 0)}` : 'PI 規劃中'}</span></span>
              </Link></li>)}</ul>
              : <p className="hy-note wl-gap">還沒有專案。按右上「＋新增專案」開始。</p>}
          </section>
          <QualityCard q={ov.quality} />
        </div>
      </div>
      {MOCK && <p className="hy-note wl-gap">示意資料，僅供版面參考</p>}
    </main>
  )
}

// ── 專案頁 ───────────────────────────────────────────────────────────────────
const TABS = [['overview', '概況'], ['tasks', '本期任務'], ['decisions', '決策與建議'], ['reports', '報告'], ['team', '團隊'], ['log', '日誌']]

function TaskCard({ t, onOpen }) {
  return (
    <button className={`hy-card wl-task${t.status === '受阻' ? ' is-bad' : ''}`} onClick={onOpen}>
      <b>{t.title}</b>
      <div className="hy-meta"><span>{t.role}</span><Pill s={taskPill(t.status)}>{taskLabel(t.status)}{t.version ? ` v${t.version}` : ''}</Pill></div>
    </button>
  )
}

function TaskDrawer({ pid, task, items, onClose, reload }) {
  const [md, setMd] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => {
    setMd(null); setErr('')
    if (task.output_path) wl.file(task.output_path).then(r => setMd(r.markdown)).catch(e => setErr(e.message))
  }, [task.output_path])
  const rated = items.ratings?.find(r => r.task_id === task.id)
  return (
    <Drawer title={task.title} onClose={onClose} wide>
      <div className="hy-stack">
        <div className="hy-summary"><Pill s={taskPill(task.status)}>{taskLabel(task.status)}</Pill><span className="hy-note">{task.role}・{task.skill}{task.version ? `・v${task.version}` : ''}</span></div>
        {task.status === '受阻' && <p className="hy-alert is-bad">受阻：{task.blocked_reason}</p>}
        <section><h4 className="wl-h4">完成標準</h4><ul className="wl-ol">{task.acceptance.map((a, i) => <li key={i}>{a}</li>)}</ul></section>
        {task.review && <section className={`hy-card${task.review.verdict === '退回' ? ' wl-review-bad' : ''}`}>
          <div className="hy-card-head"><b>PI 審查 v{task.review.version}</b><Pill s={task.review.verdict === '通過' ? 'done' : 'bad'}>{task.review.verdict}</Pill></div>
          {task.review.notes && <p className="wl-gap">{task.review.notes}</p>}
        </section>}
        <section>
          <div className="hy-card-head"><h4 className="wl-h4">產出</h4></div>
          {!task.output_path ? <p className="hy-empty">還沒有產出。{task.status === '進行中' ? '成員正在做，交件後會先經 PI 審查。' : '排程領到後開始做。'}</p>
            : err ? <ErrorLine error={err} /> : md == null ? <Loading /> : <div className="hy-card"><Md text={md} /></div>}
        </section>
        {task.method && <section><h4 className="wl-h4">做法</h4><p>{task.method}</p></section>}
        {task.evidence?.length > 0 && <section><h4 className="wl-h4">證據</h4>
          <ul className="hy-list">{task.evidence.map((e, i) => <li key={i}><span>{e.claim}{e.source ? <span className="hy-note">　{e.source}</span> : null}</span><Pill s={evidencePill(e.kind)}>{e.kind}</Pill></li>)}</ul></section>}
        {task.status === '完成' && <section className="hy-card needs-you"><h4 className="wl-h4">你的評分</h4>
          {rated ? <p className="wl-gap">{rated.usability}・正確性 {rated.scores.正確性}・完成度 {rated.scores.完成度}・一致性 {rated.scores.一致性}{rated.comment ? `・${rated.comment}` : ''}</p>
            : <RatingForm pid={pid} tid={task.id} onDone={reload} />}</section>}
        <section className="hy-card"><FeedbackBox pid={pid} target={task.id} onDone={reload} compact /></section>
      </div>
    </Drawer>
  )
}

function ProjectOverviewTab({ b, reload, goTab }) {
  const { project: p, cycle } = b
  const pr = progress(cycle?.tasks)
  const planDecision = b.items.decisions.find(d => d.state === 'open' && d.kind !== 'general')
  return (
    <div className="hy-split">
      <div className="hy-stack">
        {planDecision ? <DecisionItem d={planDecision} pid={p.id} onDone={reload} />
          : cycle ? <section className="hy-card is-focus">
            <div className="hy-card-head"><h2 className="hy-card-title">第 {cycle.no} 期問題</h2><Pill s={cycle.status === '已結期' ? 'done' : 'ai'}>{cycle.status}</Pill></div>
            <p className="wl-gap">{cycle.question}</p>
            <div className="wl-progress" aria-label={`完成 ${pr.done}/${pr.total}`}><span style={{ width: `${pr.pct}%` }} /></div>
            <div className="hy-meta"><span>完成 {pr.done}/{pr.total}{pr.blocked ? `・受阻 ${pr.blocked}` : ''}</span><span>{shortTime(cycle.start)}–{shortTime(cycle.end)}</span></div>
            <div className="wl-actions"><button className="hy-btn" onClick={() => goTab('tasks')}>看任務看板</button></div>
          </section>
            : <p className="hy-empty">PI 規劃中。下一輪排程（每小時 :15）會提出團隊與第一期規劃，出現後在這裡核准。</p>}
        <section className="hy-card">
          <h2 className="hy-card-title">專案設定</h2>
          <dl className="hy-kv">
            <dt>目標</dt><dd>{p.goal}</dd>
            <dt>範圍</dt><dd>{p.scope || '待補'}</dd>
            <dt>驗收</dt><dd>{p.acceptance?.length ? <ul>{p.acceptance.map((a, i) => <li key={i}>{a}</li>)}</ul> : '待補'}</dd>
            <dt>限制</dt><dd>{p.constraints?.length ? <ul>{p.constraints.map((a, i) => <li key={i}>{a}</li>)}</ul> : '無'}</dd>
            <dt>期限</dt><dd>{p.deadline || '待補'}</dd>
          </dl>
        </section>
      </div>
      <div className="hy-stack">
        <section className="hy-card"><FeedbackBox pid={p.id} onDone={reload} /></section>
        <section className="hy-card">
          <div className="hy-card-head"><h2 className="hy-card-title">團隊現在</h2><button className="wl-link" onClick={() => goTab('team')}>能力卡</button></div>
          {p.team.length ? <ul className="hy-list">{p.team.map(m => <li key={m.role} className="wl-member-row"><span><b>{m.role}</b><span className="hy-note wl-block">{m.now || '待命'}</span></span><span className="hy-note">{shortTime(m.updated)}</span></li>)}</ul>
            : <p className="hy-note wl-gap">核准規劃後才會組隊。</p>}
        </section>
      </div>
    </div>
  )
}

function TasksTab({ b, openTask }) {
  if (!b.cycle) return <p className="hy-empty">還沒有任務。核准規劃後，第一期任務會出現在這裡。</p>
  const g = groupTasks(b.cycle.tasks)
  return (
    <>
      <p className="hy-note wl-question">第 {b.cycle.no} 期：{b.cycle.question}</p>
      <div className="hy-board wl-board">
        {TASK_COLUMNS.map(c => (
          <section key={c} className={`hy-col${c === '受阻' && g[c].length ? ' is-needs-you' : ''}${g[c].length ? '' : ' is-empty'}`}>
            <h3 className="hy-col-head">{taskLabel(c)}<span>{g[c].length}</span></h3>
            {g[c].map(t => <TaskCard key={t.id} t={t} onOpen={() => openTask(t.id)} />)}
            {!g[c].length && <p className="hy-note wl-col-empty">無</p>}
          </section>
        ))}
      </div>
    </>
  )
}

function DecisionsTab({ b, reload }) {
  const open = b.items.decisions.filter(d => d.state === 'open')
  const done = b.items.decisions.filter(d => d.state !== 'open').slice().reverse()
  const fbActive = b.items.feedback.filter(f => f.state !== '已結案').slice().reverse()
  const fbClosed = b.items.feedback.filter(f => f.state === '已結案').slice().reverse()
  return (
    <div className="hy-split">
      <div className="hy-stack">
        <h2 className="hy-card-title">決策</h2>
        {open.length ? open.map(d => <DecisionItem key={d.id} d={d} pid={b.project.id} onDone={reload} />) : <p className="hy-empty">目前沒有待你決定的事。</p>}
        {done.length > 0 && <details className="hy-card"><summary className="wl-summary">已決定 {done.length}</summary>
          <ul className="hy-list">{done.map(d => <li key={d.id}><span>{decisionTitle(d)}<span className="hy-note wl-block">{d.answer === 'approve' ? '核准' : d.answer === 'reject' ? '退回' : d.answer}{d.comment ? `：${d.comment}` : ''}</span></span><span className="hy-note">{shortTime(d.decided_at || d.ts)}</span></li>)}</ul></details>}
      </div>
      <div className="hy-stack">
        <h2 className="hy-card-title">建議</h2>
        <section className="hy-card"><FeedbackBox pid={b.project.id} onDone={reload} /></section>
        {fbActive.map(f => <FeedbackItem key={f.id} f={f} pid={b.project.id} onDone={reload} />)}
        {fbClosed.length > 0 && <details className="hy-card"><summary className="wl-summary">已結案 {fbClosed.length}</summary>
          <ul className="hy-list">{fbClosed.map(f => <li key={f.id}><span>{f.text}<span className="hy-note wl-block">{f.reply}</span></span></li>)}</ul></details>}
      </div>
    </div>
  )
}

function ReportsTab({ b, openFile }) {
  const reports = (b.project.reports || []).slice().reverse()
  if (!reports.length) return <p className="hy-empty">還沒有循環報告。每期結束時 PI 會整合本期產出寫成報告，最新的排最上面。</p>
  return (
    <div className="hy-stack">{reports.map((r, i) =>
      <section key={r.path} className={`hy-card${i === 0 ? ' is-focus' : ''}`}>
        <div className="hy-card-head"><h2 className="hy-card-title">第 {r.no} 期報告</h2><span className="hy-note">{shortTime(r.ts)}</span></div>
        <p className="wl-gap">{r.question}</p>
        <div className="wl-actions"><button className="hy-btn is-primary" onClick={() => openFile(r.path, `第 ${r.no} 期報告`)}>開啟報告</button></div>
      </section>)}</div>
  )
}

function TeamTab({ b }) {
  if (!b.project.team.length) return <p className="hy-empty">核准規劃後，PI 提出的團隊與能力卡會出現在這裡。</p>
  return (
    <div className="wl-team">{b.project.team.map(m =>
      <section key={m.role} className="hy-card">
        <div className="hy-card-head"><h2 className="hy-card-title">{m.role}</h2>{m.lead ? <Pill s="ai">負責人</Pill> : <Pill s="wait">{m.status}</Pill>}</div>
        <dl className="hy-kv"><dt>背景</dt><dd>{m.persona}</dd><dt>方法</dt><dd>{m.skills.join('、')}</dd><dt>交付標準</dt><dd>{m.deliverables}</dd><dt>現在</dt><dd>{m.now || '待命'}<span className="hy-note">　{shortTime(m.updated)}</span></dd></dl>
      </section>)}</div>
  )
}

function LogTab({ b }) {
  const [actor, setActor] = useState('')
  const [cred, setCred] = useState('')
  const actors = useMemo(() => [...new Set(b.logs.map(l => l.actor))], [b.logs])
  const rows = filterLogs(b.logs, { actor, cred })
  return (
    <section className="hy-card">
      <div className="wl-filters wl-form">
        <label>角色<select value={actor} onChange={e => setActor(e.target.value)}><option value="">全部</option>{actors.map(a => <option key={a}>{a}</option>)}</select></label>
        <label>可信度<select value={cred} onChange={e => setCred(e.target.value)}><option value="">全部</option>{['假設', '外部資料', '審查', '決策'].map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      {rows.length ? <ol className="wl-timeline">{rows.map((l, i) =>
        <li key={i}><span className="hy-note wl-time">{shortTime(l.ts)}</span><div><b>{l.actor}</b>　{l.action}{l.why && <p className="hy-note">{l.why}</p>}</div><Pill s="wait">{l.cred}</Pill></li>)}</ol>
        : <p className="hy-note wl-gap">沒有符合的紀錄。</p>}
    </section>
  )
}

function ProjectView({ pid, openFile, onLoaded }) {
  const [b, setB] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'overview'
  const taskId = params.get('task')
  const load = useCallback(async () => {
    try { const data = await wl.project(pid); setB(data); setError(''); onLoaded?.() } catch (e) { setError(e.message) }
  }, [pid, onLoaded])
  useEffect(() => { setB(null); load() }, [load])
  const go = (t, extra = {}) => setParams({ tab: t, ...extra })
  if (error && !b) return <main className="hy-main"><ErrorLine error={error} /><button className="hy-btn" onClick={load}>再試一次</button></main>
  if (!b) return <main className="hy-main"><Loading /></main>
  const task = taskId && b.cycle?.tasks.find(t => t.id === taskId)
  const openDecisions = b.items.decisions.filter(d => d.state === 'open').length + b.items.feedback.filter(f => f.state === '待你驗收').length
  const health = b.alerts?.length ? '卡住' : openDecisions ? '需關注' : '正常'
  return (
    <>
      <nav className="hy-tabs" aria-label="專案分頁">
        {TABS.map(([k, label]) => <button key={k} className="hy-tab" aria-current={tab === k ? 'page' : undefined} onClick={() => go(k)}>
          {label}{k === 'decisions' && openDecisions ? <span className="wl-count">{openDecisions}</span> : null}</button>)}
      </nav>
      <main className="hy-main">
        <div className="hy-pagehead">
          <div><Link className="wl-back" to="/work-lab">← 總覽</Link><h1 className="hy-title">{b.project.name}</h1>
            <p className="hy-lede">{b.cycle ? `第 ${b.cycle.no} 期・${b.cycle.status}` : 'PI 規劃中'}・更新 {shortTime(b.project.updated)}</p></div>
          <div className="hy-summary"><Pill s={healthPill(health)}>{health}</Pill><Pill s={projectPill(b.project.status)}>{b.project.status}</Pill></div>
        </div>
        {b.alerts?.length > 0 && <div className="hy-stack wl-alerts">{b.alerts.map((a, i) => <p key={i} className="hy-alert is-bad">{a.text}</p>)}</div>}
        <ErrorLine error={error} />
        {tab === 'overview' && <ProjectOverviewTab b={b} reload={load} goTab={go} />}
        {tab === 'tasks' && <TasksTab b={b} openTask={id => go('tasks', { task: id })} />}
        {tab === 'decisions' && <DecisionsTab b={b} reload={load} />}
        {tab === 'reports' && <ReportsTab b={b} openFile={openFile} />}
        {tab === 'team' && <TeamTab b={b} />}
        {tab === 'log' && <LogTab b={b} />}
        {MOCK && <p className="hy-note wl-gap">示意資料，僅供版面參考</p>}
      </main>
      {task && <TaskDrawer pid={pid} task={task} items={b.items} onClose={() => go('tasks')} reload={load} />}
    </>
  )
}

// ── 報告閱讀 ─────────────────────────────────────────────────────────────────
function Reader({ file, onClose }) {
  const [md, setMd] = useState(null)
  const [err, setErr] = useState('')
  useEffect(() => { wl.file(file.path).then(r => setMd(r.markdown)).catch(e => setErr(e.message)) }, [file.path])
  return (
    <Drawer title={file.title} onClose={onClose} wide>
      {err ? <ErrorLine error={err} /> : md == null ? <Loading /> : <Md text={md} />}
    </Drawer>
  )
}

// ── 入口 ─────────────────────────────────────────────────────────────────────
export default function WorkLab() {
  const { pid } = useParams()
  const nav = useNavigate()
  const [ov, setOv] = useState(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [file, setFile] = useState(null)
  const [tick, setTick] = useState(0)
  const loadOverview = useCallback(async () => {
    try { setOv(await wl.overview()); setError('') } catch (e) { setError(e.message) }
  }, [])
  useEffect(() => { loadOverview() }, [loadOverview, tick])
  const openFile = (path, title) => setFile({ path, title })
  return (
    <div className="hy wl">
      <Header lastRun={ov?.last_run} onRefresh={() => setTick(x => x + 1)} onNew={() => setCreating(true)} />
      {pid ? <ProjectView key={pid + tick} pid={pid} openFile={openFile} onLoaded={loadOverview} />
        : error && !ov ? <main className="hy-main"><ErrorLine error={error} /><button className="hy-btn" onClick={loadOverview}>再試一次</button></main>
          : !ov ? <main className="hy-main"><Loading /></main>
            : <Overview ov={ov} reload={loadOverview} openFile={openFile} />}
      {creating && <NewProject onClose={() => setCreating(false)} onCreated={p => { setCreating(false); loadOverview(); nav(`/work-lab/${p.id}`) }} />}
      {file && <Reader file={file} onClose={() => setFile(null)} />}
    </div>
  )
}
