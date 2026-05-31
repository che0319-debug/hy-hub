import { useState, useEffect, useCallback } from 'react'
import AgentBoard from '../components/AgentBoard'
import { fetchPersonalData } from '../api'
import { adaptPersonalData } from '../lib/adaptPersonalData'

export default function LineHY() {
  const [boardData, setBoardData] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)

  const fetchData = useCallback(() => {
    fetchPersonalData()
      .then(data => {
        setBoardData(adaptPersonalData(data))
        setError(null)
      })
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function refetch() {
    setBoardData(null)         // 卸載 AgentBoard，清空 useState 一次性初始化
    setVersion(v => v + 1)    // key 變化確保重新掛載
    fetchData()
  }

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
        <AgentBoard
          key={version}
          boardData={boardData}
          botConfig={{ id: "hy", name: "HY" }}
          onMutate={refetch}
        />
      )}
    </div>
  )
}
