import { useState } from 'react'
import { Link, Trash2, Plus, X } from 'lucide-react'
import { financeData } from '../mock/data'

const INCOME_CATEGORIES = ['本業', '副業', '投資', '被動其他']
const EXPENSE_LAYERS    = ['固定', '家庭', '個人']

function derive(incomeSources, expenses) {
  const totalIncome   = incomeSources.reduce((s, i) => s + i.amount, 0)
  const passiveIncome = incomeSources.filter(i => i.category !== '本業').reduce((s, i) => s + i.amount, 0)
  const totalExpense  = expenses.reduce((s, e) => s + e.amount, 0)
  const cashFlow        = totalIncome - totalExpense
  const passiveCashFlow = passiveIncome - totalExpense
  const coverage        = totalExpense ? (passiveIncome / totalExpense * 100) : 0
  return { totalIncome, passiveIncome, totalExpense, cashFlow, passiveCashFlow, coverage }
}

function fmt(n) {
  return '$' + Math.abs(n).toLocaleString()
}

function sign(n) {
  return n >= 0 ? '+' : '-'
}

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl p-5 flex flex-col gap-2 border border-slate-200 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${color ?? 'text-slate-800'}`}>{value}</div>
    </div>
  )
}

function NorthStarCard({ passiveCashFlow, coverage, passiveIncome, totalExpense }) {
  const positive = passiveCashFlow >= 0
  return (
    <div className={`bg-white rounded-xl p-6 border-2 ${positive ? 'border-green-400' : 'border-red-400'} shadow-sm transition-colors`}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold text-slate-500">北極星：被動現金流</h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">mock · 假數字</span>
      </div>
      <div className={`text-4xl font-bold mt-2 transition-colors ${positive ? 'text-green-600' : 'text-red-500'}`}>
        {sign(passiveCashFlow)}{fmt(passiveCashFlow)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
        <span>
          財務自由覆蓋率{' '}
          <span className={`font-semibold transition-colors ${coverage >= 100 ? 'text-green-600' : 'text-red-500'}`}>
            {coverage.toFixed(1)}%
          </span>
        </span>
        <span className="text-slate-200">|</span>
        <span>被動 {fmt(passiveIncome)} / 花費 {fmt(totalExpense)}</span>
      </div>
    </div>
  )
}

function TrendChart({ trendData }) {
  const maxVal = Math.max(...trendData.flatMap(d => [d.passiveIncome, d.totalExpense]), 1)
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">年度趨勢（被動收入 vs 總花費）</h2>
      <div className="flex items-end gap-1.5" style={{ height: '128px' }}>
        {trendData.map(d => {
          const isCurrent = d.year === financeData.currentYear
          return (
            <div key={d.year} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <div className="flex items-end gap-px w-full" style={{ height: '112px' }}>
                <div
                  className="flex-1 bg-blue-400 rounded-t transition-all duration-300"
                  style={{ height: `${Math.max((d.passiveIncome / maxVal) * 100, 2)}%` }}
                  title={`被動收入 ${fmt(d.passiveIncome)}`}
                />
                <div
                  className="flex-1 bg-slate-300 rounded-t transition-all duration-300"
                  style={{ height: `${Math.max((d.totalExpense / maxVal) * 100, 2)}%` }}
                  title={`總花費 ${fmt(d.totalExpense)}`}
                />
              </div>
              <span className={`text-xs leading-none ${isCurrent ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                {d.year}
              </span>
            </div>
          )
        })}
      </div>
      <div className="flex gap-4 mt-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 bg-blue-400 rounded inline-block" />被動收入
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-2.5 bg-slate-300 rounded inline-block" />總花費
        </span>
      </div>
    </div>
  )
}

// 最簡 inline 輸入行（收入/支出共用基礎樣式）
function AddIncomeForm({ onAdd, onCancel }) {
  const [name,     setName]     = useState('')
  const [amount,   setAmount]   = useState('')
  const [category, setCategory] = useState('副業')

  function submit(e) {
    e.preventDefault()
    const amt = parseInt(amount, 10)
    if (!name.trim() || !amt || amt <= 0) return
    onAdd({
      id:       `inc-${Date.now()}`,
      name:     name.trim(),
      amount:   amt,
      category,
      linkable: category === '副業',
    })
  }

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="名稱"
          className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
        />
        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="金額"
          type="number"
          min="1"
          className="w-24 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
        />
      </div>
      <div className="flex gap-2 items-center">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-white"
        >
          {INCOME_CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          確認
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  )
}

function AddExpenseForm({ onAdd, onCancel }) {
  const [name,   setName]   = useState('')
  const [amount, setAmount] = useState('')
  const [layer,  setLayer]  = useState('固定')

  function submit(e) {
    e.preventDefault()
    const amt = parseInt(amount, 10)
    if (!name.trim() || !amt || amt <= 0) return
    onAdd({ id: `exp-${Date.now()}`, name: name.trim(), amount: amt, layer })
  }

  return (
    <form onSubmit={submit} className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="名稱"
          className="flex-1 min-w-0 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
        />
        <input
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="金額"
          type="number"
          min="1"
          className="w-24 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400"
        />
      </div>
      <div className="flex gap-2 items-center">
        <select
          value={layer}
          onChange={e => setLayer(e.target.value)}
          className="flex-1 text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-blue-400 bg-white"
        >
          {EXPENSE_LAYERS.map(l => <option key={l}>{l}</option>)}
        </select>
        <button
          type="submit"
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          確認
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  )
}

