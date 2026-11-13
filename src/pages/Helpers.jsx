import { useWorldInfo } from '../life-island/useWorldInfo'
import { useBotRoster } from '../life-island/useBotRoster'
import BotRosterCards from '../components/BotRosterCards'
import MemoryCenter from './MemoryCenter'

// 我的小幫手：四大核心與各自組員的狀態。資料與 HY Life 島共用，見 useBotRoster。
// 記憶區留在卡片下面，內容與分隔都不在這裡改。
export default function Helpers({ embedded = false } = {}) {
  const info = useWorldInfo()
  const roster = useBotRoster(info)
  return (
    <div>
      {embedded ? (
        <p className="mb-4 text-sm text-slate-400">Bot 狀態、專案、待辦與記憶</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">我的小幫手</h1>
          </div>
          <div className="mb-4 ml-5 flex items-center gap-3"><p className="text-sm text-slate-400">Bot 狀態、專案、待辦與記憶</p></div>
        </>
      )}

      <BotRosterCards roster={roster} />

      <div className="mt-8 border-t border-slate-200 pt-6">
        <MemoryCenter embedded />
      </div>
    </div>
  )
}
