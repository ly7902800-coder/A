export type BrowserAction={type:"navigate"|"click"|"fill"|"select"|"wait"|"read"|"screenshot";target?:string;value?:string};
export interface BrowserSession{ id:string; platform:string; status:"planned"|"awaiting_approval"|"running"|"completed"|"failed"; actions:BrowserAction[]; createdAt:string; }
export function createBrowserSession(platform:string,actions:BrowserAction[]):BrowserSession{
 return {id:`browser_${Date.now().toString(36)}`,platform,status:"awaiting_approval",actions,createdAt:new Date().toISOString()};
}
export function browserPolicy(actions:BrowserAction[]){return {allowed:["navigate","click","fill","select","wait","read","screenshot"],blocked:["bypass_captcha","disable_security","steal_credentials","circumvent_access_controls"],requiresApproval:actions.some(a=>["click","fill","select"].includes(a.type))};}
