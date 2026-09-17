import { ACTIVE } from './commandCenterModel.js'
export const HOMES={hy:[575,220],'950157':[380,370],sam:[785,365],family:[575,580]}
export const NODES={...HOMES,n:[575,270],nw:[480,270],ne:[670,270],e:[670,365],se:[670,485],s:[575,485],sw:[480,485],w:[480,370]}
const EDGES=[['hy','n'],['950157','w'],['sam','e'],['family','s'],['n','nw'],['n','ne'],['nw','w'],['w','sw'],['sw','s'],['s','se'],['se','e'],['e','ne']]
export function officeRoute(from,to){
 if(!NODES[from]||!NODES[to])return []
 const queue=[[from]],seen=new Set([from])
 while(queue.length){const path=queue.shift(),last=path.at(-1);if(last===to)return path.map(n=>NODES[n]);for(const [a,b] of EDGES){const next=a===last?b:b===last?a:null;if(next&&!seen.has(next)){seen.add(next);queue.push([...path,next])}}}
 return []
}
export function canTravel(work,connection){return connection==='live'&&!work.some(w=>ACTIVE.has(w.status)||w.status==='queued')}
export function routeLength(points){return points.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p[0]-points[i][0],p[1]-points[i][1]),0)}
export function pointOnRoute(points,distance){
 if(!points.length)return [0,0]
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(distance<=length)return [a[0]+(b[0]-a[0])*distance/length,a[1]+(b[1]-a[1])*distance/length];distance-=length}
 return points.at(-1)
}
