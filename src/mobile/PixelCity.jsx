import { useMemo, useState } from 'react'
import { ArrowRight, BriefcaseBusiness, Hammer, LockKeyhole, Sparkles } from 'lucide-react'

const DISTRICTS = [
  { id: 'hy', label: 'HY 初始基地', subtitle: '中央・治理・未來', color: '#a78bfa', position: [50, 35] },
  { id: 'family', label: '小因生活莊園', subtitle: '健康・家庭・生活', color: '#5eead4', position: [22, 41] },
  { id: '950157', label: '950157 研發工作坊', subtitle: '研發・創造・實踐', color: '#38bdf8', position: [38, 66] },
  { id: 'sam', label: 'Sam 商業據點', subtitle: '商業・金融・連結', color: '#fb923c', position: [81, 44] },
]

function agentFor(dailyOS, id) {
  const agents = dailyOS?.agents || {}
  return agents[id] || agents[id === 'family' ? '小因' : id] || {}
}

function botFor(state, id) {
  return (state?.bots || []).find(bot => bot.id === id || (id === 'family' && bot.id === '小因')) || {}
}

function districtState(dailyOS, state) {
  const gaps = dailyOS?.reality?.topGaps || []
  return DISTRICTS.map((item, index) => {
    const agent = agentFor(dailyOS, item.id)
    const bot = botFor(state, item.id)
    const counts = agent.proposals?.counts || {}
    const results = Number(counts.results || 0)
    const work = Number(counts.work || 0)
    const risks = Number(counts.risks || 0)
    const gap = gaps[index % Math.max(1, gaps.length)]
    const progress = gap ? Math.max(0, Math.min(100, 100 - Number(gap.gap || 0))) : 0
    const level = Math.max(1, Math.min(12, 1 + Math.floor(results / 3)))
    return { ...item, bot, gap, results, work, risks, progress, level }
  })
}

export default function PixelCity({ dailyOS, state, variant = 'mobile', onOpenDistrict, onOpenWork }) {
  const [selectedId, setSelectedId] = useState('hy')
  const districts = useMemo(() => districtState(dailyOS, state), [dailyOS, state])
  const selected = districts.find(item => item.id === selectedId) || districts[0]
  const totalResults = districts.reduce((sum, item) => sum + item.results, 0)
  const acceptedLearning = Number(dailyOS?.growth?.acceptedLearnings || 0)
  const worldLevel = Math.max(1, 1 + Math.floor((totalResults + acceptedLearning) / 8))
  const nextLevelResults = Math.max(1, 8 - ((totalResults + acceptedLearning) % 8))
  const firstGoal = totalResults === 0
  const active = selected.bot.status === 'running' || selected.work > 0
  const needsHY = selected.bot.status === 'attention' || selected.risks > 0

  return (
    <div className={`world-v2 ${variant === 'desktop' ? 'world-v2-desktop' : ''}`}>
      <header className="world-v2-hud">
        <div><span>🌎</span><p><b>HY WORLD</b><small>WORLD LV.{worldLevel}</small></p></div>
        <p>距離 LV.{worldLevel + 1}<br />還差 {nextLevelResults} 個成果</p>
      </header>
      <div className="world-v2-news"><Sparkles size={14} /><span>{firstGoal ? '第一個 Goal 將解鎖新的可開發土地' : `${selected.label}：${active ? '正在推進工作' : needsHY ? '等待 HY 決定' : '今日運作正常'}`}</span></div>
      <section className="world-v2-map" aria-label="可成長的 HY World 像素城市">
        {districts.map(district => {
          const districtActive = district.bot.status === 'running' || district.work > 0
          const districtNeedsHY = district.bot.status === 'attention' || district.risks > 0
          const motionState = districtActive ? 'is-working' : districtNeedsHY ? 'is-attention' : 'is-idle'
          return (
          <button type="button" key={district.id} className={`world-v2-hotspot ${motionState} ${selectedId === district.id ? 'is-selected' : ''}`} style={{ left: `${district.position[0]}%`, top: `${district.position[1]}%`, '--district': district.color }} onClick={() => setSelectedId(district.id)} aria-label={`查看${district.label}，${districtActive ? '正在工作' : districtNeedsHY ? '等待核准' : '待命中'}`}>
            <i /><span>{district.id === 'hy' ? 'HY' : district.id === 'family' ? '小因' : district.id}<small>{districtActive ? '工作中' : districtNeedsHY ? '等 HY' : '待命'}</small></span>
          </button>
        )})}
        <div className="world-v2-lock"><LockKeyhole size={15} /><span>建立第一個 Goal<br />即可開放</span></div>
      </section>
      <section className="world-v2-sheet" style={{ '--district': selected.color }}>
        <div className="world-v2-handle" />
        <header><div><span>{selected.subtitle}</span><h2>{selected.label}</h2></div><b>LV.{selected.level}</b></header>
        <div className="world-v2-status"><span><Hammer size={14} />{active ? '施工中' : needsHY ? '等待核准' : worldLevel === 1 ? '剛開始' : '正常運作'}</span><strong>Reality Progress <em>{selected.progress}%</em></strong></div>
        <div className="world-v2-progress"><i style={{ width: `${selected.progress}%` }} /></div>
        <p><span>👷</span>{firstGoal ? '下一步：建立第一個 Goal，解鎖新土地' : needsHY ? '下一步：由 HY 核准成果影響後永久升級' : active ? '下一步：完成 Result 並交由 HY 驗收' : '下一步：建立可驗證的現實成果'}</p>
        {(onOpenDistrict || onOpenWork) && <div className="world-v2-actions">
          {onOpenDistrict && <button type="button" onClick={() => onOpenDistrict(selected.id)}>進入{selected.id === 'hy' ? ' HY' : ` ${selected.id === 'family' ? '小因' : selected.id}`}基地<ArrowRight size={15} /></button>}
          {onOpenWork && <button type="button" onClick={onOpenWork}><BriefcaseBusiness size={15} />查看 AI 工作</button>}
        </div>}
      </section>
    </div>
  )
}
