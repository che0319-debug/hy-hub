import { reviewError } from '../lib/reviewErrors.mjs'
const when = value => value ? new Date(value * 1000).toLocaleString('zh-TW', { hour12: false }) : '待補'
export default function ReviewBlockers({items = [], compact = false}) {
  if (!items.length) return null
  return <section className="hy-card" aria-label="系統阻塞通知" role="status">
    <div className="hy-card-head"><h2 className="hy-card-title">系統阻塞</h2><span className="hy-pill" data-s="bad">待系統排除</span></div>
    {items.map(item => <div key={item.package_id}>
      <p>{reviewError(item.reason || item.code)}</p>
      <dl className="hy-kv"><dt>起算時間</dt><dd>{when(item.since)}</dd><dt>該誰動作</dt><dd>{item.responsible || '系統維護者'}：{item.action_required || '排除異常後恢復獨立審查'}</dd><dt>專案期限</dt><dd>{item.deadline_label || '因系統阻塞順延'}</dd></dl>
      {!compact && <ul>{(item.attempts || []).map((attempt,index)=><li key={attempt.runner_id+index}>{attempt.runner_id}：{reviewError(attempt.reason)}</li>)}</ul>}
    </div>)}
    <p className="hy-note">系統通知；獨立審查通過後，驗收仍由 HY 本人處理。</p>
  </section>
}
