import { useEffect, useState } from 'react'
import { Bot, CalendarDays, CheckCircle2, Clock3, FileText, Globe2, Home, Monitor, RefreshCw, ShieldCheck, Trash2 } from 'lucide-react'
import { fetchMobileState, fetchTodaySchedule, setMobileTaskCompleted } from '../api'
import { answerWorkClarification, decideAutonomousPlan, dismissWorkItem, fetchDailyOS, submitWorkFeedback } from '../lifeOSApi'
import { authHeaders } from '../auth'
import PixelCity from './PixelCity'
import './mobile.css'
import './mobile-v2.css'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const TABS = {
  home: { label: '首頁', icon: Home },
  today: { label: '今日', icon: CalendarDays },
  work: { label: 'AI 工作', icon: Bot },
  world: { label: '世界', icon: Globe2 },
}
const ACTIVE = new Set(['queued','running','claimed','in_progress','needs_clarification','waiting_approval'])
const DONE = new Set(['succeeded','completed','done'])

async function fetchContext() {
  const r = await fetch(`${API_BASE}/api/life-os/v1/context`, { headers: authHeaders(), cache: 'no-store' })
  if (!r.ok) throw new Error(`Life OS ${r.status}`)
  return r.json()
}
function ownerLabel(owner) { return ({hy:'HY',family:'小因','950157':'950157',sam:'Sam',codex:'Codex'})[owner] || owner || 'HY' }
function titleOf(x) { return x?.title || x?.name || x?.outcome || '未命名工作' }
function taipeiDate() { return new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date()) }
function artifactLabel(item,index){ return item?.title||item?.name||item?.filename||item?.type||`成果 ${index+1}` }
function artifactUrl(item){ return item?.url||item?.href||item?.downloadUrl||item?.download_url||'' }

