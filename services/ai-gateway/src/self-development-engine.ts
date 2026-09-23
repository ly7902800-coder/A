import { chatExtended } from "./extended-providers.js";

export type SelfDevelopmentMode = "project" | "self-improve";

export interface SelfDevelopmentInput {
  objective: string;
  repo?: string;
  base?: string;
  mode?: SelfDevelopmentMode;
  maxIterations?: number;
  maxFilesPerIteration?: number;
  createPullRequest?: boolean;
}

export interface SelfDevelopmentResult {
  status: "completed" | "blocked";
  objective: string;
  mode: SelfDevelopmentMode;
  repo: string;
  branch: string;
  iterations: number;
  changedFiles: string[];
  checks: Array<{iteration:number;status:string;conclusion?:string;runId?:number;url?:string;failure?:string}>;
  pullRequest?: {number:number;url:string};
  blocker?: string;
}

type Change={path:string;content:string};
type Plan={summary:string;changes:Change[]};

function token(){const t=process.env.GITHUB_TOKEN;if(!t)throw new Error("GITHUB_TOKEN is not configured");return t;}
async function gh(path:string,init:RequestInit={}) {
  const r=await fetch("https://api.github.com"+path,{...init,headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token(),"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(init.headers??{})}});
  const body=await r.text(); let data:any={}; try{data=body?JSON.parse(body):{};}catch{data={raw:body};}
  if(!r.ok)throw new Error("GitHub API "+r.status+": "+JSON.stringify(data).slice(0,1500));
  return data;
}
function safePath(p:string){
  const n=p.replace(/^\.\//,"");
  if(!n||n.startsWith("/")||n.includes("..")||n.includes("\\")||n.startsWith(".git/")) return false;
  if(n.includes(".env")||n.includes("secrets")||n.includes("credentials")) return false;
  return true;
}
async function tree(repo:string,ref:string){
  const d=await gh("/repos/"+repo+"/git/trees/"+encodeURIComponent(ref)+"?recursive=1");
  return (d.tree??[]).filter((x:any)=>x.type==="blob"&&Number(x.size??0)<=180000).slice(0,300);
}
async function readFiles(repo:string,ref:string,paths:string[]){
  const out:Array<{path:string;content:string}>=[];
  for(const p of paths){
    try{const d=await gh("/repos/"+repo+"/contents/"+p+"?ref="+encodeURIComponent(ref));out.push({path:p,content:Buffer.from(d.content??"","base64").toString("utf8")});}catch{}
  }
  return out;
}
async function snapshot(repo:string,ref:string){
  const t=await tree(repo,ref);
  const paths=t.map((x:any)=>String(x.path));
  const priority=paths.filter(p=>/^(services|packages|apps|docs)\//.test(p)&&/\.(ts|tsx|js|jsx|json|md|css|html|yml|yaml|sql)$/.test(p));
  const selected=priority.slice(0,80);
  const files=await readFiles(repo,ref,selected);
  return {tree:paths.slice(0,300),files};
}
async function ensureBranch(repo:string,base:string,name:string){
  const b=await gh("/repos/"+repo+"/git/ref/heads/"+encodeURIComponent(base));
  try{await gh("/repos/"+repo+"/git/refs",{method:"POST",body:JSON.stringify({ref:"refs/heads/"+name,sha:b.object.sha})});}
  catch(e){if(!String(e).includes("422"))throw e;}
}
async function writeFile(repo:string,branch:string,c:Change){
  if(!safePath(c.path))throw new Error("Unsafe generated path: "+c.path);
  const d=await gh("/repos/"+repo+"/contents/"+c.path+"?ref="+encodeURIComponent(branch));
  await gh("/repos/"+repo+"/contents/"+c.path,{method:"PUT",body:JSON.stringify({message:"feat(self-development): update "+c.path,content:Buffer.from(c.content,"utf8").toString("base64"),branch,sha:d.sha})});
}
async function dispatch(repo:string,branch:string){
  const started=Date.now();
  await gh("/repos/"+repo+"/actions/workflows/genesis-self-heal.yml/dispatches",{method:"POST",body:JSON.stringify({ref:branch,inputs:{task:"self-development"}})});
  return started;
}
async function waitRun(repo:string,branch:string,started:number){
  const deadline=Date.now()+180000;
  while(Date.now()<deadline){
    const d=await gh("/repos/"+repo+"/actions/runs?branch="+encodeURIComponent(branch)+"&per_page=20");
    const runs=(d.workflow_runs??[]).filter((x:any)=>x.name==="Genesis Self Heal"&&new Date(x.created_at).getTime()>=started-5000);
    const run=runs[0];
    if(run?.status==="completed"){
      let failure="";
      try{
        const jobs=await gh("/repos/"+repo+"/actions/runs/"+run.id+"/jobs?per_page=20");
        const failed=(jobs.jobs??[]).find((j:any)=>j.conclusion==="failure");
        if(failed) failure=String(failed.name??"failed job");
      }catch{}
      return {status:"completed",conclusion:run.conclusion,runId:run.id,url:run.html_url,failure};
    }
    await new Promise(r=>setTimeout(r,5000));
  }
  return {status:"timeout"};
}
function parsePlan(text:string):Plan{
  const m=text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\s*\`\`\`/i);
  const raw=(m?.[1]??text).trim(); const s=raw.indexOf("{"),e=raw.lastIndexOf("}");
  if(s<0||e<s)throw new Error("Self-development model returned no JSON");
  const p=JSON.parse(raw.slice(s,e+1));
  const changes=Array.isArray(p.changes)?p.changes.filter((c:any)=>typeof c?.path==="string"&&typeof c?.content==="string"):[]; 
  return {summary:String(p.summary??"self-development"),changes};
}
async function makePlan(objective:string,repo:string,ref:string,mode:SelfDevelopmentMode,failure:string){
  const snap=await snapshot(repo,ref);
  const context=snap.files.map(f=>"FILE: "+f.path+"\n"+f.content.slice(0,10000)).join("\n\n");
  const instruction=mode==="self-improve"
    ?"Improve Genesis itself: strengthen its agents, tooling, tests, reliability, security and autonomous development loop. Preserve approval gates for merge/deploy/publish/secret changes."
    :"Implement the requested project objective end-to-end. Prefer small, testable changes and preserve existing architecture.";
  const prompt=`You are Genesis CTO + Coding Agent. Return STRICT JSON only: {"summary":"...","changes":[{"path":"...","content":"complete UTF-8 file content"}]}.
Objective: ${objective}
Mode: ${mode}
Instruction: ${instruction}
Previous failure (if any): ${failure||"none"}
Repository tree:
${snap.tree.join("\n")}
Relevant files:
${context}`;
  const response=await chatExtended({model:process.env.GENESIS_SELF_DEV_MODEL??"claude-opus-5-5",messages:[{role:"user",content:prompt}],maxTokens:120000});
  return parsePlan(response.text);
}
export async function runSelfDevelopment(input:SelfDevelopmentInput):Promise<SelfDevelopmentResult>{
  const objective=input.objective.trim(); if(!objective)throw new Error("objective is required");
  const repo=input.repo??"ly7902800-coder/A"; const base=input.base??"main"; const mode=input.mode??"project";
  const maxIterations=Math.min(Math.max(input.maxIterations??8,1),12);
  const maxFiles=Math.min(Math.max(input.maxFilesPerIteration??12,1),30);
  if(mode==="self-improve" && repo!=="ly7902800-coder/A") throw new Error("self-improve mode is restricted to the Genesis repository");
  const branchName="genesis/self-dev-"+Date.now().toString(36);
  await ensureBranch(repo,base,branchName);
  const checks:any[]=[]; const changed=new Set<string>(); let failure="";
  for(let i=1;i<=maxIterations;i++){
    const plan=await makePlan(objective,repo,branchName,mode,failure);
    const changes=plan.changes.slice(0,maxFiles);
    if(!changes.length){return {status:"blocked",objective,mode,repo,branch:branchName,iterations:i-1,changedFiles:[...changed],checks,blocker:"No safe changes were proposed."};}
    for(const c of changes){await writeFile(repo,branchName,c);changed.add(c.path);}
    const started=await dispatch(repo,branchName);
    const check=await waitRun(repo,branchName,started);
    checks.push({iteration:i,...check});
    if(check.conclusion==="success"){
      if(input.createPullRequest!==false){
        const pr=await gh("/repos/"+repo+"/pulls",{method:"POST",body:JSON.stringify({title:"Genesis Self-Development: "+plan.summary.slice(0,90),head:branchName,base,body:"Automated bounded Genesis self-development run. All CI gates passed. Merge/deploy remains approval-gated.",draft:true})});
        return {status:"completed",objective,mode,repo,branch:branchName,iterations:i,changedFiles:[...changed],checks,pullRequest:{number:pr.number,url:pr.html_url}};
      }
      return {status:"completed",objective,mode,repo,branch:branchName,iterations:i,changedFiles:[...changed],checks};
    }
    failure=check.failure||check.conclusion||check.status;
    if(i===maxIterations) return {status:"blocked",objective,mode,repo,branch:branchName,iterations:i,changedFiles:[...changed],checks,blocker:"Maximum self-healing iterations reached without passing CI."};
  }
  return {status:"blocked",objective,mode,repo,branch:branchName,iterations:maxIterations,changedFiles:[...changed],checks,blocker:"Self-development loop stopped."};
}
