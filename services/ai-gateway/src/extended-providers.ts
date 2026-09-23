import type { ChatRequest, ChatResponse } from "./types.js";

type ExtendedProvider = "xai" | "gemini" | "openai" | "anthropic";
const URLS: Record<ExtendedProvider,string> = { xai:"https://api.x.ai/v1/chat/completions", openai:"https://api.openai.com/v1/chat/completions", anthropic:"https://api.anthropic.com/v1/messages", gemini:"https://generativelanguage.googleapis.com/v1beta" };
const ENV: Record<ExtendedProvider,string> = {xai:"XAI_API_KEY",openai:"OPENAI_API_KEY",anthropic:"ANTHROPIC_API_KEY",gemini:"GEMINI_API_KEY"};
function secret(p:ExtendedProvider){return process.env[ENV[p]];}
function modelOf(model:string){return model.replace(/^(xai|openai|anthropic|gemini)\//,"");}

export async function chatExtended(request:ChatRequest):Promise<ChatResponse>{
 const provider=(request.model.split("/")[0]||"openai") as ExtendedProvider;
 const key=secret(provider); if(!key) throw new Error("Provider secret is not configured: "+provider);
 const model=modelOf(request.model);
 if(provider==="gemini"){
  const contents=request.messages.filter(m=>m.role!=="system").map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
  const system=request.messages.find(m=>m.role==="system")?.content;
  const response=await fetch(URLS.gemini+"/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...system?{systemInstruction:{parts:[{text:system}]}}:{},contents,generationConfig:{temperature:request.temperature,maxOutputTokens:request.maxTokens}})});
  if(!response.ok)throw new Error("gemini request failed ("+response.status+"): "+(await response.text()).slice(0,500));
  const data=await response.json() as any; const text=data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text??"").join("")??"";
  if(!text)throw new Error("Unexpected gemini response format");
  return {provider,model:request.model,text,usage:{inputTokens:data?.usageMetadata?.promptTokenCount,outputTokens:data?.usageMetadata?.candidatesTokenCount}};
 }
 if(provider==="anthropic"){
  const system=request.messages.find(m=>m.role==="system")?.content;
  const messages=request.messages.filter(m=>m.role!=="system").map(m=>({role:m.role,content:m.content}));
  const body:any={model,max_tokens:request.maxTokens??4096,...system?{system}:{},messages};
  if(model==="claude-opus-5-5"){body.thinking={type:"adaptive"};body.output_config={effort:"medium"};}
  const response=await fetch(URLS.anthropic,{method:"POST",headers:{"x-api-key":key,"anthropic-version":"2023-06-01","Content-Type":"application/json","anthropic-beta":"context-1m-2025-08-07"},body:JSON.stringify(body)});
  if(!response.ok)throw new Error("anthropic request failed ("+response.status+"): "+(await response.text()).slice(0,500));
  const data=await response.json() as any; const text=data?.content?.filter((p:any)=>p.type==="text").map((p:any)=>p.text).join("")??"";
  if(!text)throw new Error("Unexpected anthropic response format");
  return {provider,model:request.model,text,usage:{inputTokens:data?.usage?.input_tokens,outputTokens:data?.usage?.output_tokens}};
 }
 const response=await fetch(URLS[provider],{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model,messages:request.messages,temperature:request.temperature,max_tokens:request.maxTokens})});
 if(!response.ok)throw new Error(provider+" request failed ("+response.status+"): "+(await response.text()).slice(0,500));
 const data=await response.json() as any; const text=data?.choices?.[0]?.message?.content;
 if(typeof text!=="string")throw new Error("Unexpected "+provider+" response format");
 return {provider,model:request.model,text,usage:{inputTokens:data?.usage?.prompt_tokens,outputTokens:data?.usage?.completion_tokens}};
}
