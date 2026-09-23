export type AccountAccessMode = "oauth" | "api" | "linked_browser";
export type AccountAccessStatus = "approval_required" | "connected" | "revoked" | "expired";

export interface AccountAccessRequest {
  id:string;
  projectId:string;
  platformId:string;
  mode:AccountAccessMode;
  scopes:string[];
  reason:string;
  status:AccountAccessStatus;
  createdAt:string;
  expiresAt?:number;
}

export interface LinkedBrowserSession {
  id:string;
  projectId:string;
  platformId:string;
  status:"awaiting_user"|"connected"|"revoked"|"expired";
  userMustCompleteLogin:boolean;
  note:string;
  createdAt:string;
  expiresAt:number;
}

const requests=new Map<string,AccountAccessRequest>();
const sessions=new Map<string,LinkedBrowserSession>();

export function requestAccountAccess(input:Omit<AccountAccessRequest,"id"|"status"|"createdAt">){
  const id="acct_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8);
  const req:AccountAccessRequest={...input,id,status:"approval_required",createdAt:new Date().toISOString()};
  requests.set(id,req);
  return req;
}

export function approveAccountAccess(id:string){
  const req=requests.get(id);
  if(!req) throw new Error("Account access request not found");
  req.status="connected";
  requests.set(id,req);
  return req;
}

export function revokeAccountAccess(id:string){
  const req=requests.get(id);
  if(!req) return false;
  req.status="revoked";
  requests.set(id,req);
  for(const [key,s] of sessions) if(s.projectId===req.projectId&&s.platformId===req.platformId) sessions.set(key,{...s,status:"revoked"});
  return true;
}

export function listAccountAccess(projectId?:string){
  return [...requests.values()].filter(x=>!projectId||x.projectId===projectId);
}

export function createLinkedBrowserSession(projectId:string,platformId:string,ttlMinutes=60){
  const now=Date.now();
  const session:LinkedBrowserSession={
    id:"linked_"+now.toString(36),
    projectId,platformId,status:"awaiting_user",
    userMustCompleteLogin:true,
    note:"Genesis can use this session only after the user explicitly connects it. Login, MFA and CAPTCHA must be completed by the user; Genesis never reads or copies browser passwords or cookies.",
    createdAt:new Date(now).toISOString(),
    expiresAt:now+Math.max(5,Math.min(ttlMinutes,1440))*60_000
  };
  sessions.set(session.id,session);
  return session;
}

export function approveLinkedBrowserSession(id:string){
  const s=sessions.get(id);
  if(!s) throw new Error("Linked browser session not found");
  if(s.expiresAt<=Date.now()){s.status="expired";sessions.set(id,s);throw new Error("Linked browser session expired");}
  s.status="connected";sessions.set(id,s);return s;
}

export function getLinkedBrowserSession(id:string){
  const s=sessions.get(id);
  if(!s) return null;
  if(s.expiresAt<=Date.now()&&s.status==="connected"){s.status="expired";sessions.set(id,s);return null;}
  return s;
}

export function revokeLinkedBrowserSession(id:string){
  const s=sessions.get(id);
  if(!s) return false;
  s.status="revoked";sessions.set(id,s);return true;
}
