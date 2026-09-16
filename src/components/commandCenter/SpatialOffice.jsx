import { useId, useState } from 'react'
import room from '../../assets/command-center/office-room.webp'
import { officeMotion } from '../../lib/officeMotion'
import { LABEL } from '../../lib/commandCenterModel'

const COLORS={hy:'#9685ce','950157':'#518fe0',sam:'#c99b4b',family:'#63a78e'}
const ROLES={hy:'CHIEF AGENT','950157':'RESEARCH & WORK',sam:'BUSINESS DEVELOPMENT',family:'FAMILY & LIFE'}
const MISSIONS={hy:'團隊協調 · 狀態巡查','950157':'研發 · 技術情報 · 專案',sam:'事業 · 品牌 · 商業機會',family:'家庭 · 生活 · 健康'}
const DESKS=[[175,195],[305,245],[125,270],[250,320]]

// The character and workstation are independent SVG layers, so state changes
// do not require re-rendering or generating room artwork.
export function RobotDesk({color, mode='paused', robot=true}) {
  const id=useId().replace(/:/g,'')
  return <svg viewBox="0 0 150 150" className={`cc-robot-scene motion-${mode}`} aria-hidden="true">
    <defs>
      <linearGradient id={`${id}shell`} x2=".8" y2="1"><stop stopColor="#fff"/><stop offset=".55" stopColor="#f6f8fc"/><stop offset="1" stopColor="#aab9cb"/></linearGradient>
      <linearGradient id={`${id}face`} x2=".4" y2="1"><stop stopColor="#26364e"/><stop offset="1" stopColor="#091522"/></linearGradient>
      <linearGradient id={`${id}desk`} x2="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#d9e4f0"/></linearGradient>
    </defs>
    <ellipse cx="75" cy="129" rx="62" ry="12" fill="#254866" opacity=".1"/>
    <path d="M16 99v24l5 3v-24m104-13v29l5-2V87M76 119v23l5-3v-23" stroke="#bdcad6" strokeWidth="4"/>
    <path d="M8 93 64 63 141 94 81 126Z" fill={`url(#${id}desk)`} stroke="#d0dbe7"/>
    <path d="M8 93v6l73 32 60-31v-6l-60 32Z" fill="#b9c8d7"/>
    <path d="m32 91 28-14 27 11-28 15Z" fill="#dae4ed"/>
    <path d="m37 91 23-11m-13 15 23-11m-14 15 23-11" stroke="#aabacb" strokeWidth="2"/>
    <path d="m92 88 12-6 12 5-12 7Z" fill="#9faec0"/>
    <path d="M105 85V64" stroke="#bbc9d7" strokeWidth="5"/>
    <path d="m83 37 45 18v32L83 69Z" fill="#c1cddb" stroke="#f8fbff" strokeWidth="3"/>
    <path d="m87 42 37 15v24L87 66Z" fill="#1d3553"/>
    <g className="cc-screen-lines" stroke={color} strokeWidth="2" opacity=".9"><path d="m92 50 23 9m-23-2 15 6m-15 1 26 10"/></g>
    {robot&&<g className="cc-robot">
      <ellipse cx="58" cy="88" rx="14" ry="7" fill="#93a6bd"/>
      <path d="M42 64Q39 93 58 96Q78 91 74 63Z" fill={`url(#${id}shell)`} stroke="#c2cdd9"/>
      <ellipse cx="58" cy="77" rx="6" ry="5" fill={color} opacity=".7"/>
      <g className="cc-robot-head">
        <path d="M57 27V17" stroke="#a3b4c8" strokeWidth="3"/><circle cx="57" cy="15" r="4" fill={color}/>
        <rect x="30" y="28" width="54" height="39" rx="19" fill={`url(#${id}shell)`} stroke="#c9d5e2"/>
        <rect x="36" y="35" width="42" height="26" rx="12" fill={`url(#${id}face)`}/>
        <g className="cc-robot-eyes" fill="#8fe8ff"><ellipse cx="47" cy="47" rx="4" ry="5"/><ellipse cx="66" cy="47" rx="4" ry="5"/></g>
        <path d="m53 55 7 1" stroke="#a7f0ff" strokeWidth="1.5" strokeLinecap="round"/>
      </g>
      <path className="cc-hand cc-hand-left" d="M40 69Q25 79 38 88" fill="none" stroke="#e8eef6" strokeWidth="10" strokeLinecap="round"/>
      <path className="cc-hand cc-hand-right" d="M76 69Q88 83 76 90" fill="none" stroke="#d1dce9" strokeWidth="10" strokeLinecap="round"/>
    </g>}
    {!robot&&<g opacity=".6"><path d="M44 63v18q14 10 28 0V63Z" fill="#c2cfdd"/><path d="M58 85v11" stroke="#abbccd" strokeWidth="4"/></g>}
    <g className="cc-data-sparks" fill={color}><circle cx="93" cy="28" r="3"/><circle cx="110" cy="35" r="2"/><circle cx="120" cy="26" r="2"/></g>
  </svg>
}

