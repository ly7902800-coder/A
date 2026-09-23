import { GoogleGenAI } from "@google/genai";
import { StitchToolClient } from "@google/stitch-sdk";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export async function geminiInteraction(input: string, model = "gemini-flash-latest") {
  const ai = new GoogleGenAI({ apiKey: required("GEMINI_API_KEY") });
  const interaction = await ai.interactions.create({ model, input });
  return {
    id: interaction.id,
    status: interaction.status,
    model: interaction.model,
    outputText: Array.isArray((interaction as any).outputs)
      ? (interaction as any).outputs.map((x:any) => x?.text ?? x?.content ?? "").join("")
      : "",
    usage: interaction.usage
  };
}

export async function stitchCallTool(tool: string,args: Record<string, unknown>,accessToken?: string) {
  const client = new StitchToolClient({apiKey:process.env.STITCH_API_KEY,accessToken,projectId:process.env.GOOGLE_CLOUD_PROJECT,baseUrl:process.env.STITCH_HOST??"https://stitch.googleapis.com/mcp",timeout:300_000});
  try { return await client.callTool(tool,args); } finally { await client.close(); }
}

function cloudAccessToken(explicit?: string) {
  return explicit ?? process.env.GOOGLE_CLOUD_ACCESS_TOKEN ?? required("GOOGLE_CLOUD_ACCESS_TOKEN");
}
function notebookBase() {
  const project=required("GOOGLE_CLOUD_PROJECT"); const location=process.env.GEMINI_NOTEBOOK_LOCATION??"global"; const endpoint=process.env.GEMINI_NOTEBOOK_ENDPOINT??"discoveryengine.googleapis.com";
  return {project,location,base:`https://${endpoint}/v1alpha/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/notebooks`};
}
async function notebookRequest(path:string,init:RequestInit={},accessToken?:string){
  const token=cloudAccessToken(accessToken); const response=await fetch(path,{...init,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json",...(init.headers??{})}});
  const body=await response.text(); let data:unknown; try{data=body?JSON.parse(body):{}}catch{data={raw:body}}; if(!response.ok)throw new Error(`Gemini Notebook API request failed (${response.status}): ${body.slice(0,500)}`); return data;
}
export async function createGeminiNotebook(title:string,accessToken?:string){const{base}=notebookBase();return notebookRequest(base,{method:"POST",body:JSON.stringify({title})},accessToken);}
export async function listGeminiNotebooks(accessToken?:string){const{base}=notebookBase();return notebookRequest(base,{method:"GET"},accessToken);}
export async function addGeminiNotebookSource(notebookId:string,source:Record<string,unknown>,accessToken?:string){const{base}=notebookBase();return notebookRequest(`${base}/${encodeURIComponent(notebookId)}:addSource`,{method:"POST",body:JSON.stringify(source)},accessToken);}
