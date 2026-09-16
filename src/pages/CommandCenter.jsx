import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Bot, Check, Copy, Focus, Mic, Minus, Plus, Radio, X } from 'lucide-react'
import { followExecution } from '../commandCenterApi'
import { ACTIVE, LABEL, agentGroups, commandDraft, contextText, isStalled } from '../lib/commandCenterModel'
import './command-center.css'

const POS = { hy:[390,25], '950157':[30,345], sam:[750,345], family:[390,655] }
const MOBILE_POS = { hy:[0,0], '950157':[360,0], sam:[0,310], family:[360,310] }
const FALLBACK = [{id:'hy',name:'HY',mission:'總 Agent / Chief Agent'},{id:'950157',name:'950157',mission:'研發與工作'},{id:'sam',name:'Sam',mission:'事業發展'},{id:'family',name:'小因',mission:'家庭與生活'}]
function date(value) { return value ? new Date(value).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Taipei'}) : '未回報' }
function Badge({ w, now }) { return <span className={`cc-badge s-${w.status}`}>{LABEL[w.status] || w.status}{isStalled(w,now) ? ' · 久未更新' : ''}</span> }

export default function CommandCenter() {
  const [data,setData] = useState(null), [connection,setConnection] = useState('connecting'), [error,setError] = useState('')
  const [selection,setSelection] = useState({bot:'hy'}), [panel,setPanel] = useState(''), [command,setCommand] = useState(''), [copied,setCopied] = useState(false)
  const [now,setNow] = useState(Date.now()), [camera,setCamera] = useState({x:0,y:0,z:.6})
  const viewport = useRef(null), gesture = useRef(null), pointers = useRef(new Map()), dataRef = useRef(null), contextRef = useRef(null)
  const mobile = window.matchMedia('(max-width: 767px)').matches
  const positions = mobile ? MOBILE_POS : POS
  const offices = data?.offices || FALLBACK, work = data?.work || []
  const selected = work.find(w=>w.work===selection.work)
  const attention = work.filter(w=>isStalled(w,now)||['waiting','review','failed'].includes(w.status))
  const detailed = camera.z >= .8, executionDetail = camera.z >= (mobile ? 1.1 : 1.35)
  const groups = useMemo(()=>Object.fromEntries(offices.map(o=>[o.id,agentGroups(work.filter(w=>w.bot===o.id))])),[data])
  const context = contextText(selection,offices,work)
  dataRef.current=data; contextRef.current=selection

  useEffect(()=>{
    let stopped=false, controller, timer, attempt=0
    async function connect(){
      if(stopped || document.hidden) return
      controller=new AbortController(); setConnection('connecting')
      try { await followExecution({ signal:controller.signal, onSnapshot:value=>{setData(value);setError('');attempt=0}, onState:setConnection }) }
      catch(e){ if(stopped || controller.signal.aborted) return;setConnection('disconnected');setError(e.message) }
      if(!stopped && !document.hidden) timer=setTimeout(connect,Math.min(30000,1000*2**attempt++))
    }
    const visibility=()=>{ clearTimeout(timer);controller?.abort(); if(document.hidden)setConnection('paused');else connect() }
    connect();document.addEventListener('visibilitychange',visibility)
    return ()=>{stopped=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility)}
  },[])
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[])

  const fit = useCallback(()=>{
    const r=viewport.current?.getBoundingClientRect();if(!r)return
    const small=window.matchMedia('(max-width: 767px)').matches, width=small?680:1100,height=small?590:940
    const z=Math.min((r.width-28)/width,(r.height-28)/height, .8)
    setCamera({x:(r.width-width*z)/2,y:(r.height-height*z)/2,z})
  },[])
  useEffect(()=>{fit();const observer=new ResizeObserver(fit);if(viewport.current)observer.observe(viewport.current);return()=>observer.disconnect()},[fit])
  function focusOffice(id, z=1.02){
    const r=viewport.current.getBoundingClientRect(),[x,y]=positions[id]
    setCamera({z,x:r.width/2-(x+160)*z,y:r.height/2-(y+130)*z})
  }
  function selectWork(w){setSelection({bot:w.bot,agent:w.agent,agent_name:w.agent_name,project:w.project,work:w.work});focusOffice(w.bot,mobile?1.12:1.45);setPanel('')}
  function zoom(factor,cx,cy){
    const r=viewport.current.getBoundingClientRect(),px=cx??r.width/2,py=cy??r.height/2
    setCamera(c=>{const z=Math.max(.2,Math.min(2.3,c.z*factor));return {z,x:px-(px-c.x)*z/c.z,y:py-(py-c.y)*z/c.z}})
  }
  useEffect(()=>{
    const el=viewport.current
    const wheel=e=>{e.preventDefault();const r=el.getBoundingClientRect();zoom(Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top)}
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel)
  },[])
  function pointerDown(e){
    if(e.target.closest('button,a,input,textarea,.cc-desks'))return
    e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
    const ps=[...pointers.current.values()]
    gesture.current={camera,points:ps, distance:ps.length===2?Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y):0}
  }
  function pointerMove(e){
    if(!pointers.current.has(e.pointerId)||!gesture.current)return
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY})
    const ps=[...pointers.current.values()],g=gesture.current,r=viewport.current.getBoundingClientRect()
    if(ps.length===1 && g.points.length===1)setCamera({...g.camera,x:g.camera.x+ps[0].x-g.points[0].x,y:g.camera.y+ps[0].y-g.points[0].y})
    if(ps.length===2 && g.distance){
      const z=Math.max(.2,Math.min(2.3,g.camera.z*Math.hypot(ps[1].x-ps[0].x,ps[1].y-ps[0].y)/g.distance))
      const old={x:(g.points[0].x+g.points[1].x)/2-r.left,y:(g.points[0].y+g.points[1].y)/2-r.top},next={x:(ps[0].x+ps[1].x)/2-r.left,y:(ps[0].y+ps[1].y)/2-r.top}
      setCamera({z,x:next.x-(old.x-g.camera.x)*z/g.camera.z,y:next.y-(old.y-g.camera.y)*z/g.camera.z})
    }
  }
  function pointerUp(e){pointers.current.delete(e.pointerId);gesture.current=null;if(!pointers.current.size)return;gesture.current={camera,points:[...pointers.current.values()],distance:0}}

  // Versioned, read-only seam for a future Desktop adapter. No automatic tools,
  // credentials, implicit commands or claim/complete operations are exposed.
  useEffect(()=>{
    const api=Object.freeze({version:1,getContext:()=>({...contextRef.current}),getSnapshot:()=>structuredClone(dataRef.current),capabilities:['read_context','read_execution']})
    window.hyCommandCenter=api
    return()=>{if(window.hyCommandCenter===api)delete window.hyCommandCenter}
  },[])
  async function copyCommand(){
    if(!command.trim())return
    try{await navigator.clipboard.writeText(commandDraft(selection,offices,work,command));setCopied(true)}catch{setError('無法自動複製，請長按下方文字複製')}
  }
  useEffect(()=>setCopied(false),[command,selection])

  const brief = <>
    <div className="cc-panel-heading"><div><small>TEAM OVERVIEW</small><h2>AI Brief</h2></div><button className="cc-mobile-only" onClick={()=>setPanel('')} aria-label="關閉"><X size={20}/></button></div>
    <div className="cc-brief-metrics"><div><b>{data ? work.filter(w=>ACTIVE.has(w.status)&&!isStalled(w,now)).length : '—'}</b><span>執行狀態</span></div><div><b>{data?attention.length:'—'}</b><span>需要留意</span></div></div>
    <h3>四個 Office</h3>
    {offices.map(o=><button key={o.id} className={`cc-bot-row ${selection.bot===o.id?'selected':''}`} onClick={()=>{setSelection({bot:o.id});focusOffice(o.id);setPanel('')}}><span className={`cc-avatar a-${o.id}`}>{o.name==='小因'?'因':o.name==='950157'?'研':o.name.slice(0,2)}</span><span><b>{o.name} Office</b><small>{data ? `${work.filter(w=>w.bot===o.id).length} 項工作` : '等待資料'}</small></span><ArrowUpRight size={15}/></button>)}
    <h3>HY 巡查</h3><p className="cc-muted">執行、等待與驗收；不含個人待辦。</p>
    {attention.map(w=><button key={w.work} className="cc-alert" onClick={()=>selectWork(w)}><Badge w={w} now={now}/><b>{w.title}</b><small>{date(w.updated_at)} 更新{w.waiting_for?' · 等待 '+w.waiting_for:''}</small></button>)}
    {data&&!attention.length&&<p className="cc-muted">目前沒有需要介入的工作。</p>}
    {(data?.proposals||[]).map(p=><Link key={p.id} to="/dispatch" className="cc-alert"><span className="cc-badge s-review">待決策</span><b>{p.title}</b></Link>)}
    <h3>System Improvement</h3>
    {(data?.system_improvements||[]).map(s=><div key={s.id} className="cc-suggestion"><b>{s.title}</b><p>{s.detail}</p><small>建議・待 HY 核准</small></div>)}
    {data&&!data.system_improvements?.length&&<p className="cc-muted">目前沒有規則巡查建議。</p>}
  </>
  const activity = <>
    <div className="cc-panel-heading"><div><small>EXECUTION STREAM</small><h2>Live Activity</h2></div><button className="cc-mobile-only" onClick={()=>setPanel('')} aria-label="關閉"><X size={20}/></button><Radio size={17}/></div>
    <p className="cc-muted">後端實際回報 · 台北時間</p>
    <div className="cc-stream-filter"><button className={!selection.filter?'active':''} onClick={()=>setSelection(s=>({...s,filter:false}))}>全部</button><button className={selection.filter?'active':''} onClick={()=>setSelection(s=>({...s,filter:true}))}>{offices.find(o=>o.id===selection.bot)?.name}</button></div>
    {data&&!data.events.length&&<div className="cc-empty"><Radio size={26}/><b>尚無執行事件</b><p>舊工作狀態可查看；部署後的活動回報會出現在這裡。</p></div>}
    {[...(data?.events||[])].reverse().filter(e=>!selection.filter||e.data.bot===selection.bot).map(e=><button className="cc-event" key={e.id} onClick={()=>{const w=work.find(w=>w.work===e.data.work);if(w)selectWork(w)}}><time>{date(e.occurredAt)}</time><b>{offices.find(o=>o.id===e.data.bot)?.name || e.data.bot} / {e.data.agent_name || '未標示 Agent'}</b><span>{e.data.current_activity||LABEL[e.data.status]||e.data.status}</span><small>{e.data.title}</small><Badge w={e.data} now={NaN}/></button>)}
  </>
  return <div className="cc-root">
    <header className="cc-header"><Link to="/" aria-label="返回 HY Life OS"><ArrowLeft size={20}/></Link><div><small>HY LIFE OS</small><h1>AI Command Center <em>V1</em></h1></div><span className={`cc-connection ${connection==='live'?'live':''}`}><i/>{({live:'已連線',connecting:'連線中',disconnected:'已斷線',stale:'資料同步異常',paused:'已暫停'})[connection]}</span><Link className="cc-work-link" to="/dispatch">AI 工作 <ArrowUpRight size={15}/></Link></header>
    <div className="cc-mobile-tabs"><button onClick={()=>setPanel(panel==='brief'?'':'brief')}>AI Brief <b>{attention.length}</b></button><button className={!panel?'active':''} onClick={()=>setPanel('')}>Office World</button><button onClick={()=>setPanel(panel==='activity'?'':'activity')}>Live Activity <b>{data?.events.length||0}</b></button></div>
    <div className="cc-body"><aside className={`cc-panel cc-left ${panel==='brief'?'open':''}`}>{brief}</aside>
      <section className="cc-world-section">
        <div className="cc-world-title"><span>OFFICE WORLD</span><small>{executionDetail?'執行細節':detailed?'Agent 與工作':'團隊全景'}</small></div>
        {(error||connection==='stale')&&<div className="cc-error" role="status">{error||'同步失敗；目前顯示最後收到的資料。'}</div>}
        <div ref={viewport} className="cc-viewport" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
          <div className={`cc-world ${!detailed?'cc-overview':''}`} style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.z})`}}>
            <svg className="cc-connections" width="1100" height="940" aria-hidden="true"><path d={mobile?"M320 130 H360 M160 260 V310 M520 260 V310":"M550 285 V310 H190 V345 M550 310 H910 V345 M550 310 V655"}/></svg>
            {offices.map(o=>{
              const ow=work.filter(w=>w.bot===o.id),[x,y]=positions[o.id], visible=camera.x+(x+320)*camera.z>0&&camera.y+(y+270)*camera.z>0&&camera.x+x*camera.z<(viewport.current?.clientWidth||2000)&&camera.y+y*camera.z<(viewport.current?.clientHeight||1200)
              return <article key={o.id} style={{left:x,top:y}} className={`cc-office office-${o.id} ${selection.bot===o.id?'selected':''}`}>
                <button className="cc-office-heading" onClick={()=>{setSelection({bot:o.id});focusOffice(o.id)}}><span className={`cc-avatar a-${o.id}`}><Bot size={24}/></span><span><small>{o.id==='hy'?'CHIEF AGENT':o.id==='950157'?'RESEARCH & WORK':o.id==='sam'?'BUSINESS DEVELOPMENT':'FAMILY & LIFE'}</small><h2>{o.name} Office</h2></span><ArrowUpRight size={18}/></button>
                {!detailed||!visible?<><p className="cc-office-mission">{o.id==='hy'?'團隊協調・狀態巡查・改善建議':o.mission}</p><div className="cc-office-summary"><b>{data?ow.length:'—'}<small>AI Work</small></b><b>{data?groups[o.id].filter(g=>g.assigned).length:'—'}<small>已識別 Agent</small></b><span>{data?(ow.some(w=>isStalled(w,now))?'久未更新':ow.some(w=>ACTIVE.has(w.status))?'有執行工作':ow.length?'查看工作':'idle · 閒置'):'等待連線'}</span></div></>:<div className="cc-desks">
                  {!ow.length&&<div className="cc-empty"><Bot size={28}/><b>{data?'目前沒有 AI Work':'等待真實資料'}</b><p>{o.id==='hy'?'HY 持續呈現團隊巡查結果於 AI Brief。':'新工作與 Agent 回報會顯示於此。'}</p></div>}
                  {(groups[o.id]||[]).map(g=><section key={g.id} className="cc-desk"><button className="cc-agent-name" onClick={()=>setSelection({bot:o.id,agent:g.assigned?g.id:null,agent_name:g.name})}><Bot size={16}/>{g.name}<small>{g.work.length} 工作</small></button>{g.work.map(w=><div key={w.work} className={`cc-work ${selection.work===w.work?'chosen':''}`}><button className="cc-project-button" onClick={()=>setSelection({bot:w.bot,agent:w.agent,agent_name:w.agent_name,project:w.project,project_name:w.project_name})}>{w.project_name||'未指定 Project'}</button><button onClick={()=>selectWork(w)}><strong>{w.title}</strong><Badge w={w} now={now}/></button>{executionDetail&&selection.work===w.work&&<dl className="cc-detail"><dt>Stage</dt><dd>{w.stage||'未回報'}</dd><dt>目前活動</dt><dd>{w.current_activity||'尚無活動回報'}</dd><dt>最後更新</dt><dd>{date(w.updated_at)}</dd><dt>等待對象</dt><dd>{w.waiting_for||'未回報'}</dd><dt>Lifecycle</dt><dd>{w.lifecycle_status}</dd><dt>Execution</dt><dd>{w.status}</dd><dt>Work ID</dt><dd>{w.work}</dd>{w.run_id&&<><dt>Run ID</dt><dd>{w.run_id}</dd></>}<dt>成果／驗收</dt><dd><Link to="/dispatch">開啟既有 AI 工作中心 ↗</Link></dd></dl>}</div>)}</section>)}
                </div>}
              </article>
            })}
          </div>
        </div>
        <div className="cc-map-tools"><button onClick={()=>zoom(.8)} aria-label="縮小"><Minus size={18}/></button><span>{Math.round(camera.z*100)}%</span><button onClick={()=>zoom(1.25)} aria-label="放大"><Plus size={18}/></button><button onClick={fit} aria-label="全景"><Focus size={18}/></button></div>
        <div className="cc-map-hint">拖曳平移 · 雙指縮放 · 點選 Office 聚焦</div>
      </section><aside className={`cc-panel cc-right ${panel==='activity'?'open':''}`}>{activity}</aside>
    </div>
    <footer className="cc-command"><div className="cc-command-context"><span>COMMAND CONTEXT</span><b>對 {context} 說……</b>{selected&&<small>{LABEL[selected.status]}</small>}</div><div className="cc-command-input"><a className="cc-voice" href="https://chatgpt.com/" target="_blank" rel="noreferrer" aria-label="開啟 ChatGPT，使用 App 語音"><Mic size={22}/></a><input aria-label="指令" value={command} onChange={e=>setCommand(e.target.value)} placeholder="輸入指令，複製後交給 ChatGPT…"/><button className="cc-copy" disabled={!command.trim()} onClick={copyCommand}>{copied?<Check size={17}/>:<Copy size={17}/>}<span>{copied?'已複製':'複製指令'}</span></button><a className="cc-chatgpt" href="https://chatgpt.com/" target="_blank" rel="noreferrer">ChatGPT <ArrowUpRight size={16}/></a></div><p>{copied?'已包含選取的 Bot／Agent／Project／Work ID；請到 ChatGPT 貼上。':'語音由 ChatGPT App 提供；此列不會自行送出或執行指令。'}</p>{error.startsWith('無法自動複製')&&<textarea readOnly value={commandDraft(selection,offices,work,command)}/>}</footer>
  </div>
}