function IncomeList({ incomeSources, totalIncome, onDelete, onAdd }) {
  const [showForm, setShowForm] = useState(false)

  function handleAdd(item) {
    onAdd(item)
    setShowForm(false)
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">收入源</h2>
      <ul className="space-y-1.5">
        {incomeSources.map(inc => (
          <li key={inc.id} className="flex items-center justify-between gap-2 text-sm group">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <span className="text-slate-700 truncate">{inc.name}</span>
              <span className="text-xs text-slate-400 flex-shrink-0 bg-slate-50 px-1.5 py-0.5 rounded">
                {inc.category}
              </span>
              {inc.linkable && (
                <span
                  className="flex items-center gap-0.5 text-xs text-blue-500 flex-shrink-0 bg-blue-50 px-1.5 py-0.5 rounded"
                  title="未來接副業系統"
                >
                  <Link size={9} />🔗 可連動
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-slate-800 font-medium">{fmt(inc.amount)}</span>
              <button
                onClick={() => onDelete(inc.id)}
                className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="刪除"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold">
        <span className="text-slate-600">合計</span>
        <span className="text-slate-800">{fmt(totalIncome)}</span>
      </div>

      {showForm ? (
        <AddIncomeForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-blue-600 py-1.5 border border-dashed border-slate-200 hover:border-blue-300 rounded-lg transition-colors"
        >
          <Plus size={12} />新增收入源
        </button>
      )}
    </div>
  )
}

function ExpenseList({ expenses, totalExpense, onDelete, onAdd }) {
  const [showForm, setShowForm] = useState(false)
  const layers = EXPENSE_LAYERS

  function handleAdd(item) {
    onAdd(item)
    setShowForm(false)
  }

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-700 mb-3">支出（三層）</h2>
      {layers.map(layer => {
        const items = expenses.filter(e => e.layer === layer)
        if (items.length === 0) return null
        const subtotal = items.reduce((s, e) => s + e.amount, 0)
        return (
          <div key={layer} className="mb-3">
            <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">
              <span>{layer}</span>
              <span>{fmt(subtotal)}</span>
            </div>
            {items.map(exp => (
              <div key={exp.id} className="flex items-center justify-between text-sm pl-2 py-0.5 group">
                <span className="text-slate-600">{exp.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-700">{fmt(exp.amount)}</span>
                  <button
                    onClick={() => onDelete(exp.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="刪除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      })}
      <div className="mt-2 pt-3 border-t border-slate-100 flex justify-between text-sm font-semibold">
        <span className="text-slate-600">合計</span>
        <span className="text-slate-800">{fmt(totalExpense)}</span>
      </div>

      {showForm ? (
        <AddExpenseForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-blue-600 py-1.5 border border-dashed border-slate-200 hover:border-blue-300 rounded-lg transition-colors"
        >
          <Plus size={12} />新增支出
        </button>
      )}
    </div>
  )
}

export default function CrossDomain() {
  // state 初始化 copy 自 financeData；重整還原（不持久）
  const [incomeSources, setIncomeSources] = useState(() => [...financeData.incomeSources])
  const [expenses,      setExpenses]      = useState(() => [...financeData.expenses])

  const { totalIncome, passiveIncome, totalExpense, cashFlow, passiveCashFlow, coverage } =
    derive(incomeSources, expenses)

  // 趨勢：history 固定 + 2026 即時推導（隨加減變動）
  const trendData = [
    ...financeData.yearlyHistory,
    { year: financeData.currentYear, passiveIncome, totalExpense },
  ]

  function deleteIncome(id)  { setIncomeSources(prev => prev.filter(i => i.id !== id)) }
  function deleteExpense(id) { setExpenses(prev => prev.filter(e => e.id !== id)) }
  function addIncome(item)   { setIncomeSources(prev => [...prev, item]) }
  function addExpense(item)  { setExpenses(prev => [...prev, item]) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">財務全景</h1>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
          mock · 可加減 · 重整還原
        </span>
      </div>

      <NorthStarCard
        passiveCashFlow={passiveCashFlow}
        coverage={coverage}
        passiveIncome={passiveIncome}
        totalExpense={totalExpense}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="總收入" value={fmt(totalIncome)} />
        <MetricCard label="總花費" value={fmt(totalExpense)} />
        <MetricCard
          label="現金流"
          value={sign(cashFlow) + fmt(cashFlow)}
          color={cashFlow >= 0 ? 'text-green-600' : 'text-red-500'}
        />
        <MetricCard label="被動收入" value={fmt(passiveIncome)} color="text-blue-600" />
      </div>

      <TrendChart trendData={trendData} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IncomeList
          incomeSources={incomeSources}
          totalIncome={totalIncome}
          onDelete={deleteIncome}
          onAdd={addIncome}
        />
        <ExpenseList
          expenses={expenses}
          totalExpense={totalExpense}
          onDelete={deleteExpense}
          onAdd={addExpense}
        />
      </div>
    </div>
  )
}
