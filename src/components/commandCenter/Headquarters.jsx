import { useEffect, useRef, useState } from 'react'
import hq from '../../assets/command-center/headquarters.webp'
import botArt from '../../assets/command-center/office-bot.webp'
import { officeMotion } from '../../lib/officeMotion'
import { collectHandoffs } from '../../lib/handoffEvents'
import { LABEL } from '../../lib/commandCenterModel'
import { HOMES,officeRoute,canTravel,pointOnRoute,routeLength } from '../../lib/officeRoutes'
const COLORS={hy:'#9581c5','950157':'#4888cd',sam:'#c49543',family:'#5c9e7c'}
const SIGNS={hy:[575,90],'950157':[220,295],sam:[930,295],family:[575,735]}
const DESKS={hy:[[520,145],[590,145],[650,165],[730,170]],'950157':[[180,325],[285,325],[180,415],[285,415]],sam:[[895,360],[975,360],[895,425],[975,425]],family:[[590,640],[655,640],[460,620],[730,620]]}
const ROLES={hy:'總 Agent · 協調與巡查','950157':'研發 · 技術情報 · 專案',sam:'事業 · 品牌 · 商業機會',family:'家庭 · 生活 · 健康'}
export default function Headquarters({offices,work,groups,events,connection,now,detailed,selection,onOffice,onAgent,travelRequest,onTravelState,roaming}){
 const elements=useRef({}), positions=useRef({...HOMES}),locations=useRef(Object.fromEntries(Object.keys(HOMES).map(id=>[id,id]))),journeys=useRef({}),latest=useRef({})
 const eventRevision=useRef(null)
 const [travel,setTravel]=useState({}),[pages,setPages]=useState({})
 latest.current={work,connection,roaming}
 const begin=(id,destination,kind='manual')=>{
  if(journeys.current[id]&&kind==='event')return
  if(journeys.current[id]){onTravelState('此 Bot 正在途中；抵達後可選下一個目的地。');return}
  if(!canTravel(latest.current.work.filter(w=>w.bot===id),latest.current.connection))return
  if(locations.current[id]===destination){onTravelState('此 Bot 已在目的地 · 空間位置不代表工作進度');return}
  const points=officeRoute(locations.current[id],destination).map(p=>[...p]);if(points.length<2)return
  points[0]=[...positions.current[id]]
  if(destination!==id){const offset={hy:[-27,14],'950157':[27,14],sam:[-27,32],family:[27,32]}[id];points[points.length-1]=[points.at(-1)[0]+offset[0],points.at(-1)[1]+offset[1]]}
  journeys.current[id]={points,distance:0,total:routeLength(points),destination,kind}
  setTravel(t=>({...t,[id]:{destination,kind}}));onTravelState(`${offices.find(o=>o.id===id)?.name} 前往 ${offices.find(o=>o.id===destination)?.name} Office · ${kind==='event'?'後端 owner 交接的視覺對應':'空間移動，非工作進度'}`)
 }
 useEffect(()=>{
  if(!Array.isArray(events)||connection!=='live')return
  const result=collectHandoffs(events,eventRevision.current,work)
  eventRevision.current=result.revision
  for(const move of result.moves)begin(move.bot,move.destination,'event')
 },[events,connection,work])
 useEffect(()=>{if(travelRequest)begin(travelRequest.bot,travelRequest.destination)},[travelRequest])
 useEffect(()=>{
  let frame,last=0,nextRoam=0,disposed=false
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)')
  function tick(time){
   if(disposed)return
   const dt=last?Math.min((time-last)/1000,.08):0;last=time
   if(!document.hidden){
    for(const [id,journey] of Object.entries(journeys.current)){
     const moving=canTravel(latest.current.work.filter(w=>w.bot===id),latest.current.connection)
     elements.current[id]?.classList.toggle('is-walking',moving&&!reduced.matches)
     elements.current[id]?.classList.toggle('travel-paused',!moving)
     if(!moving)continue
     journey.distance=reduced.matches?journey.total:Math.min(journey.total,journey.distance+dt*68)
     const point=pointOnRoute(journey.points,journey.distance);positions.current[id]=point
     const el=elements.current[id];if(el){el.style.left=point[0]+'px';el.style.top=point[1]+'px'}
     if(journey.distance>=journey.total){locations.current[id]=journey.destination;delete journeys.current[id];el?.classList.remove('is-walking','travel-paused');setTravel(t=>{const n={...t};delete n[id];return n});onTravelState(`${offices.find(o=>o.id===id)?.name} 已抵達 ${offices.find(o=>o.id===journey.destination)?.name} Office · ${journey.kind==='event'?'交接事件視覺對應完成':'空間移動'}`)}
    }
    if(latest.current.roaming&&time>nextRoam){nextRoam=time+24000;for(const o of offices){const own=latest.current.work.filter(w=>w.bot===o.id);if(!journeys.current[o.id]&&officeMotion(own,latest.current.connection).mode==='idle'){const dest=locations.current[o.id]===o.id?offices[(offices.findIndex(x=>x.id===o.id)+1)%offices.length].id:o.id;begin(o.id,dest,'idle');break}}}
   }else for(const el of Object.values(elements.current))el?.classList.remove('is-walking')
   frame=requestAnimationFrame(tick)
  }
  frame=requestAnimationFrame(tick);return()=>{disposed=true;cancelAnimationFrame(frame)}
 },[])
 return <div className="cc-headquarters">
  <img src={hq} className="cc-hq-art" draggable="false" alt="四個 Office 共用連通走道：上方 HY、左側研發、右側事業、下方家庭"/>
  {offices.map(o=>{const own=work.filter(w=>w.bot===o.id),motion=officeMotion(own,connection,now),[x,y]=SIGNS[o.id],all=groups[o.id]||[],page=Math.min(pages[o.id]||0,Math.max(0,Math.ceil(all.length/4)-1));return <div key={o.id}>
   <button className={`cc-hq-sign ${selection.bot===o.id?'selected':''}`} style={{left:x,top:y,'--office-color':COLORS[o.id]}} onClick={()=>onOffice(o.id)} aria-label={`進入 ${o.name} Office`}><b>{o.name} Office <span>↗</span></b><small>{ROLES[o.id]}</small><em>{own.length} 工作 · {all.filter(g=>g.assigned).length} Agent · {({stalled:'久未更新',unknown:'等待回報',paused:'連線暫停'})[motion.mode]||LABEL[motion.mode]}</em></button>
   <button ref={el=>elements.current[o.id]=el} className={`cc-hq-bot motion-${motion.mode} ${travel[o.id]?'has-journey':''}`} style={{left:positions.current[o.id][0],top:positions.current[o.id][1],'--office-color':COLORS[o.id]}} onClick={()=>onOffice(o.id)} aria-label={`${o.name} Bot，${travel[o.id]?'空間移動中':'查看 Office'}`}><img src={botArt} alt="" draggable="false"/><span>{o.name}<small>{travel[o.id]?(canTravel(own,connection)?(travel[o.id].kind==='event'?'交接視覺':'空間移動'):'移動暫停'):({stalled:'久未更新',unknown:'未回報',paused:'已暫停'})[motion.mode]||LABEL[motion.mode]}</small></span></button>
   {detailed&&selection.bot===o.id&&all.slice(page*4,page*4+4).map((g,i)=>{const [dx,dy]=DESKS[o.id][i],gm=officeMotion(g.work,connection,now);return <button key={g.id} className={`cc-hq-agent motion-${gm.mode}`} style={{left:dx,top:dy,'--office-color':COLORS[o.id]}} onClick={()=>onAgent(o.id,g)} aria-label={`${g.name}，${g.work.length} 項工作`}>{g.assigned&&<img src={botArt} alt=""/>}<span><b>{g.name}</b><small>{g.work.length} 工作 · {g.assigned?(LABEL[gm.mode]||'狀態待確認'):'尚未回報身分'}</small></span></button>})}
   {detailed&&selection.bot===o.id&&all.length>4&&<button className="cc-hq-pages" style={{left:x,top:y+86}} onClick={()=>setPages(p=>({...p,[o.id]:(page+1)%Math.ceil(all.length/4)}))}>Agent 工作桌 {page+1}/{Math.ceil(all.length/4)} →</button>}
  </div>})}
 </div>
}
