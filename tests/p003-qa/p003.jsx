import React from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import '../../src/index.css'
import Goals from '../../src/pages/Goals'
import LifeIsland from '../../src/pages/LifeIsland'
import { InboxProvider } from '../../src/inbox/InboxContext'
const now = new Date()
const days = n => new Date(now.valueOf() - n * 86400000).toISOString()
const ids=['dim-biz','dim-fin','dim-health','dim-family','dim-job','dim-leisure','dim-growth']
const names=['事業','財務','健康','家庭','本業（950157）','休閒','成長']
const owners=['sam','sam','family','family','950157','hy','hy']
const layers=['engine','engine','base','base','base','sustain','sustain']
const params=new URLSearchParams(location.search)
const documentFixture={revision:1,lifePrinciples:{text:'合成測試資料：整份人生準則範例。'},dimensions:ids.map((id,i)=>({
 id,name:names[i],advisorBot:owners[i],layer:layers[i],progress:[46,52,61,30,73,35,62][i],
 initializedAt:i===3?undefined:days(30),lastActionAt:i===3?undefined:days([2,14,1,0,25,8,3][i]),
 totalGoal:['建立穩定的事業基礎','財務自由覆蓋率 100%','身體檢查都正常','家庭安心與和諧','可準時下班','滿足新體驗','提升新知識'][i],
 evidenceStatus:i===3?'insufficient':i===1?'source_down':'ok',statusReason:i===3?'等待口述來源使用許可':i===1?'本月資料尚未讀取':'',
 nowSummary:'合成測試資料：已有可追溯的階段紀錄。',nextStep:['完成一項可驗收的事業行動','補齊本月收支來源','完成本週運動紀錄','由負責 Bot 補齊可用證據','記錄本週準時下班情況','安排一次新的休閒體驗','整理一份可重用的學習筆記'][i],
 history:i===3?[]:[{id:'initial-'+id,kind:'initial',at:days(30),scoreAfter:[46,52,61,30,73,35,62][i]-3,delta:0,reason:'合成測試：依階段成果錨點建立首評。',evidence:[{source:'synthetic',ref:'fixture-initial-'+id,at:days(30)}]},
 {id:'action-'+id,kind:'action',at:days(2),scoreAfter:[46,52,61,30,73,35,62][i],delta:3,author:'測試 Bot',reason:'合成測試：完成一項具體行動，附來源以便追溯。',evidence:[{source:'synthetic',ref:'fixture-action-'+id,at:days(2)}]}]
}))}
window.__p003Requests=[]
if(params.get('routine')==='paused')documentFixture.routineStatus={paused:true,lastFinalCycle:'2026-11-06',fallback:'HY_MANUAL_WEEKLY_SUMMARY'}
window.fetch=async (input,options={})=>{
 const url=typeof input==='string'?input:input.url
 window.__p003Requests.push({url,method:options.method||'GET'})
 if(url.endsWith('/api/life-goals')) {
  if(params.get('state')==='failed') return new Response('{}',{status:503})
  return new Response(JSON.stringify(documentFixture),{status:200,headers:{'Content-Type':'application/json'}})
 }
 if(url.includes('/api/life-goals/history/')) return new Response(JSON.stringify({history:documentFixture.dimensions.find(d=>url.endsWith(d.id))?.history||[]}),{status:200})
 if(url.endsWith('/api/life-goals/human')) {
  const body=JSON.parse(options.body)
  for(const op of body.operations){
   if(op.kind==='vision')documentFixture.dimensions.find(d=>d.id===op.dim).tenYearVision={text:op.text,confirmedByUser:true,source:'user'}
   if(op.kind==='principles')documentFixture.lifePrinciples={text:op.text}
  }
  return new Response(JSON.stringify({ok:true,results:[],revision:++documentFixture.revision}),{status:200})
 }
 if(url.endsWith('/api/life-goals/weekly/control')){
  const body=JSON.parse(options.body)
  if(body.action==='resume')documentFixture.routineStatus.paused=false
  return new Response(JSON.stringify({ok:true,paused:documentFixture.routineStatus.paused}),{status:200})
 }
 if(url.includes('bot-office'))return new Response(JSON.stringify({projects:[],decisions:[],version:1}),{status:200})
 if(url.includes('schedule'))return new Response(JSON.stringify({events:[]}),{status:200})
 if(url.includes('memory'))return new Response(JSON.stringify({bots:{}}),{status:200})
 return new Response('[]',{status:200})
}
if(params.get('fallback')==='1'){
 const get=HTMLCanvasElement.prototype.getContext
 HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args)}
}
const mode=params.get('view')||'goals'
createRoot(window.document.getElementById('root')).render(<MemoryRouter><InboxProvider><div style={{padding:'12px 16px',background:'var(--hy-you-bg)',color:'var(--hy-you)',fontSize:13}}>隔離驗證・合成資料（非正式分數）</div><main className={mode==='island'?'app-main':''} style={{padding:mode==='goals'?16:24}}>{mode==='island'?<LifeIsland/>:<Goals/>}</main></InboxProvider></MemoryRouter>)
