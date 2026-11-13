// AI 軍團：四大核心 Bot，組員排在各自正下方。
// 專家團／Skill 庫／AI 派工／能力請求隨舊 AI Office 引擎下線；舊網址 /expert-team、?tab=… 都導回這一頁。
import Helpers from './Helpers'
import './ai-army.css'

export const ARMY_NAME = 'AI 軍團'

export default function AIArmy() {
  return (
    <div className="hy ai-army hy-stack">
      <div className="hy-pagehead">
        <div><h1 className="hy-title">{ARMY_NAME}</h1><p className="hy-lede">四位核心 Bot，小組成員在各自下面。</p></div>
      </div>
      <Helpers embedded />
    </div>
  )
}
