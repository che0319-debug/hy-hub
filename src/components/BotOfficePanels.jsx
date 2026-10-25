import { useState } from 'react'
import { OfficeRequest, OfficeReview, OfficeFollowUps } from './OfficeActions'
import { OFFICE_NAMES, safeDriveUrl } from '../botOfficeData'

export function OfficeCards({ items }) {
  return items.length ? <div className="bo-cards">{items.map(c => <article className="ao-card" key={c.id}>
    <div className="ao-card-head"><h2>{c.title}</h2><small>{c.date}</small></div>
    <p className="bo-summary">{c.summary}</p>
    {c.driveUrl ? <a href={c.driveUrl} target="_blank" rel="noopener noreferrer">開啟 Drive 原件 ↗</a> : <small>Drive 連結尚未提供</small>}
  </article>)}</div> : <div className="ao-card hy-empty">尚未登錄資料。</div>
}

export function OfficeTeam({ project }) {
  return <section className="ao-card ao-team"><h2>這個專案的團隊</h2>
    <dl className="hy-kv">{['負責 Bot', 'PI', '執行者', '審查者'].map(role => <div className="bo-team-row" key={role}><dt>{role}</dt><dd>{project.team.filter(m => m.role === role).map(m => m.name).join('、') || '尚未指定'}</dd></div>)}</dl>
  </section>
}

const REQUEST_LABELS = {spec_change: '規格變更', message: '會議室留言', new_project: '新增專案', reassign: '改派'}
export function OfficeMeeting({ project, projects, reload }) {
  const messages = [
    ...project.logs.map(l => ({id: l.id, at: l.at, author: l.actor === 'hy' ? 'HY' : OFFICE_NAMES[l.answered_by] || 'Bot', content: l.content})),
    ...project.requests.map(r => ({id: r.id, at: r.created_at, author: r.created_by === 'hy' ? 'HY' : '專案流程', content: `${REQUEST_LABELS[r.type] || r.type}：${r.payload?.content || ''}`, pending: r.status === 'open'})),
  ].sort((a,b) => String(a.at || '').localeCompare(String(b.at || '')))
  return <div className="ao-meeting">
    <section className="ao-card ao-thread-card"><h2>與 PI 的對話</h2>
      <div className="ao-thread">{messages.map(m => <article className={`ao-message${m.author === 'HY' ? ' is-me' : ''}`} key={m.id}><div><b>{m.author}</b> <time>{m.at}</time>{m.pending && <span className="hy-pill" data-s="wait">已送出</span>}</div><p className="bo-summary">{m.content}</p></article>)}{!messages.length && <p className="ao-muted">還沒有對話。從下方送出意見或補充資料。</p>}</div>
      <div className="ao-composer"><OfficeRequest key={project.id} type="message" projects={projects} projectId={project.id} inline reload={reload} /></div>
      {project.cards.meeting.length > 0 && <details><summary>討論與補充卡片（{project.cards.meeting.length}）</summary><OfficeCards items={project.cards.meeting} /></details>}
    </section>
    <OfficeTeam project={project} />
  </div>
}

function DriveDocument({ url, title }) {
  const safe = safeDriveUrl(url)
  let preview = null
  if (safe) {
    const u = new URL(safe)
    if (['drive.google.com', 'docs.google.com'].includes(u.hostname) && /^\/(?:file\/d|document\/d|spreadsheets\/d|presentation\/d)\/[\w-]+\/(?:view|edit|preview)/.test(u.pathname)) {
      u.pathname = u.pathname.replace(/\/(view|edit|preview).*$/, '/preview'); u.search = ''; u.hash = ''; preview = u.href
    }
  }
  return <section className="ao-card ao-document-pane"><h2>{title}</h2>{safe ? <><a href={safe} target="_blank" rel="noopener noreferrer">開啟 Drive 原件 ↗</a>{preview && <iframe className="bo-document-preview" title={title} src={preview} loading="lazy" referrerPolicy="no-referrer" />}</> : <p className="ao-muted">正式文件連結尚未提供。</p>}</section>
}

export function OfficeExecution({ project }) {
  const [mode, setMode] = useState('summary')
  const work = project.cards.execution.filter(c => c.id !== project.planCard?.id)
  return <>
    <div className="ao-toolbar" role="group" aria-label="執行計畫顯示模式">{[['summary','規劃摘要'], ['split','時程＋文件'], ['work','時程與執行'], ['document','完整文件']].map(([key,label]) => <button key={key} aria-pressed={mode===key} onClick={() => setMode(key)}>{label}</button>)}</div>
    {mode === 'summary' ? <><section className="ao-card"><h2>規劃摘要</h2><p className="ao-muted">正式規劃書卡片摘要；完整內容請開啟 Drive 原件。</p>{project.planCard ? <OfficeCards items={[project.planCard]} /> : <p>尚未指定正式規劃書。</p>}</section><OfficeCards items={work} /></> : <div className={`bo-execution-view bo-execution-${mode}`}>
      {mode !== 'document' && <section className="ao-card"><h2>時程與執行</h2><p className="ao-muted">以下為已登錄的執行工作卡；未提供的里程碑與排程不另行推估。</p><OfficeCards items={work} /></section>}
      {mode !== 'work' && <DriveDocument url={project.planUrl} title="正式規劃書" />}
    </div>}
  </>
}

export function OfficeResults({ project }) {
  const [chosen, setChosen] = useState('')
  const outputs = project.cards.outputs.filter(c => !c.isReview)
  const selected = outputs.find(c => c.id === chosen) || outputs.find(c => c.id === project.latestCardId) || outputs.at(-1)
  const reviews = project.cards.outputs.filter(c => c.isReview)
  return <div className="ao-results">
    {outputs.length > 0 && <section className="ao-card"><label>成果報告版本<select aria-label="成果報告版本" value={selected?.id || ''} onChange={e => setChosen(e.target.value)}>{outputs.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label></section>}
    {selected ? <><DriveDocument url={selected.driveUrl} title="正式成果文件" /><OfficeCards items={[selected]} /></> : <section className="ao-card"><h2>成果報告</h2><p className="ao-muted">尚未登錄正式成果文件。</p></section>}
    <OfficeReview project={project} /><OfficeFollowUps project={project} />
    {reviews.length > 0 && <section className="ao-card"><h2>審查紀錄</h2><OfficeCards items={reviews} /></section>}
    {project.folderUrl && <a href={project.folderUrl} target="_blank" rel="noopener noreferrer">開專案 Drive 資料夾 ↗</a>}
  </div>
}
