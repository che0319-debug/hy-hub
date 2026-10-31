import './report-summary.css'

const TITLE = '一頁摘要：現在怎樣、你要做什麼'

export function ReportStaleNote() {
  return <p className="rs-stale" role="status">報告比目前狀態舊，請以狀態列為準</p>
}

// 概況的一頁摘要，以及成果頁還沒有報告內文時，都畫這一張。數字、徽章、結論、清單沒有就不顯示。
export default function ReportSummaryCard({
  title = TITLE,
  source = '正式成果報告',
  badges = [],
  metrics = [],
  conclusion = '',
  items = [],
  status = 'ready',
  message = '',
  stale = false,
}) {
  const ready = status === 'ready'
  const hasBody = badges.length > 0 || metrics.length > 0 || Boolean(conclusion) || items.length > 0
  return <section className="ao-card ao-report-snapshot rs-card" aria-label={title || TITLE}>
    <div className="ao-card-head">
      <h2>{title || TITLE}</h2>
      {source ? <span className="rs-tag rs-source" data-s="source">{source}</span> : null}
    </div>
    {status === 'loading' && <p className="ao-muted">正在讀取專案報告…</p>}
    {status === 'empty' && <p>這個專案還沒有專案報告</p>}
    {status === 'empty' && message ? <p className="ao-muted">{message}</p> : null}
    {status === 'error' && <p role="alert">{message || '報告讀取失敗。'}</p>}
    {ready && badges.length > 0 && <div className="rs-tags">{badges.map((badge, index) => <span className="rs-tag" data-s={badge.tone || 'wait'} key={`${badge.text}-${index}`}>{badge.text}</span>)}</div>}
    {ready && metrics.length > 0 && <div className="rs-metrics">{metrics.map((metric, index) => <div className="rs-metric" key={`${metric.label}-${index}`}><b>{metric.value}</b><span>{metric.label}</span></div>)}</div>}
    {ready && conclusion ? <p className="rs-conclusion">結論：{conclusion}</p> : null}
    {ready && items.length > 0 && <ul className="rs-items">{items.map((item, index) => <li key={index}>{item.lead ? <><b>{item.lead}</b>：{item.text}</> : item.text}</li>)}</ul>}
    {ready && !hasBody && <p className="ao-muted">報告裡沒有「一頁摘要」。</p>}
    {stale ? <ReportStaleNote /> : null}
  </section>
}
