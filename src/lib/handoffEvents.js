const BOTS=new Set(['hy','950157','sam','family'])
// First snapshot is a baseline, never a command to replay historical movement.
export function collectHandoffs(events,revision,work,now=Date.now()){
 const next=Math.max(revision??0,...events.map(e=>Number(e.sequence)||0))
 if(revision===null)return {revision:next,moves:[]}
 const moves=[]
 for(const e of events){
  const h=e.data?.handoff,t=Date.parse(e.occurredAt)
  if(e.eventType!=='execution'||!(e.sequence>revision)||!h||h.reason!=='owner_changed')continue
  if(!BOTS.has(h.from_bot)||!BOTS.has(h.to_bot)||h.from_bot===h.to_bot)continue
  if(!Number.isFinite(t)||now-t>120000||now<t)continue
  if(!work.some(w=>w.work===e.data.work&&w.bot===h.to_bot))continue
  moves.push({bot:h.from_bot,destination:h.to_bot,work:e.data.work,event:e.id})
 }
 // Only the most recent event for a Bot can determine its next destination.
 return {revision:next,moves:[...new Map(moves.map(m=>[m.bot,m])).values()]}
}
