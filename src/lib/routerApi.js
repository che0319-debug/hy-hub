import {authHeaders,ensureAccessToken,expireSession} from '../auth'
const base=(import.meta.env.VITE_API_BASE||'').replace(/\/$/,'')
export class RouterApiError extends Error {constructor(message,status){super(message);this.status=status}}
export async function routerRequest(path,{method='GET',body,signal}={}){
 if(!await ensureAccessToken()){expireSession();throw new RouterApiError('登入已過期，請重新登入。',401)}
 const response=await fetch(`${base}/api/ai-work-packages/router${path}`,{method,cache:'no-store',signal,headers:{...authHeaders(),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})})
 const data=await response.json().catch(()=>({}))
 if(response.status===401)expireSession()
 if(!response.ok)throw new RouterApiError(response.status===409?'設定已被其他操作更新。請重新讀取，再核對你的修改；不會覆蓋新版。':response.status===403?'這個操作只開放 HY 本人。':response.status===404?'路由服務尚未提供，請確認後端版本後重試。':typeof data.detail==='string'?data.detail:'路由資料讀取失敗，請稍後重試。',response.status)
 return data
}
export const readRouter = (projectId,signal) => routerRequest('/view'+(projectId?'?project_id='+encodeURIComponent(projectId):''),{signal})
export const saveRouter = body => routerRequest('/policy',{method:'PUT',body})
export const previewRouter = body => routerRequest('/preview',{method:'POST',body})

export const saveRouterControl = body => routerRequest('/control',{method:'PUT',body})
