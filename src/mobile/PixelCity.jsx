import { useMemo, useState } from 'react'
import { BookOpen, ChevronRight, Hammer, LockKeyhole, ShieldCheck, Sparkles, X } from 'lucide-react'

const DISTRICTS = [
  { id: 'hy', name: 'HY', title: '治理核心', subtitle: '決策・策略・自由', color: '#8b5cf6', x: 106, y: 36 },
  { id: 'family', name: '小因', title: '生活莊園', subtitle: '健康・家庭・關係', color: '#2dd4bf', x: 26, y: 130 },
  { id: '950157', name: '950157', title: '研發中心', subtitle: '技術・系統・創造', color: '#38bdf8', x: 190, y: 130 },
  { id: 'sam', name: 'Sam', title: '商業街區', subtitle: '事業・財務・市場', color: '#fb923c', x: 106, y: 224 },
]

function agentFor(dailyOS, id) {
  const agents = dailyOS?.agents || {}
  return agents[id] || agents[id === 'family' ? '小因' : id] || {}
}

function botFor(state, id) {
  return (state?.bots || []).find(bot => bot.id === id || (id === 'family' && bot.id === '小因')) || {}
}

function buildDistricts(dailyOS, state) {
  const gaps = dailyOS?.reality?.topGaps || []
  const acceptedLearning = Number(dailyOS?.growth?.acceptedLearnings || 0)
  return DISTRICTS.map((district, index) => {
    const agent = agentFor(dailyOS, district.id)
    const bot = botFor(state, district.id)
    const counts = agent.proposals?.counts || {}
    const results = Number(counts.results || 0)
    const work = Number(counts.work || 0)
    const risks = Number(counts.risks || 0)
    const gap = gaps[index % Math.max(1, gaps.length)]
    const gapValue = Number(gap?.gap || 0)
    const proof = results + (district.id === 'hy' ? acceptedLearning : 0)
    const level = Math.max(1, Math.min(5, 1 + Math.floor(proof / 3)))
    const working = bot.status === 'running' || work > 0
    const attention = bot.status === 'attention' || risks > 0
    return { ...district, agent, bot, counts, gap, gapValue, results, work, risks, level, working, attention }
  })
}

function Building({ district, selected, onClick }) {
  const floors = district.level
  const height = 34 + floors * 7
  const bx = district.x + 18
  const by = district.y + 60 - height
  const windows = Array.from({ length: Math.min(8, floors * 2) }, (_, index) => index)
  return (
    <g role="button" tabIndex="0" aria-label={`${district.title}，等級 ${floors}`} onClick={onClick} onKeyDown={event => event.key === 'Enter' && onClick()} className={`pixel-district ${selected ? 'is-selected' : ''}`}>
      <rect className="pixel-lot" x={district.x} y={district.y} width="76" height="70" rx="4" />
      <path className="pixel-lot-edge" d={`M${district.x} ${district.y + 58}l38 19 38-19v12l-38 19-38-19z`} />
      <rect x={bx} y={by} width="40" height={height} fill="#15213d" stroke={district.color} strokeWidth="3" />
      <path d={`M${bx - 5} ${by}l25-14 25 14z`} fill={district.color} />
      {windows.map(index => (
        <rect key={index} x={bx + 7 + (index % 2) * 17} y={by + 9 + Math.floor(index / 2) * 12} width="8" height="6" fill={district.attention ? '#f59e0b' : '#fef08a'} className={district.working ? 'pixel-window-live' : ''} />
      ))}
      <rect x={bx + 16} y={by + height - 13} width="9" height="13" fill="#080e1e" />
      {district.working && <g className="pixel-worker"><rect x={district.x + 57} y={district.y + 45} width="6" height="10" fill="#e2e8f0" /><rect x={district.x + 55} y={district.y + 42} width="10" height="5" fill={district.color} /></g>}
      {district.attention && <g><rect x={district.x + 58} y={district.y + 4} width="16" height="16" rx="2" fill="#f59e0b" /><text x={district.x + 66} y={district.y + 16} textAnchor="middle" className="pixel-alert">!</text></g>}
      <text x={district.x + 38} y={district.y + 102} textAnchor="middle" className="pixel-place-name">{district.name}</text>
      <text x={district.x + 38} y={district.y + 114} textAnchor="middle" className="pixel-place-level">LV.{floors}</text>
    </g>
  )
}

