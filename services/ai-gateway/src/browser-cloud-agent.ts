export type BrowserAction={type:"navigate"|"click"|"fill"|"select"|"wait"|"read"|"screenshot";target?:string;value?:string};
export interface BrowserSession{ id:string; projectId:string; platform:string; status:"planned"|"awaiting_user_connection"|"awaiting_approval"|"running"|"completed"|"failed"|"revoked"; actions:BrowserAction[]; createdAt:string; linkedAccountSessionId?:string; }
export function createBrowserSession(platform:string,actions:BrowserAction[],projectId="default",linkedAccountSessionId?:string):BrowserSession{
 return {id:`browser_${Date.now().toString(36)}`,projectId,platform,status:"awaiting_user_connection",actions,createdAt:new Date().toISOString(),linkedAccountSessionId};
}
export function browserPolicy(actions:BrowserAction[]){return {allowed:["navigate","click","fill","select","wait","read","screenshot"],blocked:["bypass_captcha","disable_security","steal_credentials","circumvent_access_controls","export_cookies","read_passwords"],requiresApproval:true,userLoginRequired:true};}
