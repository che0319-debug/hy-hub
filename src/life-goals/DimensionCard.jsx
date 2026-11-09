import { ACTIVITY, dateText, evidenceItems, safeEvidenceUrl } from './model.mjs'

export function ActivityPill({ dimension }) {
  const activity = ACTIVITY[dimension.activity] || ACTIVITY.unknown
  return <span className="hy-pill goals-activity" data-s={activity.tone}><i aria-hidden="true" />{activity.text}</span>
}
export function ScoreSummary({ dimension }) {
  return <div className="goals-score-row"><div><p className="goals-caption">推進分</p><strong className="goals-score">{dimension.scoreText}</strong></div><ActivityPill dimension={dimension} /></div>
}
const BOT_NAMES = { sam: 'Sam', family: '小因', '950157': '950157', hy: 'HY' }
function AssessmentAttribution({ provenance }) {
  if (provenance?.uploadedBy !== 'hy' || !BOT_NAMES[provenance?.assessedBy]) return null
  return <p className="goals-caption">評估署名：{BOT_NAMES[provenance.assessedBy]} · HY 統一上傳</p>
}
export function EvidenceStatus({ dimension }) {
  if (dimension.evidenceStatus === 'ok') return null
  return <><p className="goals-source-warning" role="status">{dimension.evidenceStatus === 'source_down' ? '來源中斷' : '證據不足'}：{dimension.statusReason || '等待補齊可讀的真實紀錄。'} 不扣分；燈號只反映已知紀錄。</p><AssessmentAttribution provenance={dimension.lastAssessment?.provenance} /></>
}
export function GoalLines({ dimension }) {
  return <dl className="goals-lines"><dt>十年後的樣子 <span className="goals-caption">{dimension.visionLabel}</span></dt><dd>{dimension.vision.text || '待你填寫方向。'}</dd><dt>現在在哪</dt><dd>{dimension.nowSummary}</dd><dt>下一小步</dt><dd>{dimension.nextStep}</dd></dl>
}
const KIND = { assessment: 'Bot 評估', initial: '首評', action: '行動', setback: '倒退', decay: '長期無行動', correction: '使用者校正', revert: '回復', note: '關聯紀錄' }
export function HistoryRows({ entries = [] }) {
  if (!entries.length) return <p className="goals-caption">尚無評分紀錄；不以舊分當作新制成長。</p>
  return <ol className="goals-history">{entries.map((h, i) => <li key={h.id || i}>
    <div className="goals-history-top"><span>{KIND[h.kind] || '紀錄'} {h.kind !== 'initial' && Number.isFinite(h.delta) ? `${h.delta > 0 ? '+' : ''}${h.delta}` : ''}</span><time>{dateText(h.at)}</time></div>
    <p>{h.reason || '理由待補'}</p>
    {h.backfill && <span className="goals-caption">補登</span>}{h.revertedBy && <span className="goals-caption">已追加回復紀錄</span>}
    {h.provenance ? <AssessmentAttribution provenance={h.provenance} /> : h.author && <span className="goals-caption">記錄者：{h.author}</span>}
    {evidenceItems(h).map((e, j) => <div key={j} className="goals-evidence"><span>來源 {e.source}：</span>{safeEvidenceUrl(e.ref) ? <a href={safeEvidenceUrl(e.ref)} target="_blank" rel="noopener noreferrer">{e.ref}</a> : <span>{e.ref || '待補'}</span>}<span> · {dateText(e.at)}</span></div>)}
    {h.revertOf && <p className="goals-caption">回復原紀錄：{h.revertOf}</p>}
  </li>)}</ol>
}
