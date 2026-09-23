import {createServer,IncomingMessage,ServerResponse} from "node:http";
import {randomUUID} from "node:crypto";
import {spawn,execFileSync} from "node:child_process";
import {mkdir,rm,readdir,stat} from "node:fs/promises";
import {existsSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import Redis from "ioredis";
import {getRecipe,BuildTarget} from "./recipes.js";

const port=Number(process.env.PORT??8090);
const token=process.env.BUILD_WORKER_TOKEN??"";
const root=process.env.WORK_ROOT??join(tmpdir(),"genesis-builds");
const redis=process.env.REDIS_URL?new Redis(process.env.REDIS_URL,{maxRetriesPerRequest:2}):null;
type Job={id:string;status:"queued"|"running"|"succeeded"|"failed";target:BuildTarget;repo:string;branch:string;createdAt:string;startedAt?:string;finishedAt?:string;logs:string[];artifacts:string[];error?:string};
const jobs=new Map<string,Job>();

function json(res:ServerResponse,status:number,data:unknown){res.statusCode=status;res.setHeader("Content-Type","application/json");res.end(JSON.stringify(data));}
function authorized(req:IncomingMessage){return !token||req.headers.authorization==="Bearer "+token;}
async function body(req:IncomingMessage){let s="";for await(const c of req){s+=c;if(s.length>256000)throw new Error("Request body too large");}return s?JSON.parse(s):{};}
function has(cmd:string){try{execFileSync("sh",["-lc","command -v "+cmd],{stdio:"ignore",timeout:3000});return true;}catch{return false;}}
async function save(j:Job){if(redis)await redis.set("genesis:build:"+j.id,JSON.stringify(j),"EX",86400);}
async function get(id:string){const j=jobs.get(id);if(j)return j;if(redis){const x=await redis.get("genesis:build:"+id);if(x)return JSON.parse(x) as Job;}return null;}
async function command(j:Job,cwd:string,args:string[],timeout:number){
 j.logs.push("$ "+args.join(" "));await save(j);
 return new Promise<void>((resolve,reject)=>{const p=spawn(args[0],args.slice(1),{cwd,shell:false,env:{...process.env,CI:"1"}});
 const timer=setTimeout(()=>{p.kill("SIGTERM");setTimeout(()=>p.kill("SIGKILL"),5000);reject(new Error("Command timed out: "+args[0]));},timeout);
 p.stdout.on("data",x=>j.logs.push(String(x).slice(-8000)));p.stderr.on("data",x=>j.logs.push(String(x).slice(-8000)));
 p.on("error",e=>{clearTimeout(timer);reject(e);});p.on("close",c=>{clearTimeout(timer);c===0?resolve():reject(new Error("Command failed with exit code "+c));});
 });}
function clone(repo:string,branch:string,cwd:string){
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo))throw new Error("repo must be owner/name");
 const t=process.env.GITHUB_TOKEN;
 const url=t?"https://x-access-token:"+encodeURIComponent(t)+"@github.com/"+repo+".git":"https://github.com/"+repo+".git";
 execFileSync("git",["clone","--depth","1","--branch",branch,url,cwd],{stdio:"pipe",timeout:180000});
}
async function run(j:Job){
 const r=getRecipe(j.target);j.status="running";j.startedAt=new Date().toISOString();await save(j);
 const cwd=join(root,j.id);
 try{
  const missing=r.requiredCommands.filter(x=>!has(x));if(missing.length)throw new Error("Missing tools: "+missing.join(", "));
  await mkdir(root,{recursive:true});await mkdir(cwd,{recursive:true});clone(j.repo,j.branch,cwd);
  for(const c of r.commands)await command(j,cwd,c,r.timeoutMs);
  j.artifacts=[];for(const p of r.artifacts){if(existsSync(join(cwd,p)))j.artifacts.push(p);}
  j.status="succeeded";
 }catch(e){j.status="failed";j.error=e instanceof Error?e.message:"Build failed";j.logs.push(j.error);}
 j.finishedAt=new Date().toISOString();await save(j);setTimeout(()=>rm(cwd,{recursive:true,force:true}).catch(()=>{}),30000);
}
const server=createServer(async(req,res)=>{
 try{
  if(req.url==="/health"&&req.method==="GET")return json(res,200,{ok:true,service:"genesis-build-worker",redis:!!redis});
  if(!authorized(req))return json(res,401,{error:"Unauthorized"});
  if(req.url==="/v1/capabilities"&&req.method==="GET"){const ts=["node","python","flutter-apk","flutter-aab","blender","godot","unity","unreal"] as BuildTarget[];return json(res,200,Object.fromEntries(ts.map(t=>{const r=getRecipe(t);return [t,{available:r.requiredCommands.every(has),missing:r.requiredCommands.filter(x=>!has(x))}]})));}
  if(req.url==="/v1/builds"&&req.method==="POST"){const b=await body(req);if(typeof b.repo!=="string"||typeof b.branch!=="string"||typeof b.target!=="string")return json(res,400,{error:"repo, branch and target are required"});const r=getRecipe(b.target);const j:Job={id:randomUUID(),status:"queued",target:b.target,repo:b.repo,branch:b.branch,createdAt:new Date().toISOString(),logs:[],artifacts:[]};jobs.set(j.id,j);await save(j);void run(j);return json(res,202,{jobId:j.id,status:j.status,target:j.target,missingTools:r.requiredCommands.filter(x=>!has(x))});}
  const m=req.url?.match(/^\/v1\/builds\/([^/]+)$/);if(m&&req.method==="GET"){const j=await get(m[1]);return j?json(res,200,j):json(res,404,{error:"Build not found"});}
  return json(res,404,{error:"Not found"});
 }catch(e){return json(res,500,{error:e instanceof Error?e.message:"Internal server error"});}
});
server.listen(port,()=>console.log("Genesis Build Worker listening on "+port));