export default function SpatialOffice({office,work,groups,connection,now,detailed,visible,selected,selection,onOffice,onAgent}) {
  const [page,setPage]=useState(0)
  const color=COLORS[office.id], motion=officeMotion(work,connection,now)
  const selectedIndex=groups.findIndex(g=>g.id===selection.agent)
  const currentPage=selectedIndex>=0 ? Math.floor(selectedIndex/4) : Math.min(page,Math.max(0,Math.ceil(groups.length/4)-1))
  const desks=groups.slice(currentPage*4,currentPage*4+4)
  const effective=visible ? motion.mode : 'paused'
  const status=({paused:'連線暫停',stalled:'久未更新',unknown:'等待活動回報',idle:'閒置'})[motion.mode]||LABEL[motion.mode]
  return <div className={`cc-spatial-room ${selected?'is-selected':''} ${detailed?'is-detailed':''}`} style={{'--office-color':color}}>
    <img className="cc-room-art" src={room} alt="" draggable="false"/>
    <div className="cc-room-rug"/>
    {!detailed&&<div className="cc-office-representative"><RobotDesk color={color} mode={effective}/></div>}
    {detailed&&visible&&<>
      {desks.length ? desks.map((g,i)=>{
        const gm=officeMotion(g.work,connection,now)
        return <button key={g.id} className={`cc-spatial-desk ${selection.agent===g.id?'is-selected':''}`} style={{left:DESKS[i][0],top:DESKS[i][1]}} onClick={()=>onAgent(g)} aria-label={`${g.name}，${g.work.length} 項工作`}>
          <RobotDesk color={color} robot={g.assigned} mode={g.assigned?gm.mode:'paused'}/>
          <span className="cc-desk-caption"><b>{g.name}</b><small>{g.work.length} 項工作 · {gm.mode==='stalled'?'久未更新':gm.mode==='unknown'?'未回報':LABEL[gm.mode]||'連線暫停'}</small></span>
        </button>
      }) : <div className="cc-office-representative"><RobotDesk color={color} mode={effective}/><span className="cc-idle-note">尚無執行工作</span></div>}
      {groups.length>4&&<button className="cc-desk-more" onClick={()=>{setPage((currentPage+1)%Math.ceil(groups.length/4));onAgent(null)}}>工作桌 {currentPage+1}/{Math.ceil(groups.length/4)} →</button>}
    </>}
    <button className="cc-room-sign" onClick={onOffice} aria-label={`進入 ${office.name} Office`}>
      <small>{ROLES[office.id]}</small><strong>{office.name} Office <span>↗</span></strong>
      <span className="cc-room-mission">{MISSIONS[office.id]}</span>
      <span className="cc-room-status"><i className={`dot-${motion.mode}`}/>{status}<em>{work.length} WORK · {groups.filter(g=>g.assigned).length} AGENT</em></span>
    </button>
  </div>
}
