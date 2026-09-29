function token(){const t=process.env.GITHUB_TOKEN;if(!t)throw new Error("GITHUB_TOKEN is not configured");return t;}
async function gh(path:string,init:RequestInit={}){const r=await fetch("https://api.github.com"+path,{...init,headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token(),"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(init.headers??{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("GitHub API "+r.status+": "+JSON.stringify(d).slice(0,800));return d;}
const targetCommands:Record<string,string>={web:"npm run build",apk:"cd apps/mobile && flutter build apk --release",aab:"cd apps/mobile && flutter build appbundle --release"};
export function createBuildPlan(target:string){if(!targetCommands[target])throw new Error("Unsupported build target: "+target);return {target,command:targetCommands[target],artifact:target==="web"?"dist":target==="apk"?"apps/mobile/build/app/outputs/flutter-apk/app-release.apk":"apps/mobile/build/app/outputs/bundle/release/app-release.aab",approvalRequired:true};}
export async function dispatchBuild(repo:string,branch:string,target:string){const plan=createBuildPlan(target);await gh("/repos/"+repo+"/actions/workflows/genesis-build.yml/dispatches",{method:"POST",body:JSON.stringify({ref:branch,inputs:{target}})});return {repo,branch,...plan,dispatchedAt:new Date().toISOString()};}

export async function getFlutterBuildArtifacts(repo:string,runId:number){const data=await gh("/repos/"+repo+"/actions/runs/"+runId+"/artifacts");return (data.artifacts??[]).map((a:any)=>({id:a.id,name:a.name,size:a.size_in_bytes,expired:a.expired,createdAt:a.created_at,expiresAt:a.expires_at,downloadUrl:a.archive_download_url}));}\n\nexport async function getFlutterBuildStatus(repo:string,branch:string){
  const runs=await gh("/repos/"+repo+"/actions/workflows/genesis-build.yml/runs?branch="+encodeURIComponent(branch)+"&per_page=5");
  const run=(runs.workflow_runs??[])[0];
  if(!run)return {found:false,repo,branch};
  return {found:true,runId:run.id,status:run.status,conclusion:run.conclusion,htmlUrl:run.html_url,createdAt:run.created_at,updatedAt:run.updated_at};
}

export async function runFlutterAgent(repo:string,branch:string,objective:string){if(!objective?.trim())throw new Error("objective is required");return {ok:true,repo,branch,objective,mode:"coding-agent",next:"Use the coding executor to inspect, edit, test and iterate in this workspace."};}

export function uiScreenSpec(name:string,components:string[]){return {name,viewport:{width:390,height:844},direction:"rtl",theme:"genesis-dark",components:components.map((c,i)=>({id:"c"+i,type:c}))};}
export async function seoGeoAudit(url:string){const r=await fetch(url,{redirect:"follow"});const html=await r.text();const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]??"").trim();const description=(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]??"").trim();const canonical=(html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i)?.[1]??"").trim();const h1=(html.match(/<h1\b/gi)??[]).length;return {url,status:r.status,title,description,canonical,h1,checks:{title:Boolean(title),description:Boolean(description),canonical:Boolean(canonical),singleH1:h1===1},geo:{llmsTxt:"/llms.txt",structuredData:/application\/ld\+json/i.test(html)}};}
