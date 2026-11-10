import { useEffect, useState, useSyncExternalStore } from 'react'
import { fetchWeeklyChange, postWeeklyChange } from '../api'
import { createGoalsStore } from './store.mjs'
import { taipeiDate, weeklyView } from './weekly.mjs'
import './weekly.css'

const weeklyStore = createGoalsStore(fetchWeeklyChange)
export const refreshWeeklyDirection = weeklyStore.refresh
export function WeeklyDirectionContent({ document, status, refresh = () => {} }) {
  const view = weeklyView(document)
  const [editing,setEditing] = useState(false),[draft,setDraft] = useState(''),[date,setDate] = useState(taipeiDate())
  const [saving,setSaving] = useState(false),[error,setError] = useState('')
  return <section className="weekly-direction" aria-label="每週方向">
    {view.weeks !== null && <div className="weekly-countdown"><span>距 50 歲</span><strong>{view.weeks}</strong><span>週</span></div>}
    <div className="weekly-main"><div className="weekly-heading"><h2>{view.title}</h2>{view.stale && <span className="weekly-stale">尚未更新至本週</span>}{view.range && <span className="weekly-period">{view.range.start} — {view.range.end}</span>}</div>
      <p className="weekly-text">{view.entry?.text || (status==='pending'?'正在讀取每週方向…':status==='failed'?'每週方向暫時無法讀取。':'等待 HY 綜整下一週的方向與一小步。')}</p>
      <details className="weekly-detail"><summary>完整內容與修改</summary><p>{view.entry?.text || '尚無每週方向。'}</p>{view.entry && <p className="weekly-meta">{view.entry.writtenAt ? '更新日期' : '紀錄日期'} {view.updatedDate}</p>}
        <button type="button" onClick={()=>{setDraft(view.entry?.text || '');setDate(view.range?.start || taipeiDate());setError('');setEditing(true)}} disabled={status!=='loaded'}>修改這段方向</button>
        <button type="button" onClick={()=>refresh()}>重新讀取</button>
        {editing && <form onSubmit={async e=>{e.preventDefault();setSaving(true);setError('');try{const result=await postWeeklyChange({text:draft.trim(),date});const saved=await refresh({force:true});if(!saved?.entries?.some(entry=>entry.id===result.id && entry.text===draft.trim()))throw new Error('Readback mismatch');setEditing(false)}catch{setError('儲存未完成，請重新讀取後確認再重試。')}finally{setSaving(false)}}}>
          <label>適用週期（選該週任一天）<input type="date" required value={date} disabled={saving} onChange={e=>setDate(e.target.value)} /></label>
          <label>方向與一小步<textarea required maxLength={500} rows={4} value={draft} disabled={saving} onChange={e=>setDraft(e.target.value)} /></label>
          {error && <p role="alert">{error}</p>}<button disabled={saving}>{saving?'儲存中…':'儲存'}</button><button type="button" disabled={saving} onClick={()=>setEditing(false)}>取消</button>
        </form>}
      </details>
    </div>
  </section>
}
export default function WeeklyDirection() {
  const snapshot = useSyncExternalStore(weeklyStore.subscribe,weeklyStore.getSnapshot,weeklyStore.getSnapshot)
  useEffect(()=>{
    weeklyStore.ensure()
    const focus=()=>{if(document.visibilityState==='visible')weeklyStore.refresh()}
    window.addEventListener('focus',focus)
    return ()=>window.removeEventListener('focus',focus)
  },[])
  return <WeeklyDirectionContent {...snapshot} refresh={weeklyStore.refresh} />
}
