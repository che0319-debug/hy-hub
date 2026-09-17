import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Bot, Check, Copy, Focus, Mic, Minus, Plus, Radio, X } from 'lucide-react'
import { followExecution, readExecutionFallback } from '../commandCenterApi'
import { ACTIVE, LABEL, agentGroups, commandDraft, contextText, isStalled, legacySnapshot } from '../lib/commandCenterModel'
import './command-center.css'
import Headquarters from '../components/commandCenter/Headquarters'
import { canTravel } from '../lib/officeRoutes'
import './office-world.css'

const POS = { hy:[315,-55], '950157':[0,120], sam:[660,120], family:[315,395] }
const MOBILE_POS = POS
const FALLBACK = [{id:'hy',name:'HY',mission:'總 Agent / Chief Agent'},{id:'950157',name:'950157',mission:'研發與工作'},{id:'sam',name:'Sam',mission:'事業發展'},{id:'family',name:'小因',mission:'家庭與生活'}]
function date(value) { return value ? new Date(value).toLocaleString('zh-TW',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Taipei'}) : '未回報' }
function Badge({ w, now }) { return <span className={`cc-badge s-${w.status}`}>{LABEL[w.status] || w.status}{isStalled(w,now) ? ' · 久未更新' : ''}</span> }

export default function CommandCenter() {
  const [data,setData] = useState(null), [connection,setConnection] = useState('connecting'), [error,setError] = useState('')
  const [selection,setSelection] = useState({bot:'hy'}), [panel,setPanel] = useState(''), [command,setCommand] = useState(''), [copied,setCopied] = useState(false)
  const [travelOpen,setTravelOpen]=useState(false),[viewportHeight,setViewportHeight]=useState(null)
  const [travelRequest,setTravelRequest]=useState(null),[travelMessage,setTravelMessage]=useState('角色移動不代表工作進度'),[destination,setDestination]=useState('hy'),[roaming,setRoaming]=useState(false)
  const [now,setNow] = useState(Date.now()), [camera,setCamera] = useState({x:0,y:0,z:.6})
  const viewport = useRef(null), gesture = useRef(null), pointers = useRef(new Map()), dataRef = useRef(null), contextRef = useRef(null)
  const [mobile,setMobile] = useState(()=>window.matchMedia('(max-width: 767px)').matches)
  useEffect(()=>{const media=window.matchMedia('(max-width: 767px)');const change=()=>setMobile(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change)},[])
  useEffect(()=>{
    const visual=window.visualViewport
    if(!visual)return
    const resize=()=>setViewportHeight(visual.height)
    resize();visual.addEventListener('resize',resize)
    return()=>visual.removeEventListener('resize',resize)
  },[])
  const positions = mobile ? MOBILE_POS : POS
  const offices = data?.offices || FALLBACK, work = data?.work || []
  const selected = work.find(w=>w.work===selection.work)
  const attention = work.filter(w=>isStalled(w,now)||['waiting','review','failed'].includes(w.status))
  const detailed = camera.z >= (mobile ? .5 : .78), executionDetail = detailed && Boolean(selection.work)
  const groups = useMemo(()=>Object.fromEntries(offices.map(o=>[o.id,agentGroups(work.filter(w=>w.bot===o.id))])),[data])
  const context = contextText(selection,offices,work)
  dataRef.current=data; contextRef.current=selection

  useEffect(()=>{
    let stopped=false, controller, timer, attempt=0
    async function connect(){
      if(stopped || document.hidden) return
      controller=new AbortController(); setConnection('connecting')
      try { await followExecution({ signal:controller.signal, onSnapshot:value=>{setData(value);setError('');attempt=0}, onState:setConnection }) }
      catch(e){
        if(stopped || controller.signal.aborted) return
        setConnection('disconnected');setError(e.message)
        try {
          const core=await readExecutionFallback(controller.signal)
          if(stopped || controller.signal.aborted)return
          setData(legacySnapshot(core,FALLBACK));setConnection('snapshot')
          setError('即時串流尚未連線；目前顯示既有後端的狀態快照。')
        } catch { /* Preserve last known data and the original connection error. */ }
      }
      if(!stopped && !document.hidden) timer=setTimeout(connect,Math.min(30000,1000*2**attempt++))
    }
    const visibility=()=>{ clearTimeout(timer);controller?.abort(); if(document.hidden)setConnection('paused');else connect() }
    connect();document.addEventListener('visibilitychange',visibility)
    return ()=>{stopped=true;clearTimeout(timer);controller?.abort();document.removeEventListener('visibilitychange',visibility)}
  },[])
  useEffect(()=>{const id=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(id)},[])

  const fit = useCallback(()=>{
    const r=viewport.current?.getBoundingClientRect();if(!r)return
    const width=1150,height=863
    const z=Math.min((r.width-28)/width,(r.height-28)/height, .8)
    setCamera({x:(r.width-width*z)/2,y:(r.height-height*z)/2,z})
  },[])
  useEffect(()=>{fit();const observer=new ResizeObserver(fit);if(viewport.current)observer.observe(viewport.current);return()=>observer.disconnect()},[fit])
  function focusOffice(id, z=mobile?.68:1.05){
    const r=viewport.current.getBoundingClientRect(),[x,y]=positions[id]
    setCamera({z,x:r.width*(mobile?.5:.40)-(x+260)*z,y:r.height*(mobile?.30:.45)-(y+235)*z})
  }
  function selectWork(w){setSelection({bot:w.bot,agent:w.agent,agent_name:w.agent_name,project:w.project,work:w.work,inspect:true});focusOffice(w.bot);setPanel('')}
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
    {offices.map(o=><button key={o.id} className={`cc-bot-row ${selection.bot===o.id?'selected':''}`} onClick={()=>{setSelection({bot:o.id,inspect:true});focusOffice(o.id);setPanel('')}}><span className={`cc-avatar a-${o.id}`}>{o.name==='小因'?'因':o.name==='950157'?'研':o.name.slice(0,2)}</span><span><b>{o.name} Office</b><small>{data ? `${work.filter(w=>w.bot===o.id).length} 項工作` : '等待資料'}</small></span><ArrowUpRight size={15}/></button>)}
    <h3>HY 巡查</h3><p className="cc-muted">執行、等待與驗收；不含個人待辦。</p>
    {attention.map(w=><button key={w.work} className="cc-alert" onClick={()=>selectWork(w)}><Badge w={w} now={now}/><b>{w.title}</b><small>{date(w.updated_at)} 更新{w.waiting_for?' · 等待 '+w.waiting_for:''}</small></button>)}
    {data&&!attention.length&&<p className="cc-muted">目前沒有需要介入的工作。</p>}
    {(data?.proposals||[]).map(p=><Link key={p.id} to="/dispatch" className="cc-alert"><span className="cc-badge s-review">待決策</span><b>{p.title}</b></Link>)}
    <h3>System Improvement</h3>
    {(data?.system_improvements||[]).map(s=><div key={s.id} className="cc-suggestion"><b>{s.title}</b><p>{s.detail}</p><small>建議・待 HY 核准</small></div>)}
    {data&&!data.system_improvements?.length&&<p className="cc-muted">{connection==='snapshot'?'等待即時服務恢復後取得巡查建議。':'目前沒有規則巡查建議。'}</p>}
  </>
  const activity = <>
    <div className="cc-panel-heading"><div><small>EXECUTION STREAM</small><h2>Live Activity</h2></div><button className="cc-mobile-only" onClick={()=>setPanel('')} aria-label="關閉"><X size={20}/></button><Radio size={17}/></div>
    <p className="cc-muted">後端實際回報 · 台北時間</p>
    <div className="cc-stream-filter"><button className={!selection.filter?'active':''} onClick={()=>setSelection(s=>({...s,filter:false}))}>全部</button><button className={selection.filter?'active':''} onClick={()=>setSelection(s=>({...s,filter:true}))}>{offices.find(o=>o.id===selection.bot)?.name}</button></div>
    {data&&!data.events.length&&<div className="cc-empty"><Radio size={26}/><b>{connection==='snapshot'?'事件串流尚未連線':'尚無執行事件'}</b><p>舊工作狀態可查看；連線後的活動回報會出現在這裡。</p></div>}
    {[...(data?.events||[])].reverse().filter(e=>!selection.filter||e.data.bot===selection.bot).map(e=><button className="cc-event" key={e.id} onClick={()=>{const w=work.find(w=>w.work===e.data.work);if(w)selectWork(w)}}><time>{date(e.occurredAt)}</time><b>{offices.find(o=>o.id===e.data.bot)?.name || e.data.bot} / {e.data.agent_name || '未標示 Agent'}</b><span>{e.data.current_activity||LABEL[e.data.status]||e.data.status}</span>{e.data.handoff&&<small>交接：{e.data.handoff.from_bot} → {e.data.handoff.to_bot}</small>}<small>{e.data.title}</small><Badge w={e.data} now={NaN}/></button>)}
  </>
  return <div className={`cc-root cc-style-a ${connection!=='live'?'cc-motion-paused':''}`} style={mobile&&viewportHeight?{height:viewportHeight}:undefined}>
    <header className="cc-header"><Link to="/" aria-label="返回 HY Life OS"><ArrowLeft size={20}/></Link><div><small>HY LIFE OS</small><h1>AI Command Center <em>V1</em></h1></div><span className={`cc-connection ${connection==='live'?'live':''}`}><i/>{({live:'已連線',connecting:'連線中',disconnected:'已斷線',stale:'資料同步異常',paused:'已暫停',snapshot:'快照・非即時'})[connection]}</span><Link className="cc-work-link" to="/dispatch">AI 工作 <ArrowUpRight size={15}/></Link></header>
    <div className="cc-mobile-tabs"><button onClick={()=>setPanel(panel==='brief'?'':'brief')}>AI Brief <b>{attention.length}</b></button><button className={!panel?'active':''} onClick={()=>setPanel('')}>Office World</button><button onClick={()=>setPanel(panel==='activity'?'':'activity')}>Live Activity <b>{data?.events.length||0}</b></button></div>
    <div className="cc-body"><aside className={`cc-panel cc-left ${panel==='brief'?'open':''}`}>{brief}</aside>
      <section className="cc-world-section">
        <div className="cc-world-title"><span>AI OFFICE · HEADQUARTERS</span><small>{executionDetail?'執行細節':detailed?'Agent 與工作':'團隊全景'}</small></div>
        {(error||connection==='stale')&&<div className="cc-error" role="status">{error||'同步失敗；目前顯示最後收到的資料。'}</div>}
        <div ref={viewport} className="cc-viewport" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
          <div className={`cc-world ${!detailed?'cc-overview':''}`} style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.z})`}}>
            <Headquarters offices={offices} work={work} groups={groups} events={data?.events} connection={connection} now={now} detailed={detailed} selection={selection} travelRequest={travelRequest} roaming={roaming} onTravelState={setTravelMessage}
              onOffice={id=>{setTravelOpen(false);setSelection({bot:id,inspect:true});focusOffice(id)}}
              onAgent={(id,g)=>setSelection({bot:id,agent:g.assigned?g.id:null,agent_name:g.assigned?g.name:null,unassigned:!g.assigned,inspect:true})}/>

          </div>
        </div>
        <button className="cc-mobile-only cc-travel-toggle" aria-expanded={travelOpen} onClick={()=>{setTravelOpen(v=>!v);setSelection(s=>({...s,inspect:false}))}}>空間移動 {travelOpen?'−':'+'}</button>
        {(!mobile||travelOpen)&&<div className="cc-travel-bar"><div><b>{offices.find(o=>o.id===selection.bot)?.name} · 空間移動</b><label><input type="checkbox" checked={roaming} onChange={e=>setRoaming(e.target.checked)}/>閒置散步</label></div><div><select aria-label="移動目的地" value={destination} onChange={e=>setDestination(e.target.value)}>{offices.map(o=><option key={o.id} value={o.id}>{o.name} Office</option>)}</select><button disabled={!canTravel(work.filter(w=>w.bot===selection.bot),connection)} onClick={()=>{setTravelRequest({bot:selection.bot,destination,id:Date.now()});fit();setSelection(s=>({...s,inspect:false}))}}>前往</button></div><p role="status">{!canTravel(work.filter(w=>w.bot===selection.bot),connection)?'執行中或連線未就緒，暫停空間移動':travelMessage}</p></div>}
        {detailed&&selection.inspect&&<section className="cc-office-inspector" aria-label="Office 工作詳情">
          <div className="cc-inspector-heading"><div><small>{selected?'EXECUTION DETAIL':'OFFICE WORKSPACE'}</small><h2>{selection.agent_name || offices.find(o=>o.id===selection.bot)?.name+' Office'}</h2></div><button aria-label="關閉工作詳情" onClick={()=>setSelection(s=>({...s,inspect:false}))}><X size={18}/></button></div>
          <div className="cc-inspector-scroll">
            {!selected&&<p className="cc-muted">{selection.unassigned?'這些工作尚未回報 Agent 身分。':'點選工作桌或工作，查看真實執行狀態。'}</p>}
            {work.filter(w=>w.bot===selection.bot&&(!selection.agent||w.agent===selection.agent)&&(!selection.unassigned||!w.agent)&&(!selected||w.work===selected.work)).map(w=><div key={w.work} className={`cc-work ${selection.work===w.work?'chosen':''}`}>
              <button className="cc-project-button" onClick={()=>setSelection({bot:w.bot,agent:w.agent,agent_name:w.agent_name,project:w.project,project_name:w.project_name,inspect:true})}>{w.project_name||'未指定 Project'}</button>
              <button onClick={()=>selectWork(w)}><strong>{w.title}</strong><Badge w={w} now={now}/></button>
              {selected&&<dl className="cc-detail"><dt>Agent</dt><dd>{w.agent_name||'尚未標示 Agent'}</dd><dt>Stage</dt><dd>{w.stage||'未回報'}</dd><dt>目前活動</dt><dd>{w.current_activity||'尚無活動回報'}</dd><dt>最後更新</dt><dd>{date(w.updated_at)}</dd><dt>等待對象</dt><dd>{w.waiting_for||'未回報'}</dd><dt>Lifecycle / Execution</dt><dd>{w.lifecycle_status} / {w.status}</dd><dt>Work ID</dt><dd>{w.work}</dd><dt>成果／驗收</dt><dd><Link to="/dispatch">開啟既有 AI 工作中心 ↗</Link></dd></dl>}
            </div>)}
            {!work.some(w=>w.bot===selection.bot)&&<div className="cc-empty"><Bot size={26}/><b>目前沒有 AI Work</b><p>此角色代表 Office；未建立額外 Agent 或模擬工作。</p></div>}
            {selected&&<button className="cc-back-office" onClick={()=>setSelection({bot:selection.bot,inspect:true})}>← 此 Office 的全部工作</button>}
          </div>
        </section>}
        <div className="cc-map-tools"><button onClick={()=>zoom(.8)} aria-label="縮小"><Minus size={18}/></button><span>{Math.round(camera.z*100)}%</span><button onClick={()=>zoom(1.25)} aria-label="放大"><Plus size={18}/></button><button onClick={()=>{fit();setSelection(s=>({...s,inspect:false}))}} aria-label="全景"><Focus size={18}/></button></div>
        <div className="cc-map-hint">拖曳平移 · 雙指縮放 · 點選 Office 聚焦</div>
      </section><aside className={`cc-panel cc-right ${panel==='activity'?'open':''}`}>{activity}</aside>
    </div>
    <footer className="cc-command"><div className="cc-command-context"><span>COMMAND CONTEXT</span><b>對 {context} 說……</b>{selected&&<small>{LABEL[selected.status]}</small>}</div><div className="cc-command-input"><a className="cc-voice" href="https://chatgpt.com/" target="_blank" rel="noreferrer" aria-label="開啟 ChatGPT，使用 App 語音"><Mic size={22}/></a><input aria-label="指令" value={command} onChange={e=>setCommand(e.target.value)} placeholder="輸入指令，複製後交給 ChatGPT…"/><button className="cc-copy" disabled={!command.trim()} onClick={copyCommand}>{copied?<Check size={17}/>:<Copy size={17}/>}<span>{copied?'已複製':'複製指令'}</span></button><a className="cc-chatgpt" href="https://chatgpt.com/" target="_blank" rel="noreferrer">ChatGPT <ArrowUpRight size={16}/></a></div><p>{copied?'已包含選取的 Bot／Agent／Project／Work ID；請到 ChatGPT 貼上。':'語音由 ChatGPT App 提供；此列不會自行送出或執行指令。'}</p>{error.startsWith('無法自動複製')&&<textarea readOnly value={commandDraft(selection,offices,work,command)}/>}</footer>
  </div>
}
