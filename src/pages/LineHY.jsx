import { useState, useEffect } from 'react'
import AgentBoard from '../components/AgentBoard'
import { fetchPersonalData } from '../api'
import { adaptPersonalData } from '../lib/adaptPersonalData'

export default function LineHY() {
  const [boardData, setBoardData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPersonalData()
      .then(data => setBoardData(adaptPersonalData(data)))
      .catch(err => setError(err.message))
  }, [])

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <span className="inline-block w-3 h-3 rounded-full bg-violet-600" />
        <h1 className="text-xl font-bold text-slate-800">HY</h1>
        <span className="text-slate-400 text-sm font-normal">控制中心</span>
      </div>

      {error && <p className="text-red-500 text-sm">讀取失敗：{error}</p>}
      {!error && !boardData && <p className="text-slate-400 text-sm">載入中…</p>}
      {boardData && (
        <AgentBoard boardData={boardData} botConfig={{ id: "hy", name: "HY" }} />
      )}
    </div>
  )
}
