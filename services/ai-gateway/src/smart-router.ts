import { discoverModels } from "./model-discovery.js";
import { chat } from "./chat.js";
import type { ChatRequest, ChatResponse } from "./types.js";

let cache:{at:number;models:Awaited<ReturnType<typeof discoverModels>>["models"]}|null=null;
async function liveModels(){if(cache&&Date.now()-cache.at<300_000)return cache.models;const r=await discoverModels();cache={at:Date.now(),models:r.models};return r.models;}
function wanted(req:ChatRequest){const text=req.messages.map(m=>m.content).join(" ").toLowerCase();if(/\b(code|coding|typescript|javascript|python|debug|program)\b/.test(text))return "coding";if(/\b(reason|reasoning|prove|math|analy[sz]e|deep)\b/.test(text))return "reasoning";return "chat";}
export async function smartRoute(request:ChatRequest):Promise<ChatResponse>{
 if(request.model&&request.model!=="auto"&&!request.model.endsWith("/auto"))return chat(request);
 const models=await liveModels();const cap=wanted(request);
 const candidates=models.filter(m=>m.available&&m.capabilities.includes(cap)&&m.capabilities.includes("chat"));
 if(!candidates.length)throw new Error("No live model matching the requested capability is available");
 const ordered=[...candidates].sort((a,b)=>Number(b.provider==="openrouter")-Number(a.provider==="openrouter"));
 let last:unknown;
 for(const m of ordered){try{return await chat({...request,model:m.id});}catch(e){last=e;}}
 throw last instanceof Error?last:new Error("All live model candidates failed");
}
