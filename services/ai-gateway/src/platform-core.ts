export type AgentRole="planner"|"architect"|"coder"|"reviewer"|"security"|"qa"|"devops"|"seo_geo";
export type MissionStatus="planned"|"running"|"waiting_approval"|"failed"|"completed";
export interface MissionStep{ id:string; role:AgentRole; action:string; status:"pending"|"running"|"completed"|"failed"|"waiting_approval"; tools:string[]; }
export interface Mission{ id:string; goal:string; status:MissionStatus; steps:MissionStep[]; createdAt:string; }
export function planMission(goal:string):Mission{
 const steps:MissionStep[]=[
 {id:"requirements",role:"planner",action:"analyze requirements and constraints",status:"pending",tools:["mcp-hub","tool-router"]},
 {id:"architecture",role:"architect",action:"design architecture and Project DNA",status:"pending",tools:["project-dna"]},
 {id:"implementation",role:"coder",action:"implement the requested solution",status:"pending",tools:["cloud-coding-agent"]},
 {id:"review",role:"reviewer",action:"review code and requirements",status:"pending",tools:["cloud-coding-agent"]},
 {id:"security",role:"security",action:"run security checks",status:"pending",tools:["autonomous-qa"]},
 {id:"qa",role:"qa",action:"run automated tests and regression checks",status:"pending",tools:["autonomous-qa"]},
 {id:"seo-geo",role:"seo_geo",action:"optimize discoverability when applicable",status:"pending",tools:["seo-geo-command-center","gsc-mcp","openseo","geo-optimizer"]},
 {id:"release",role:"devops",action:"build artifacts and prepare deployment",status:"pending",tools:["build-release-factory","observability"]}
 ];
 return {id:crypto.randomUUID(),goal:goal.trim(),status:"planned",steps,createdAt:new Date().toISOString()};
}
export function routeTools(intent:string):string[]{
 const s=intent.toLowerCase(),out=new Set<string>();
 if(/seo|search|google|rank|keyword|geo|visibility/.test(s)) ["gsc-mcp","openseo","geo-optimizer","seo-geo-command-center"].forEach(x=>out.add(x));
 if(/code|app|website|bug|build|program/.test(s)) ["cloud-coding-agent","autonomous-qa","build-release-factory"].forEach(x=>out.add(x));
 if(/design|ui|screen|figma|stitch/.test(s)) out.add("google-stitch");
 if(/deploy|release|publish/.test(s)) ["build-release-factory","observability"].forEach(x=>out.add(x));
 if(!out.size) ["mcp-hub","tool-router","multi-agent-orchestrator"].forEach(x=>out.add(x));
 return [...out];
}