export default function PixelCity({ dailyOS, state }) {
  const [selectedId, setSelectedId] = useState('hy')
  const districts = useMemo(() => buildDistricts(dailyOS, state), [dailyOS, state])
  const selected = districts.find(item => item.id === selectedId) || districts[0]
  const results = districts.reduce((sum, item) => sum + item.results, 0)
  const acceptedLearning = Number(dailyOS?.growth?.acceptedLearnings || 0)
  const worldLevel = Math.max(1, 1 + Math.floor((results + acceptedLearning) / 8))
  const waiting = (dailyOS?.today?.waitingApproval || []).length

  return (
    <div className="pixel-city-page">
      <section className="pixel-world-head">
        <div><span>HY WORLD</span><strong>世界等級 {worldLevel}</strong></div>
        <p><Sparkles size={13} />真實成果讓城市永久成長</p>
      </section>

      <section className="pixel-city-frame" aria-label="HY World 像素城市">
        <div className="pixel-sky"><i /><i /><i /><i /></div>
        <svg viewBox="0 0 292 362" role="img" aria-label="由四個分身街區組成的 HY World">
          <defs>
            <pattern id="world-grid" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M12 0H0V12" fill="none" stroke="#253352" strokeWidth="1" /></pattern>
          </defs>
          <rect width="292" height="350" fill="#0b1327" />
          <rect width="292" height="350" fill="url(#world-grid)" opacity=".55" />
          <path className="pixel-road" d="M144 80v205M65 173h162M65 267h162" />
          <path className="pixel-road-mark" d="M144 84v200M69 173h154M69 267h154" />
          <circle cx="144" cy="173" r="22" fill="#17233d" stroke="#64748b" strokeWidth="2" />
          <circle cx="144" cy="173" r="13" fill="#251b4b" stroke="#a78bfa" strokeWidth="2" />
          <text x="144" y="178" textAnchor="middle" className="pixel-hy-mark">HY</text>
          {districts.map(district => <Building key={district.id} district={district} selected={selectedId === district.id} onClick={() => setSelectedId(district.id)} />)}
          <g opacity=".68"><rect x="12" y="298" width="67" height="38" rx="3" fill="#111c34" stroke="#475569" strokeDasharray="4 3" /><LockKeyhole x="37" y="305" width="15" height="15" color="#94a3b8" /><text x="45" y="330" textAnchor="middle" className="pixel-locked">下一塊土地</text></g>
          <g opacity=".68"><rect x="213" y="298" width="67" height="38" rx="3" fill="#111c34" stroke="#475569" strokeDasharray="4 3" /><LockKeyhole x="238" y="305" width="15" height="15" color="#94a3b8" /><text x="246" y="330" textAnchor="middle" className="pixel-locked">Goal 解鎖</text></g>
        </svg>
        <div className="pixel-map-hint">點街區查看・城市會隨成果擴張</div>
      </section>

      <section className="pixel-district-card" style={{ '--district': selected.color }}>
        <header><div><span>{selected.name} DISTRICT</span><h2>{selected.title}</h2><p>{selected.subtitle}</p></div><b>LV.{selected.level}</b></header>
        <div className="pixel-district-stats">
          <span><strong>{selected.work}</strong>施工中</span><span><strong>{selected.results}</strong>成果</span><span><strong>{selected.risks}</strong>需留意</span>
        </div>
        <div className="pixel-status-line">
          {selected.working ? <><Hammer size={15} />{selected.bot.current || '分身正在推進工作'}</> : selected.attention ? <><ShieldCheck size={15} />等待 HY 決定後再成長</> : <><Sparkles size={15} />街區運作正常</>}
        </div>
        {selected.gap && <div className="pixel-gap"><span>{selected.gap.dimension || selected.gap.name || 'Reality Gap'}<b>差距 {selected.gapValue}</b></span><i><em style={{ width: `${Math.max(4, Math.min(100, 100 - selected.gapValue))}%` }} /></i></div>}
      </section>

      <section className="pixel-growth-ledger">
        <h2>城市升級帳本</h2>
        <div><Hammer size={16} /><span><b>{results} 個成果</b><small>Result 建立施工進度；經 HY 核准影響後永久升級</small></span><ChevronRight size={16} /></div>
        <div><BookOpen size={16} /><span><b>{acceptedLearning} 個已採納學習</b><small>成為街區的工具、設備與能力</small></span><ChevronRight size={16} /></div>
        <div><ShieldCheck size={16} /><span><b>{waiting} 件等待核准</b><small>未核准只顯示藍圖，不計入永久建設</small></span><ChevronRight size={16} /></div>
      </section>

      <p className="pixel-rule"><ShieldCheck size={14} />世界等級只總結進度；點擊、登入與觀看不會讓城市升級。</p>
    </div>
  )
}
