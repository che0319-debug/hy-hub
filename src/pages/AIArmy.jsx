// AI 軍團：把「我的小幫手」與「專家團」併成同一頁，分頁一層到底。
// 分頁：小幫手／專家團／Skill 庫／AI 派工／能力請求。網址 #/ai-army?tab=…（舊的 /helpers、/expert-team 會導到這裡）。
import { useSearchParams } from 'react-router-dom'
import Helpers from './Helpers'
import ExpertTeam from './ExpertTeam'
import './ai-army.css'

export const ARMY_NAME = 'AI 軍團'
// [網址上的 tab 值, 分頁標題]。experts／skills／models／requests 沿用專家團原本的值。
export const ARMY_TABS = [['helpers', '小幫手'], ['experts', '專家團'], ['skills', 'Skill 庫'], ['models', 'AI 派工'], ['requests', '能力請求']]
const IDS = ARMY_TABS.map(t => t[0])

export default function AIArmy() {
  const [params, setParams] = useSearchParams()
  const tab = IDS.includes(params.get('tab')) ? params.get('tab') : 'helpers'
  const go = id => { const next = new URLSearchParams(params); next.set('tab', id); setParams(next, { replace: true }) }
  return (
    <div className="hy ai-army hy-stack">
      <div className="hy-pagehead">
        <div><h1 className="hy-title">{ARMY_NAME}</h1><p className="hy-lede">你的小幫手與專家：誰在做什麼、做得怎樣。</p></div>
      </div>
      <nav className="hy-tabs" role="tablist" aria-label={ARMY_NAME}>
        {ARMY_TABS.map(([id, label]) => (
          <button key={id} type="button" className="hy-tab" role="tab" aria-current={tab === id ? 'page' : undefined} onClick={() => go(id)}>{label}</button>
        ))}
      </nav>
      {tab === 'helpers' ? <Helpers embedded /> : <ExpertTeam embedded tab={tab} onTab={go} />}
    </div>
  )
}
