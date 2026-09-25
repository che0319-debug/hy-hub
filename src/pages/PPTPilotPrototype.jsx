import { useState } from 'react'
import { Link } from 'react-router-dom'
import { makeOutline, reviewSlides } from '../lib/pptPilot'

export default function PPTPilotPrototype() {
  const [topic, setTopic] = useState('PPT AI Tool MVP')
  const [slides, setSlides] = useState(() => makeOutline('PPT AI Tool MVP'))
  const [reviewed, setReviewed] = useState(false)
  const [active, setActive] = useState(0)
  const issues = reviewed ? reviewSlides(slides) : []
  function edit(index, field, value) {
    setSlides(rows => rows.map((row, i) => i === index ? { ...row, [field]: value } : row))
    setReviewed(false)
  }
  return <div className="mx-auto max-w-6xl space-y-6 text-slate-800">
    <Link to="/ai-work-test" className="text-sm text-blue-700">← 返回 AI Work Test</Link>
    <div><h1 className="text-3xl font-semibold">PPT AI Tool｜隔離測試原型</h1><p className="mt-2 text-sm text-slate-500">簡報規劃 → 審查 → 製作。資料只存在目前頁面，不連接正式 PPT Studio。</p></div>
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-4 rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">1. 規劃</h2><label className="block text-sm">簡報主題<input value={topic} onChange={e => setTopic(e.target.value)} className="mt-2 w-full rounded-lg border p-3"/></label><button onClick={() => { setSlides(makeOutline(topic)); setReviewed(false); setActive(0) }} className="rounded-lg bg-blue-600 px-4 py-2 text-white">產生三頁大綱</button>{slides.map((slide, i) => <div key={i} className="rounded-xl border p-4"><b>第 {i + 1} 頁</b><input aria-label={`第 ${i + 1} 頁標題`} value={slide.title} onChange={e => edit(i, 'title', e.target.value)} className="mt-2 w-full rounded border p-2"/><textarea aria-label={`第 ${i + 1} 頁內容`} value={slide.body} onChange={e => edit(i, 'body', e.target.value)} className="mt-2 min-h-20 w-full rounded border p-2" placeholder="輸入關鍵資料"/></div>)}</section>
      <div className="space-y-5"><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">2. 審查</h2><p className="mt-2 text-sm text-slate-500">首次大綱刻意留空第 2 頁內容，用來驗證失敗 → 修正 → 重測。</p><button onClick={() => setReviewed(true)} className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-white">執行審查／重新測試</button>{reviewed && (issues.length ? <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-4"><b>發現 {issues.length} 項問題</b>{issues.map((item, i) => <p key={i} className="mt-2">第 {item.slide} 頁：{item.issue}。建議：{item.suggestion}</p>)}</div> : <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-4 text-emerald-800">審查通過：所有頁面都有標題與內容。</p>)}</section><section className="rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">3. 簡報製作預覽</h2><div className="my-4 flex gap-2">{slides.map((_, i) => <button key={i} onClick={() => setActive(i)} className={`rounded-lg px-3 py-2 text-sm ${active === i ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>第 {i + 1} 頁</button>)}</div><div className="flex min-h-52 flex-col justify-center rounded-xl bg-slate-900 p-7 text-white"><h3 className="text-2xl font-semibold">{slides[active]?.title || '尚未填寫標題'}</h3><p className="mt-5 text-slate-200">{slides[active]?.body || '尚未填寫內容'}</p></div></section></div>
    </div>
  </div>
}
