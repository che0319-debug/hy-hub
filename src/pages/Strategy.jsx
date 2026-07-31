import { useEffect, useState } from 'react'
import { fetchStrategyProjects } from '../api'

const STATUS_MAP = {
  active:  { label: '進行中', cls: 'bg-yellow-100 text-yellow-800' },
  onhold:  { label: '擱置',   cls: 'bg-slate-100 text-slate-500' },
  won:     { label: '已成',   cls: 'bg-green-100 text-green-800' },
  dropped: { label: '放棄',   cls: 'bg-slate-100 text-slate-400' },
}

const DOMAIN_MAP = { hy: 'HY', '950157': '950157', family: '家庭', sam: 'Sam' }

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, cls: 'bg-slate-100 text-slate-500' }
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${s.cls}`}>{s.label}</span>
}

function buildSummary(p) {
  const statusLabel = (STATUS_MAP[p.status] || { label: p.status }).label
  const people = (p.people || [])
    .map(pe => `- ${pe.name}：要${pe.wants}／怕${pe.fears}／驅動${pe.drivenBy}`)
    .join('\n')
  const setup = (p.setup || []).map(s => `- ${s}`).join('\n')
  return [
    `【局】${p.name}（${statusLabel}）`,
    `目標：${p.goal?.success || ''}`,
    `機會成本：${p.goal?.opportunityCost || ''}`,
    `關鍵人：`,
    people,
    `設局：`,
    setup,
    `下一步：${p.execution?.nextStep || ''}`,
  ].join('\n')
}

function DetailView({ project: p, onBack }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(buildSummary(p))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          ← 返回清單
        </button>
        <span className="text-xs text-slate-400 border border-slate-200 rounded px-2 py-0.5">唯讀</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-semibold">{p.name}</h2>
        <StatusBadge status={p.status} />
        {(p.domains || []).map(d => (
          <span key={d} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
            {DOMAIN_MAP[d] || d}
          </span>
        ))}
        {p.keyDate && (
          <span className="text-xs text-slate-500 ml-auto">
            {p.keyDateLabel || '截止'} {p.keyDate}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 目標 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🎯 目標</h3>
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1">成了的定義</div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.goal?.success}</p>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">機會成本</div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{p.goal?.opportunityCost}</p>
          </div>
        </div>

        {/* 執行 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">⚡ 執行</h3>
          <div className="mb-3">
            <div className="text-xs text-slate-400 mb-1">下一步</div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{p.execution?.nextStep}</p>
          </div>
          {p.execution?.linkedLabel && (
            <div>
              <div className="text-xs text-slate-400 mb-1">關聯派工</div>
              {p.execution.linkedDispatchId ? (
                <span className="text-sm text-blue-600 underline cursor-pointer">
                  {p.execution.linkedLabel}
                </span>
              ) : (
                <span className="text-sm text-slate-600">{p.execution.linkedLabel}</span>
              )}
            </div>
          )}
        </div>

        {/* 人性 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">🧠 人性</h3>
          <div className="flex flex-col gap-3">
            {(p.people || []).map((pe, i) => (
              <div key={i} className="border-l-2 border-slate-200 pl-3">
                <div className="text-sm font-medium text-slate-700 mb-1">{pe.name}</div>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <div><span className="font-medium text-slate-600">要：</span>{pe.wants}</div>
                  <div><span className="font-medium text-slate-600">怕：</span>{pe.fears}</div>
                  <div><span className="font-medium text-slate-600">驅動：</span>{pe.drivenBy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 設局 */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-1">🎭 設局</h3>
          <div className="text-xs text-slate-400 mb-3">陽謀優先</div>
          <ul className="flex flex-col gap-2">
            {(p.setup || []).map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="text-slate-400 shrink-0">{i + 1}.</span>
                <span className="whitespace-pre-wrap">{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-slate-800 text-white text-sm rounded hover:bg-slate-700 transition-colors"
        >
          {copied ? '已複製 ✓' : '複製注入摘要'}
        </button>
      </div>
    </div>
  )
}

export default function Strategy() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchStrategyProjects()
      .then(data => {
        setProjects(data.projects || [])
        setLoading(false)
      })
      .catch(err => {
        setLoadError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="text-slate-400 text-sm py-8 text-center">載入中…</div>
  if (loadError) return <div className="text-red-500 text-sm py-8 text-center">載入失敗：{loadError}</div>

  if (selected) {
    return <DetailView project={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">戰略盤</h1>
      <p className="text-xs text-slate-400 mb-6">唯讀 · 要新增或修改請走 GitHub UI</p>

      {projects.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          還沒有局，去 GitHub 新增第一個
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="w-full text-left bg-white border border-slate-200 rounded-lg px-4 py-3 hover:border-slate-400 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-slate-800 text-sm">{p.name}</span>
                <StatusBadge status={p.status} />
                {(p.domains || []).map(d => (
                  <span key={d} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                    {DOMAIN_MAP[d] || d}
                  </span>
                ))}
                {p.keyDate && (
                  <span className="ml-auto text-xs text-slate-400 shrink-0">
                    {p.keyDateLabel || ''} {p.keyDate}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">
                {p.execution?.nextStep || '（尚無下一步）'}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
