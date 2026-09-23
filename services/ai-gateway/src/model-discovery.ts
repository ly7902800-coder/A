import { getProviderConfig, getSecretForProvider, type ProviderName } from "./providers.js";
import type { ModelDescriptor } from "./types.js";

type Discovered = ModelDescriptor & { source:"live"|"registry"; available:boolean };

const caps=(id:string)=>{const s=id.toLowerCase(),c=["chat"];if(/vision|gemini|gpt-4o|claude-3|qwen-vl|llama-4/.test(s))c.push("vision");if(/reason|thinking|o[1-9]|gpt-5|claude|gemini-2\.5|gemini-3/.test(s))c.push("reasoning");if(/code|coder|devstral|codestral|qwen/.test(s))c.push("coding");return c;};
async function getJson(url:string,headers:Record<string,string>={}){const r=await fetch(url,{headers:{Accept:"application/json",...headers}});if(!r.ok)throw new Error(`${r.status} ${await r.text().then(x=>x.slice(0,300))}`);return r.json() as Promise<any>;}
function auth(p:ProviderName){const k=getSecretForProvider(p);return k?{Authorization:`Bearer ${k}`}:{};}

async function discoverOpenRouter():Promise<ModelDescriptor[]>{
 const d=await getJson("https://openrouter.ai/api/v1/models",auth("openrouter"));return (d.data??[]).map((m:any)=>({id:`openrouter/${m.id}`,provider:"openrouter" as const,name:m.name??m.id,capabilities:caps(m.id)}));
}
async function discoverTogether():Promise<ModelDescriptor[]>{
 const d=await getJson("https://api.together.xyz/v1/models",auth("together"));return (Array.isArray(d)?d:d.data??[]).map((m:any)=>({id:`together/${m.id}`,provider:"together" as const,name:m.display_name??m.name??m.id,capabilities:caps(m.id)}));
}
async function discoverOpenAI():Promise<ModelDescriptor[]>{
 const d=await getJson("https://api.openai.com/v1/models",auth("openai"));return (d.data??[]).filter((m:any)=>/gpt|o[1-9]|codex|chatgpt/i.test(m.id)).map((m:any)=>({id:`openai/${m.id}`,provider:"openai" as const,name:m.id,capabilities:caps(m.id)}));
}
async function discoverAnthropic():Promise<ModelDescriptor[]>{
 const k=getSecretForProvider("anthropic");if(!k)throw new Error("missing key");const d=await getJson("https://api.anthropic.com/v1/models",{"x-api-key":k,"anthropic-version":"2023-06-01"});return (d.data??[]).map((m:any)=>({id:`anthropic/${m.id}`,provider:"anthropic" as const,name:m.display_name??m.id,capabilities:caps(m.id)}));
}
async function discoverGemini():Promise<ModelDescriptor[]>{
 const k=getSecretForProvider("gemini");if(!k)throw new Error("missing key");const d=await getJson(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`);return (d.models??[]).filter((m:any)=>m.supportedGenerationMethods?.includes("generateContent")).map((m:any)=>({id:`gemini/${String(m.name).replace(/^models\\//,"")}`,provider:"gemini" as const,name:m.displayName??m.name,capabilities:caps(m.name)}));
}
async function discoverXai():Promise<ModelDescriptor[]>{
 const d=await getJson("https://api.x.ai/v1/models",auth("xai"));return (d.data??[]).map((m:any)=>({id:`xai/${m.id}`,provider:"xai" as const,name:m.id,capabilities:caps(m.id)}));
}
async function discoverReplicate():Promise<ModelDescriptor[]>{
 const d=await getJson("https://api.replicate.com/v1/models",auth("replicate"));return (d.results??[]).slice(0,200).map((m:any)=>({id:`replicate/${m.owner}/${m.name}`,provider:"replicate" as const,name:m.name,capabilities:["generation"]}));
}
const f:Record<ProviderName,()=>Promise<ModelDescriptor[]>>={openrouter:discoverOpenRouter,together:discoverTogether,replicate:discoverReplicate,openai:discoverOpenAI,anthropic:discoverAnthropic,gemini:discoverGemini,xai:discoverXai};
export async function discoverModels():Promise<{models:Discovered[];providers:Record<string,{configured:boolean;ok:boolean;count:number;error?:string}>}>{
 const models:Discovered[]=[];const providers:Record<string,{configured:boolean;ok:boolean;count:number;error?:string}>={};
 for(const p of getProviderConfig()){if(!p.configured){providers[p.name]={configured:false,ok:false,count:0};continue;}try{const ms=await f[p.name]();models.push(...ms.map(x=>({...x,source:"live" as const,available:true})));providers[p.name]={configured:true,ok:true,count:ms.length};}catch(e){providers[p.name]={configured:true,ok:false,count:0,error:e instanceof Error?e.message:"discovery failed"};}}
 return {models,providers};
}
