import { discoverModels } from "./model-discovery.js";
import { chat } from "./chat.js";
import type { ChatRequest, ChatResponse } from "./types.js";

let cache:{at:number;models:Awaited<ReturnType<typeof discoverModels>>["models"]}|null=null;
async function liveModels(){if(cache&&Date.now()-cache.at<300_000)return cache.models;const r=await discoverModels();cache={at:Date.now(),models:r.models};return r.models;}
const TASK_TARGETS={
 writing:"claude-code",
 image:"nano-banana",
 video:"hailuo-video",
 automation:"claude-code",
 search:"perplexity-search",
 coding:"chatgpt-coding",
 workflow:"n8n",
 agent:"manus"
} as const;
function explicitTarget(req:ChatRequest){const t=req.messages.map(m=>m.content).join(" ").toLowerCase();if(/\b(image|picture|photo|draw|generate an image)\b/.test(t))return TASK_TARGETS.image;if(/\b(video|animate|text.?to.?video)\b/.test(t))return TASK_TARGETS.video;if(/\b(search|research|sources|citations|web)\b/.test(t))return TASK_TARGETS.search;if(/\bn8n|workflow|automation\b/.test(t))return TASK_TARGETS.workflow;if(/\b(agent|browser task|autonomous)\b/.test(t))return TASK_TARGETS.agent;if(/\b(write|writing|article|document|email)\b/.test(t))return TASK_TARGETS.writing;if(/\b(code|coding|typescript|javascript|python|debug|program|repository)\b/.test(t))return TASK_TARGETS.coding;return undefined;}
function wanted(req:ChatRequest){const text=req.messages.map(m=>m.content).join(" ").toLowerCase();if(/\b(code|coding|typescript|javascript|python|debug|program)\b/.test(text))return "coding";if(/\b(reason|reasoning|prove|math|analy[sz]e|deep)\b/.test(text))return "reasoning";return "chat";}
export async function smartRoute(request:ChatRequest):Promise<ChatResponse>{
 if(request.model&&request.model!=="auto"&&!request.model.endsWith("/auto"))return chat(request);
 const models=await liveModels();const target=explicitTarget(request);const cap=wanted(request);
 const preferredIds=target?({image:["gemini/gemini-2.5-flash-image","gemini/gemini-3.1-flash-image"],video:["minimax/MiniMax-Hailuo-2.3"],search:["perplexity/sonar"],coding:[],writing:[],automation:[],workflow:[],agent:[]} as Record<string,string[]>)[target]??[]:[];
 const preferred=candidatesByTarget(models,target,preferredIds);
 const candidates=models.filter(m=>m.available&&m.capabilities.includes(cap)&&m.capabilities.includes("chat"));
 if(!candidates.length)throw new Error("No live model matching the requested capability is available");
 const ordered=[...preferred,...candidates.filter(m=>!preferred.some(p=>p.id===m.id))].sort((a,b)=>Number(b.provider==="openrouter")-Number(a.provider==="openrouter"));
 function candidatesByTarget(models:Awaited<ReturnType<typeof discoverModels>>["models"],target:string|undefined,ids:string[]){if(!target)return [];return models.filter(m=>ids.includes(m.id)&&m.available);}
let last:unknown;
 for(const m of ordered){try{return await chat({...request,model:m.id});}catch(e){last=e;}}
 throw last instanceof Error?last:new Error("All live model candidates failed");
}