export default function MobileAppV2({ onDesktopVersion }) {
  const [tab,setTab] = useState('home')
  const [state,setState] = useState(null)
  const [events,setEvents] = useState([])
  const [daily,setDaily] = useState(null)
  const [core,setCore] = useState(null)
  const [error,setError] = useState('')
  const [busy,setBusy] = useState('')
  const [expanded,setExpanded] = useState('')
  const [drafts,setDrafts] = useState({})

  async function load(){
    setError('')
    const r = await Promise.allSettled([fetchMobileState(),fetchTodaySchedule(),fetchDailyOS(),fetchContext()])
    if(r[0].status==='fulfilled') setState(r[0].value); else setError('Life OS 資料讀取失敗')
    if(r[1].status==='fulfilled') setEvents(r[1].value.events||[])
    if(r[2].status==='fulfilled') setDaily(r[2].value)
    if(r[3].status==='fulfilled') setCore(r[3].value)
  }
  useEffect(()=>{load()},[])

  const work = core?.workItems || []
  const plans = core?.autonomousPlans || []
  const waitingPlans = plans.filter(p=>p.status==='waiting_approval')
  const needsInput = work.filter(w=>w.status==='needs_clarification')
  const active = work.filter(w=>ACTIVE.has(w.status) && w.status!=='needs_clarification')
  const done = work.filter(w=>DONE.has(w.status)).slice().sort((a,b)=>String(b.completedAt||b.updatedAt||'').localeCompare(String(a.completedAt||a.updatedAt||''))).slice(0,8)
  const results = core?.results || []
  const todayOpen = state?.todayTasks?.filter(x=>!x.completed) || []
  const approvals = waitingPlans.length + needsInput.length

  function setDraft(id,value){ setDrafts(current=>({...current,[id]:value})) }
  async function decide(plan,decision){
    setBusy(plan.id)
    try { await decideAutonomousPlan(plan.id,decision); await load() } catch(e){ setError(e.message||'決策寫入失敗') } finally { setBusy('') }
  }
  async function answer(item){
    const value=(drafts[item.id]||'').trim(); if(!value) return
    setBusy(item.id)
    try { await answerWorkClarification(item.id,value); setDraft(item.id,''); await load() } catch(e){ setError(e.message||'補充資料送出失敗') } finally { setBusy('') }
  }
  async function feedback(item){
    const key=`feedback:${item.id}`, value=(drafts[key]||'').trim(); if(!value) return
    setBusy(item.id)
    try { await submitWorkFeedback(item.id,value,`hy-mobile-feedback-${item.id}-${Date.now()}`); setDraft(key,''); setExpanded(''); await load() } catch(e){ setError(e.message||'修改建議送出失敗') } finally { setBusy('') }
  }

  async function removeItem(item){
    if(!window.confirm(`從 AI Work 清單移除「${titleOf(item)}」？成果與學習紀錄會保留。`)) return
    setBusy(item.id)
    try { await dismissWorkItem(item.id); setExpanded(''); await load() } catch(e){ setError(e.message||'移除工作失敗') } finally { setBusy('') }
  }
  async function toggleTask(item,completed){
    setBusy(item.id)
    try { await setMobileTaskCompleted(item.source,item.id,completed); await load() } catch { setError('任務狀態更新失敗') } finally { setBusy('') }
  }

  return <div className="mobile-life-os mobile-v2">
    {tab!=='world' && <header className="mobile-header"><div><p className="mobile-kicker">HY LIFE OS</p><h1>{TABS[tab].label}</h1><p>{taipeiDate()}</p></div><button className="mobile-desktop-switch" onClick={onDesktopVersion}><Monitor size={16}/>完整版</button></header>}
    <main className="mobile-content">
      {error && <div className="mobile-error">{error}</div>}
      {!state && !error && <p className="mobile-empty">載入中…</p>}

      {tab==='home' && state && <>
        <section className="mobile-now"><div className="mobile-section-title"><h2>今天只看這裡</h2><button onClick={load}><RefreshCw size={16}/></button></div>
          <div className="mobile-dashboard-grid"><div className="mobile-metric"><strong>{todayOpen.length}</strong><span>待完成</span></div><div className="mobile-metric is-warning"><strong>{approvals}</strong><span>等你決定</span></div><div className="mobile-metric"><strong>{active.length}</strong><span>AI 工作中</span></div></div>
        </section>
        <section><div className="mobile-section-title"><h2>重點事項</h2><span>{events.length} 個行程</span></div><div className="mobile-card">
          {events.slice(0,3).map((e,i)=><div className="mobile-event" key={i}><time>{e.start||'全天'}</time><strong>{e.title}</strong></div>)}
          {events.length===0 && <p className="mobile-empty">今天沒有行程。</p>}
        </div></section>
        <section><div className="mobile-section-title"><h2>AI 給你的今日建議</h2><ShieldCheck size={17}/></div><div className="mobile-card mobile-compact"><strong>{approvals ? `先處理 ${approvals} 件需要你判斷的 AI 工作，再把注意力留給今天最重要的事。` : active.length ? `HY 正在處理 ${active.length} 件工作，目前不需要你介入。` : '目前沒有需要你介入的 AI 工作，專注完成今天的 Top 3。'}</strong></div></section>
      </>}

      {tab==='today' && state && <>
        <section><div className="mobile-section-title"><h2>今日行程</h2><span>{events.length} 個</span></div><div className="mobile-list">{events.map((e,i)=><div className="mobile-event" key={i}><time>{e.start||'全天'}</time><strong>{e.title}</strong></div>)}{!events.length&&<p className="mobile-empty">今天沒有行程。</p>}</div></section>
        <section><div className="mobile-section-title"><h2>今日任務</h2><span>{state.todayTasks.filter(x=>x.completed).length}/{state.todayTasks.length}</span></div><div className="mobile-list">{state.todayTasks.map(item=><label className={`mobile-task ${item.completed?'is-complete':''}`} key={item.id}><input type="checkbox" checked={item.completed} disabled={busy===item.id} onChange={e=>toggleTask(item,e.target.checked)}/><span><strong>{item.title}</strong><small>{item.sourceLabel}</small></span></label>)}</div></section>
      </>}

      {tab==='work' && <>
        <section><div className="mobile-section-title"><h2>AI 工作中心</h2><span>你給方向・AI 自己做</span></div><div className="mobile-dashboard-grid"><div className="mobile-metric is-warning"><strong>{approvals}</strong><span>等你處理</span></div><div className="mobile-metric"><strong>{active.length}</strong><span>執行中</span></div><div className="mobile-metric"><strong>{done.length}</strong><span>最近完成</span></div></div></section>
        {(waitingPlans.length>0||needsInput.length>0)&&<section><div className="mobile-section-title"><h2>🔴 等你處理</h2><span>{approvals}</span></div><div className="mobile-list">
          {waitingPlans.map(p=><article className="mobile-approval" key={p.id}><span><ShieldCheck size={16}/>{ownerLabel(p.owner)} 準備開始</span><strong>{titleOf(p)}</strong>{p.whyNow&&<small>{p.whyNow}</small>}<div><button disabled={busy===p.id} onClick={()=>decide(p,'approve')}>同意</button><button disabled={busy===p.id} onClick={()=>decide(p,'approve_with_judgment')}>同意＋自行判斷</button><button disabled={busy===p.id} onClick={()=>decide(p,'reject')}>取消</button></div></article>)}
          {needsInput.map(w=><article className="mobile-approval" key={w.id}><span><Clock3 size={16}/>{ownerLabel(w.owner)} 需要補充</span><strong>{titleOf(w)}</strong><small>{w.clarificationQuestion||w.error||'AI 需要你的方向才能繼續。'}</small><textarea value={drafts[w.id]||''} onChange={e=>setDraft(w.id,e.target.value)} placeholder="直接回答，送出後 AI 自動續跑" className="mobile-work-textarea"/><div><button disabled={busy===w.id||!(drafts[w.id]||'').trim()} onClick={()=>answer(w)}>回覆並繼續</button><button disabled={busy===w.id} onClick={()=>removeItem(w)}><Trash2 size={14}/>移除</button></div></article>)}
        </div></section>}
        <section><div className="mobile-section-title"><h2>🟡 AI 正在工作</h2><span>{active.length}</span></div><div className="mobile-list">{active.map(w=><article className="mobile-bot-card" key={w.id}><div className="mobile-bot-head"><i/><span><strong>{titleOf(w)}</strong><small>{ownerLabel(w.owner)}・{w.status}</small></span><Bot size={17}/></div><p>{w.payload?.summary||w.kind||'AI 正在處理這項工作。'}</p><footer>完成後成果會回到這裡</footer></article>)}{!active.length&&<p className="mobile-empty">目前沒有執行中的 AI 工作。</p>}</div></section>
        <section><div className="mobile-section-title"><h2>🟢 最近完成</h2><span>{done.length}</span></div><div className="mobile-list">{done.map(w=>{const r=results.find(x=>x.workItemId===w.id||x.id===w.resultId), arts=r?.artifacts||w.artifacts||[], open=expanded===w.id;return <article className="mobile-bot-card" key={w.id}><div className="mobile-bot-head"><CheckCircle2 size={17}/><span><strong>{titleOf(w)}</strong><small>{ownerLabel(w.owner)}・已完成</small></span></div><p>{r?.outcome||r?.summary||w.result?.summary||'成果已完成並寫回 Life OS。'}</p>{arts.length>0&&<div className="mobile-artifacts">{arts.map((a,i)=>{const url=artifactUrl(a);return url?<a key={i} href={url} target="_blank" rel="noreferrer"><FileText size={14}/>{artifactLabel(a,i)}</a>:<span key={i}><FileText size={14}/>{artifactLabel(a,i)}</span>})}</div>}<div className="mobile-work-actions"><button onClick={()=>setExpanded(open?'':w.id)}>{open?'收合':'查看成果／給建議'}</button><button disabled={busy===w.id} onClick={()=>removeItem(w)}><Trash2 size={14}/>移除</button></div>{open&&<div className="mobile-feedback-box"><textarea value={drafts[`feedback:${w.id}`]||''} onChange={e=>setDraft(`feedback:${w.id}`,e.target.value)} placeholder="告訴 HY 要怎麼改，送出後會建立修訂工作" className="mobile-work-textarea"/><button disabled={busy===w.id||!(drafts[`feedback:${w.id}`]||'').trim()} onClick={()=>feedback(w)}>送出建議並繼續做</button></div>}</article>})}{!done.length&&<p className="mobile-empty">完成的 AI 工作會出現在這裡。</p>}</div></section>
      </>}

      {tab==='world' && state && <PixelCity dailyOS={daily} state={state}/>} 
    </main>
    <nav className="mobile-nav" aria-label="手機版主要分頁">{Object.entries(TABS).map(([id,m])=>{const I=m.icon;return <button key={id} className={tab===id?'is-active':''} onClick={()=>setTab(id)}><I size={20}/><span>{m.label}</span></button>})}</nav>
  </div>
}
