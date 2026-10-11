import { useEffect, useRef, useState } from 'react'
import { authHeaders } from '../auth'
import { acceptanceLabels, fetchModules, implementationLabels, layerNames, safeGithubUrl } from '../lib/moduleRegistry'
import '../../public/hy-ui/hy-ui.css'
import './module-registry.css'

function Link({ url, children }) {
  const safe = safeGithubUrl(url)
  return safe ? <a href={safe} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}（連結待確認）</span>
}
function Entries({ title, items }) {
  return <section><h3 className="hy-card-title">{title}</h3>{items.length ? <ul className="hy-list">{items.map((text, i) => <li key={i}>{text}</li>)}</ul> : <p>待補</p>}</section>
}
const date = value => value ? new Date(value * 1000).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) : '待補'

function Detail({ module: m, modules, close }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.focus()
    function keydown(event) {
      if (event.key === 'Escape') close()
      if (event.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll('button,a[href]')
        if (!nodes?.length) return
        const first = nodes[0], last = nodes[nodes.length - 1]
        if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); previous?.focus() }
  }, [close])
  return <div className="mr-backdrop" onClick={close}><section ref={ref} tabIndex={-1} className="hy-card mr-dialog" role="dialog" aria-modal="true" aria-label={m.module_name} onClick={e => e.stopPropagation()}>
    <div className="hy-card-head"><h2 className="hy-card-title">{m.module_name}</h2><button className="hy-btn" onClick={close}>關閉詳情</button></div>
    <p>{m.description}</p><p>{m.inventory_note}</p>
    <dl className="hy-kv"><dt>建置狀態</dt><dd>{implementationLabels[m.implementation_status]}</dd><dt>驗收狀態</dt><dd>{acceptanceLabels[m.acceptance_status]}</dd>
      <dt>正式版本</dt><dd>{m.version}</dd><dt>Commit</dt><dd><Link url={`https://github.com/${m.source_repository}/commit/${m.commit}`}>{m.commit}</Link></dd>
      <dt>最近更新</dt><dd>{date(m.updated_at)}</dd></dl>
    <Entries title="已完成能力" items={m.completed_capabilities}/><Entries title="尚缺能力" items={m.missing_capabilities}/>
    <section><h3 className="hy-card-title">程式來源</h3><p>{m.source_repository}</p><ul className="hy-list">{m.source_paths.map(path => <li key={path}><Link url={`https://github.com/${m.source_repository}/blob/${m.commit}/${path}`}>{path}</Link></li>)}</ul></section>
    <Entries title="相依模組" items={m.dependencies.map(id => modules.find(v => v.module_id === id)?.module_name || id)}/>
    <section><h3 className="hy-card-title">測試與驗收證據</h3><ul className="hy-list">{m.evidence.map((e, i) => <li key={i}><Link url={e.url}>{e.summary}</Link><p className="mr-meta">{e.kind} · {e.version} · {e.commit?.slice(0, 7)}</p></li>)}</ul>
      {m.acceptance_record ? <p>humanAction：{m.acceptance_record.action_id} · {m.acceptance_record.actor} · {date(m.acceptance_record.accepted_at)} · {m.acceptance_record.decision}</p> : <p>尚未登錄正式驗收紀錄。程式與測試證據不等同正式驗收。</p>}</section>
    <Entries title="建議下一步" items={m.next_steps}/>
    <section><h3 className="hy-card-title">歷史變更</h3>{m.history.length ? <ul className="hy-list">{m.history.slice().reverse().map((h, i) => <li key={i}>{date(h.at)} · {h.actor} · {h.operation}<p>前版：{h.previous?.version} · {h.previous?.commit?.slice(0, 7)} · {acceptanceLabels[h.previous?.acceptance_status]}</p></li>)}</ul> : <p>目前為首次程式盤點。</p>}</section>
  </section></div>
}

export default function ModuleRegistryOverview() {
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState(null)
  useEffect(() => {
    const controller = new AbortController()
    setModules(null); setSelected(null); setError('')
    fetchModules({ base: import.meta.env.VITE_API_BASE || '', headers: authHeaders(), signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setModules(data) })
      .catch(e => { if (!controller.signal.aborted) { setModules(null); setError(e.message || 'Module Registry 讀取失敗，請重試') } })
    return () => controller.abort()
  }, [revision])
  return <div className="hy mr-root">
    <section className="hy-card is-focus"><div className="hy-card-head"><h2 className="hy-card-title">整體架構</h2><button className="hy-btn" onClick={() => { setModules(null); setSelected(null); setRevision(v => v + 1) }}>重新讀取</button></div>
      <p>正式 Registry 是唯一狀態來源。建置與正式驗收分開記錄；新版必須重新驗收。</p>
      {error ? <div role="alert" className="hy-alert"><p>{error}</p><button className="hy-btn" onClick={() => setRevision(v => v + 1)}>重試讀取</button></div> : !modules ? <p role="status">正在讀取正式模組資料…</p> : <>
        <p className="mr-meta">{modules.length} 個模組 · {modules.filter(m => m.acceptance_status === 'ACCEPTED').length} 個已正式驗收</p>
        {layerNames.map(layer => <section key={layer} className="mr-layer" aria-label={layer}><h3 className="hy-card-title">{layer}</h3><div className="mr-grid">{modules.filter(m => m.layer === layer).map(m => <button type="button" className="hy-card mr-tile" key={m.module_id} onClick={() => setSelected(m.module_id)} aria-label={`${m.module_name}：查看模組詳情`}>
          <h4 className="hy-card-title">{m.module_name}</h4><div className="mr-states"><span className="hy-pill" data-s={m.implementation_status === 'IN_PROGRESS' ? 'ai' : 'wait'}>建置：{implementationLabels[m.implementation_status]}</span>
            <span className="hy-pill" data-s={m.acceptance_status === 'ACCEPTED' ? 'done' : m.acceptance_status === 'REJECTED' ? 'bad' : m.acceptance_status === 'PENDING_ACCEPTANCE' ? 'you' : 'wait'}>驗收：{acceptanceLabels[m.acceptance_status]}</span></div>
          <p className="mr-meta">{m.version} · {m.commit.slice(0, 7)}</p>{m.missing_capabilities.length > 0 && <p className="mr-meta">尚缺 {m.missing_capabilities.length} 項能力或證據</p>}
        </button>)}</div></section>)}
      </>}
    </section>
    <section className="hy-card"><h2 className="hy-card-title">模組建設原則</h2><p>Module Registry 是登錄中心。PI、Mission、Quality 保持各自責任；正式驗收須由 HY 的合法 humanAction 核准。</p></section>
    {modules && selected && <Detail module={modules.find(m => m.module_id === selected)} modules={modules} close={() => setSelected(null)}/>}
  </div>
}
