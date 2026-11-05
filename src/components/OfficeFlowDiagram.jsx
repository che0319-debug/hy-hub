import { diagramModel } from '../lib/officeFlow.mjs'

function FlowCell({ item }) {
  const label = [
    item.track && item.track !== item.name ? item.track : '',
    item.name,
    item.stateText,
    item.youText,
    item.idText,
  ].filter(Boolean).join('，')
  return (
    <li className={`of-cell is-${item.state}`} data-s={item.tone} aria-current={item.state === 'on' ? 'step' : undefined} aria-label={label}>
      <b>{item.name}</b>
      <small className="of-state">{item.stateText}</small>
      {item.youText && <small className="of-you">{item.youText}</small>}
      {item.idText && <small className="of-ids">{item.name}：{item.idText}</small>}
    </li>
  )
}

function Arrow() {
  return <li className="of-arrow" aria-hidden="true">→</li>
}

export default function OfficeFlowDiagram({ flow, stage }) {
  if (!flow) return null
  const model = diagramModel(flow, stage)
  const [opened, ...rest] = model.nodes
  const finish = rest[rest.length - 1]
  return (
    <section className="ao-card of-flow" aria-label={model.aria}>
      <h2>專案流程</h2>
      <ol className="of-track">
        <FlowCell item={opened} />
        <Arrow />
        <li className="of-group">
          <ol className="of-row">
            {model.planning.map(item => <FlowCell key={`plan-${item.name}`} item={item} />)}
          </ol>
          {model.planCaption && <p className="of-caption">{model.planCaption}</p>}
        </li>
        <Arrow />
        <li className="of-cycle">
          <ol className="of-row">
            {model.execution.map(item => <FlowCell key={`exec-${item.name}`} item={item} />)}
          </ol>
          <p className="of-loop">核定後回到執行中</p>
          <p className="of-meta">{model.waitingText}</p>
          <p className="of-meta">{model.doneText}</p>
          {model.cancelledText && <p className="of-meta of-cancelled">{model.cancelledText}{model.cancelledIds.length ? `：${model.cancelledIds.join('、')}` : ''}</p>}
        </li>
        <Arrow />
        <FlowCell item={finish} />
      </ol>
    </section>
  )
}
