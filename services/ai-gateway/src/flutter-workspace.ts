
function token(){const t=process.env.GITHUB_TOKEN;if(!t)throw new Error("GITHUB_TOKEN is not configured");return t;}
async function gh(path:string,init:RequestInit={}){const r=await fetch("https://api.github.com"+path,{...init,headers:{Accept:"application/vnd.github+json",Authorization:"Bearer "+token(),"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json",...(init.headers??{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error("GitHub API "+r.status+": "+JSON.stringify(d).slice(0,1000));return d as any;}

export interface FlutterWorkspaceFile { path:string; content:string; sha?:string; }
export async function writeFlutterFile(repo:string,branch:string,file:FlutterWorkspaceFile,message:string){
  const [owner,name]=repo.split("/");
  if(!owner||!name)throw new Error("repo must be owner/name");
  const existing=await gh("/repos/"+repo+"/contents/"+file.path+"?ref="+encodeURIComponent(branch)).catch(()=>null);
  const body:any={message,content:Buffer.from(file.content,"utf8").toString("base64"),branch};
  if(existing?.sha)body.sha=existing.sha;
  return gh("/repos/"+repo+"/contents/"+file.path,{method:"PUT",body:JSON.stringify(body)});
}
export async function readFlutterFile(repo:string,branch:string,path:string){
  const data=await gh("/repos/"+repo+"/contents/"+path+"?ref="+encodeURIComponent(branch));
  const content=Buffer.from(String(data.content??"").replace(/\n/g,""),"base64").toString("utf8");
  return {path,branch,sha:data.sha,content};
}
export async function ensureFlutterBranch(repo:string,baseBranch:string,branch:string){
  const refs=await gh("/repos/"+repo+"/git/ref/heads/"+encodeURIComponent(branch)).catch(()=>null);
  if(refs?.object?.sha)return {branch,created:false,sha:refs.object.sha};
  const base=await gh("/repos/"+repo+"/git/ref/heads/"+encodeURIComponent(baseBranch));
  const created=await gh("/repos/"+repo+"/git/refs",{method:"POST",body:JSON.stringify({ref:"refs/heads/"+branch,sha:base.object.sha})});
  return {branch,created:true,sha:created.object?.sha};
}
