import { getConnectorTokens } from "./token-vault.js";
import { getConnectorSession } from "./platform-permissions.js";

export interface ConnectorActionInput { projectId:string; platformId:string; action:string; input?:Record<string,unknown>; approved:boolean; }

async function request(url:string, init:RequestInit={}) {
  const res=await fetch(url,init);
  const text=await res.text(); let data:unknown;
  try{data=JSON.parse(text)}catch{data={raw:text}}
  if(!res.ok) throw new Error(`Connector request failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

function tokenFor(projectId:string,platformId:string){
  const session=getConnectorSession(projectId,platformId);
  if(!session?.accessTokenRef) throw new Error(`No connected ${platformId} account for this project`);
  const token=getConnectorTokens(session.accessTokenRef);
  if(!token?.accessToken) throw new Error(`Connector token is unavailable for ${platformId}`);
  return token.accessToken;
}

export async function executeConnectorAction(input:ConnectorActionInput){
  if(!input.approved) throw new Error("Explicit approval is required before an external connector action.");
  if(input.platformId==="github") return executeGitHub(input);
  if(input.platformId==="supabase") return executeSupabase(input);
  if(input.platformId==="vercel") return executeVercel(input);
  throw new Error(`No executable adapter is registered for ${input.platformId} yet.`);
}

async function executeGitHub(input:ConnectorActionInput){
  const token=tokenFor(input.projectId,"github");
  const headers={"Authorization":`Bearer ${token}`,"Accept":"application/vnd.github+json","X-GitHub-Api-Version":"2026-03-10","Content-Type":"application/json"};
  if(input.action==="list_repos") return request("https://api.github.com/user/repos?per_page=100",{headers});
  if(input.action==="create_repo"){
    const name=String(input.input?.name??"genesis-project");
    const description=String(input.input?.description??"Created by Genesis AI");
    const isPrivate=input.input?.private!==false;
    return request("https://api.github.com/user/repos",{method:"POST",headers,body:JSON.stringify({name,description,private:isPrivate,has_issues:true,has_projects:true,has_wiki:false})});
  }
  throw new Error(`Unsupported GitHub action: ${input.action}`);
}

async function executeSupabase(input:ConnectorActionInput){
  const token=input.platformId==="supabase" ? (process.env.SUPABASE_MANAGEMENT_TOKEN??"") : "";
  if(!token) throw new Error("SUPABASE_MANAGEMENT_TOKEN is not configured. Use Supabase OAuth when its connector is configured.");
  const headers={"Authorization":`Bearer ${token}`,"Accept":"application/json","Content-Type":"application/json"};
  if(input.action==="list_projects") return request("https://api.supabase.com/v1/projects",{headers});
  if(input.action==="project_api_keys"){
    const ref=String(input.input?.ref??"");
    if(!ref) throw new Error("ref is required");
    return request(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/api-keys?reveal=true`,{headers});
  }
  throw new Error(`Unsupported Supabase action: ${input.action}`);
}

async function executeVercel(input:ConnectorActionInput){
  const token=process.env.VERCEL_TOKEN??"";
  if(!token) throw new Error("VERCEL_TOKEN is not configured.");
  const headers={"Authorization":`Bearer ${token}`,"Accept":"application/json","Content-Type":"application/json"};
  if(input.action==="list_projects") return request("https://api.vercel.com/v9/projects?limit=100",{headers});
  if(input.action==="create_project"){
    const name=String(input.input?.name??"genesis-project");
    return request("https://api.vercel.com/v10/projects",{method:"POST",headers,body:JSON.stringify({name})});
  }
  throw new Error(`Unsupported Vercel action: ${input.action}`);
}
