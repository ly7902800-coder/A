export type AuthMethod="oauth"|"api_key"|"connector"|"browser"|"none";
export interface PlatformTarget{ id:string; name:string; domains:string[]; auth:AuthMethod[]; capabilities:string[]; apiBase?:string; officialApi?:string; }
export interface PlatformMission{ objective:string; target:PlatformTarget; steps:string[]; approvalRequired:boolean; }
const catalog:PlatformTarget[]=[
{id:"flutterflow",name:"FlutterFlow",domains:["flutterflow.io"],auth:["oauth","browser"],capabilities:["create_project","edit_project","build","export","api"]},
{id:"github",name:"GitHub",domains:["github.com","api.github.com"],auth:["oauth","api_key"],capabilities:["repo","files","issues","actions"]},
{id:"figma",name:"Figma",domains:["figma.com","api.figma.com"],auth:["oauth","api_key"],capabilities:["files","design","comments"]},
{id:"vercel",name:"Vercel",domains:["vercel.com","api.vercel.com"],auth:["api_key","browser"],capabilities:["projects","deploy","domains","env"]},
{id:"railway",name:"Railway",domains:["railway.app"],auth:["api_key","browser"],capabilities:["projects","deploy","env","logs"]},
{id:"supabase",name:"Supabase",domains:["supabase.com","api.supabase.com"],auth:["api_key","browser"],capabilities:["projects","database","auth","storage","functions"]},
{id:"firebase",name:"Firebase",domains:["firebase.google.com","firebase.googleapis.com"],auth:["api_key","browser"],capabilities:["projects","database","auth","hosting","functions"]},
{id:"cloudflare",name:"Cloudflare",domains:["cloudflare.com","api.cloudflare.com"],auth:["oauth","api_key"],capabilities:["zones","workers","dns","deploy"]},
{id:"google",name:"Google",domains:["google.com","googleapis.com"],auth:["oauth"],capabilities:["drive","calendar","gmail","docs","sheets","slides","youtube"]}
];
export function listPlatformTargets(){return catalog;}
export function discoverPlatform(input:string){const q=input.toLowerCase();return catalog.find(p=>p.id===q||p.name.toLowerCase().includes(q)||p.domains.some(d=>q.includes(d)))??null;}
export function planPlatformMission(objective:string,target:PlatformTarget):PlatformMission{
 const mutating=/create|build|edit|delete|deploy|publish|send|write|change|register|upload/i.test(objective);
 return {objective,target,approvalRequired:mutating,steps:["discover_official_api_or_allowed_browser_flow","show_required_permissions","request_explicit_user_approval","connect_using_oauth_or_credential_reference","validate_access","execute_task","run_verification","report_results_and_audit_log"]};
}
