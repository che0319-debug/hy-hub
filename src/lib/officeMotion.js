import { ACTIVE, isStalled } from './commandCenterModel.js'

// Motion is a presentation of telemetry, never evidence of ongoing execution.
export function officeMotion(work, connection, now = Date.now()) {
  if (connection !== 'live') return { mode:'paused', label:'連線暫停', moving:false }
  const fresh = work.find(w => ACTIVE.has(w.status) && !isStalled(w,now) &&
    Number.isFinite(Date.parse(w.updated_at)) && w.current_activity && w.telemetry_available)
  if (fresh) return { mode:fresh.status, label:fresh.current_activity, moving:true }
  if (work.some(w=>isStalled(w,now))) return { mode:'stalled', label:'久未更新', moving:false }
  const alert = work.find(w=>['failed','waiting','review'].includes(w.status))
  if (alert) return { mode:alert.status, label:alert.current_activity || alert.status, moving:false }
  if (work.some(w=>ACTIVE.has(w.status))) return { mode:'unknown', label:'等待活動回報', moving:false }
  if (work.some(w=>w.status==='queued')) return { mode:'queued', label:'排隊中', moving:false }
  return { mode:'idle', label:work.length?'目前無執行工作':'閒置', moving:true }
}
