import {useEffect,useRef,useState} from 'react'
import {OWNERS,ROLES,label,when,identity,removeRule,eventText,reasonText,describeSource} from '../lib/router.mjs'
import {AI_NAMES,family,choices,aiValue,effectiveRoute,setAI} from '../lib/simpleRouter.mjs'
import {readRouter,saveRouter} from '../lib/routerApi'
import '../../public/hy-ui/hy-ui.css'
import './router-controls.css'
function ErrorBox({error}){return error?<p className="hy-alert is-bad" role="alert">{error}</p>:null}
function useView(projectId,active=true){
 const [view,setView]=useState(null),[error,setError]=useState(''),[version,setVersion]=useState(0),loaded=useRef('')
 useEffect(()=>{const key=(projectId||'all')+':'+version;if(!active||loaded.current===key)return;const controller=new AbortController();setView(null);setError('');readRouter(projectId,controller.signal).then(data=>{if(!data.policy?.document?.rules||!Array.isArray(data.runners)||!Array.isArray(data.packages)||!Array.isArray(data.projects)||!Array.isArray(data.queues)||!Array.isArray(data.events)||!data.health_defaults||!data.role_defaults||!data.control)throw new Error('路由資料格式尚未就緒，請確認後端版本。');if(!controller.signal.aborted){loaded.current=key;setView(data)}}).catch(e=>{if(e.name!=='AbortError'&&!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[projectId,active,version])
 return {view,error,reload:()=>setVersion(v=>v+1)}
}

function AISelect({title,value,onChange,disabled}){
 return <label>{title}<select aria-label={title} value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}>
 {choices().map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select></label>
}
function Connections({view}){
 return <div className="rt-connections" aria-label="AI 接通狀態">{Object.entries(AI_NAMES).map(([provider,name])=>{
 const runners=view.runners.filter(r=>family(r)===provider),done=runners.some(r=>r.ready&&r.execution_verified),bound=runners.some(r=>r.ready)
 return <div key={provider}><b>{name}</b><span>{done?'已有領包與交件紀錄':bound?'已配置，待領包驗證':'尚未接通領包'}</span></div>
 })}</div>
}
export function RouterJournal({view}){return <section className="hy-card"><h3 className="hy-card-title">路由工作紀錄</h3>{view.events.length?<ol className="rt-journal">{view.events.map(e=><li key={e.key}><time>{when(e.at)}</time><p>{eventText(e)}</p><details><summary>決策依據</summary><dl className="hy-kv"><dt>工作包</dt><dd>{e.package_id||'範圍事件'}</dd><dt>政策／派工版本</dt><dd>{e.body.policy_revision??'尚無紀錄'}／{e.body.next_assignment_revision??e.body.assignment_revision??'尚無紀錄'}</dd><dt>授權來源</dt><dd>{describeSource(e.body.authority)} · {e.body.actor||'Router 系統'}</dd><dt>冷卻到期</dt><dd>{when(e.body.cooled_until)}</dd><dt>原因</dt><dd>{reasonText(e.body.reason)||'依既有執行事件記錄'}</dd></dl>{e.body.metrics&&<p>樣本 {e.body.metrics.samples}；連續未領 {e.body.metrics.consecutive_unclaimed}；逾時率 {Math.round(e.body.metrics.timeout_rate*100)}%；錯誤率 {Math.round(e.body.metrics.error_rate*100)}%</p>}{e.body.thresholds&&<p>門檻：至少 {e.body.thresholds.min_samples} 次執行／連續 {e.body.thresholds.unclaimed_threshold} 包未領，冷卻 {e.body.thresholds.cooldown_seconds} 秒。</p>}</details></li>)}</ol>:<p className="hy-empty">尚無路由事件。既有專案在正式納入前沿用原路徑。</p>}{view.events_truncated&&<p className="hy-note">顯示最近 100 筆路由事件；完整稽核仍保留於後端。</p>}</section>}

function Editor({view,reload,projectId,onSaved}){
 const [document,setDocument]=useState(()=>structuredClone(view.policy.document)),[scope,setScope]=useState(projectId?'project':'global'),[scopeId,setScopeId]=useState(projectId||''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[conflict,setConflict]=useState(false)
 const dirty=JSON.stringify(document)!==JSON.stringify(view.policy.document)
 const owner=scope==='owner'?scopeId:view.projects.find(p=>p.id===scopeId)?.owner_bot||'hy'
 useEffect(()=>{if(!dirty)return;const warn=e=>{e.preventDefault();e.returnValue=''};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty])
 function range(value){setScope(value);setScopeId(value==='global'?'':value==='owner'?'hy':projectId||view.projects[0]?.id||'')}
 function change(role,route,primary,fallback){try{setDocument(setAI(document,{role,scope,scopeId,owner,route,primary,fallback,targets:view.ai_targets,health:view.simple_health_defaults}));setError('')}catch(e){setError(e.message)}}
 async function save(){if(!dirty||busy||conflict)return;setBusy(true);setError('');try{await saveRouter({document,expected_revision:view.policy.revision,reason:'本人於前台調整主力與備案 AI',authority_ref:'authenticated-owner-ui'});onSaved('已儲存，僅影響之後建立的新包。');reload()}catch(e){setError(e.message);if(e.status===409)setConflict(true)}finally{setBusy(false)}}
 function refresh(){if(!dirty||window.confirm('重新讀取會捨棄尚未儲存的修改，是否繼續？'))reload()}
 return <div className="hy-stack rt-controls">
 <section className="hy-card"><div className="hy-card-head"><h2 className="hy-card-title">AI 派工</h2><button className="hy-btn" disabled={busy} onClick={refresh}>重新讀取</button>{dirty&&<span className="hy-pill" data-s="you">有未儲存修改</span>}</div>
 <p className="hy-note">選擇接工作包的 AI；模型由各 AI 的排程設定。</p><Connections view={view}/>
 {!view.enrollment_enabled&&<p className="hy-alert" role="status">此設定目前尚未用於新專案派工，儲存不會自行啟用。</p>}
 {view.auto_reassign_paused&&<p className="hy-alert" role="status">自動切換備案目前暫停。</p>}
 {view.configuration_error&&<p className="hy-alert">AI 連線設定有誤，請先修復連線。</p>}
 </section>
 {!view.can_edit&&<p className="hy-alert">目前僅能檢視，設定由 HY 本人修改。</p>}
 <section className="hy-card"><h3 className="hy-card-title">主力與備案</h3>
 <div className="rt-fields">{!projectId&&<label>套用範圍<select aria-label="套用範圍" value={scope} disabled={busy} onChange={e=>range(e.target.value)}><option value="global">全部專案預設</option><option value="owner">指定 Bot</option><option value="project">指定專案</option></select></label>}
 {scope==='owner'&&<label>Bot<select aria-label="Bot" value={scopeId} onChange={e=>setScopeId(e.target.value)} disabled={busy}>{OWNERS.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>}
 {scope==='project'&&!projectId&&<label>專案<select aria-label="專案" value={scopeId} onChange={e=>setScopeId(e.target.value)} disabled={busy}><option value="">選擇專案</option>{view.projects.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>}</div>
 {ROLES.filter(([id])=>!['*','PI_REVIEW'].includes(id)).map(([role,name])=>{
 const route=effectiveRoute(document,role,scope,scopeId,owner,view.role_defaults),exact=document.rules.find(r=>r.scope===scope&&r.scope_id===(scope==='global'?'':scopeId)&&r.selector===role),primary=aiValue(route.primary,view.runners),fallback=aiValue(route.fallbacks[0],view.runners)
 const disabled=busy||conflict||!view.can_edit||(scope!=='global'&&!scopeId)||!view.simple_health_defaults||view.simple_routing_version!==2
 return <article className="rt-route rt-simple-route" key={role}><div><b>{name}</b><small>{exact?'此範圍設定':scope==='global'?'系統預設':'沿用上層設定'}</small></div>
 <AISelect title={name+'主力'} value={primary} disabled={disabled} onChange={id=>change(role,route,id,fallback)}/>
 <AISelect title={name+'備案'} value={fallback} disabled={disabled} onChange={id=>change(role,route,primary,id)}/>
 {exact&&view.can_edit&&<button className="hy-btn rt-inherit" disabled={disabled} onClick={()=>setDocument(removeRule(document,identity(exact)))}>恢復預設</button>}
 {([route.primary,...route.fallbacks].some(id=>id!=='none'&&!aiValue(id,view.runners)))&&<p className="hy-note rt-wide">此列含舊 AI 設定，重新選擇並儲存後改用本頁選項。</p>}
 {route.fallbacks.length>1&&<p className="hy-note rt-wide">此列保留既有多個備案；重新選擇此列後改為一個備案。</p>}
 </article>})}
 <p className="hy-note">各角色的主力與備案皆可選無、GPT、Claude、Grok；連線狀態不會改變選項。主力選無時暫停此類新包派工。</p>
 {view.can_edit&&<div className="rt-actions"><button className="hy-btn is-primary" disabled={!dirty||busy||conflict} onClick={save}>{busy?'儲存中…':'儲存設定'}</button>{dirty&&<button className="hy-btn" disabled={busy} onClick={()=>{setDocument(structuredClone(view.policy.document));setError('')}}>取消修改</button>}</div>}
 <ErrorBox error={error}/>{conflict&&<button className="hy-btn" onClick={refresh}>重新讀取最新設定</button>}
 </section>
 <footer className="hy-card rt-principles"><b>固定原則</b><p>設定僅影響之後建立的新包，既有工作與執行鎖保留。重新選擇並儲存的列，模型沿用 AI 排程設定；連續 3 包超時未領時，依可用備案自動切換，並留下工作紀錄。每包未領等待時間為 2 小時，不以頁面刷新次數計算。</p><p>審查統一由未參與成果的 AI 執行；交件品質與里程碑依受審內容檢查。程式仍須通過 GitHub 驗證，合併 PR 及正式核准由本人決定。</p></footer>
 </div>
}
export function RouterControls({projectId,active=true,showJournal=false}){
 const {view,error,reload}=useView(projectId,active),[saved,setSaved]=useState('')
 if(!active&&!view)return null
 return <div className="hy rt-root hy-stack" hidden={!active}>{saved&&<p role="status">{saved}</p>}<ErrorBox error={error}/>{error&&<button className="hy-btn" onClick={reload}>重試讀取路由</button>}{!view&&!error&&<p className="hy-empty" role="status">讀取 AI 派工設定中…</p>}{view&&<><Editor key={view.as_of+':'+view.policy.revision} view={view} reload={reload} projectId={projectId} onSaved={setSaved}/>{showJournal&&<RouterJournal view={view}/>}</>}</div>
}
export function ProjectRouter({projectId,active}){const [open,setOpen]=useState(false);return <details className="hy rt-root hy-card" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>專案 AI 派工</summary><RouterControls projectId={projectId} active={active&&open}/></details>}
export function ProjectRouterLog({projectId,active}){const [open,setOpen]=useState(false);const state=useView(projectId,active&&open);return <details className="hy rt-root hy-card" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>冷卻、恢復與備援改派紀錄</summary>{open&&<><ErrorBox error={state.error}/>{state.error&&<button className="hy-btn" onClick={state.reload}>重試讀取路由紀錄</button>}{state.view?<RouterJournal view={state.view}/>:!state.error&&<p role="status">讀取路由紀錄中…</p>}</>}</details>}
