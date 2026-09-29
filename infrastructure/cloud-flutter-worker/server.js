import http from "node:http";
import {exec,spawn} from "node:child_process";
import {promisify} from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {WebSocketServer} from "ws";
const sh=promisify(exec); const PORT=Number(process.env.PORT||8090); const ROOT="/workspace";
await fs.mkdir(ROOT,{recursive:true});
const sessions=new Map();
function safeId(x){return String(x||"").replace(/[^a-zA-Z0-9._-]/g,"").slice(0,80)||crypto.randomUUID()}
function dir(s){return path.join(ROOT,safeId(s))}
async function run(cmd,cwd,timeout=120000){return await sh(cmd,{cwd,timeout,maxBuffer:2000000})}
async function ensure(s,repo,branch){const d=dir(s);try{await fs.access(path.join(d,".git"))}catch{await fs.mkdir(d,{recursive:true});const token=process.env.GITHUB_TOKEN;const url=token?"https://x-access-token:"+encodeURIComponent(token)+"@github.com/"+repo+".git":"https://github.com/"+repo+".git";await run("git clone --branch "+JSON.stringify(branch)+" --single-branch "+JSON.stringify(url)+" .",d,180000)}return d}
function send(res,status,data){res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(data))}
async function body(req){let b="";for await(const c of req)b+=c;if(b.length>200000)throw new Error("request too large");return b?JSON.parse(b):{}}
const server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,"http://localhost");if(u.pathname==="/health")return send(res,200,{ok:true,service:"genesis-cloud-flutter-worker"});if(req.method!=="POST")return send(res,404,{error:"not found"});const b=await body(req),session=safeId(b.sessionId),repo=b.repo,branch=b.branch;if(!repo||!branch)return send(res,400,{error:"repo and branch are required"});const d=await ensure(session,repo,branch);if(u.pathname==="/v1/workspace/start"){await run("flutter pub get",path.join(d,"apps/mobile"),180000);return send(res,200,{ok:true,sessionId:session})}if(u.pathname==="/v1/workspace/command"){const allowed=["flutter pub get","flutter analyze","flutter test","flutter build apk --release","flutter build appbundle --release","flutter build web --release","dart format .","git status --short"];if(!allowed.includes(b.command))return send(res,400,{error:"command not allowed",allowed});const r=await run(b.command,path.join(d,"apps/mobile"),180000);return send(res,200,{ok:true,stdout:r.stdout,stderr:r.stderr})}return send(res,404,{error:"unknown route"})}catch(e){send(res,500,{error:e instanceof Error?e.message:String(e)})}});
const wss=new WebSocketServer({server,path:"/v1/terminal"});
wss.on("connection",ws=>{let proc=null;ws.on("message",async raw=>{try{const m=JSON.parse(String(raw)),d=await ensure(safeId(m.sessionId),m.repo,m.branch);if(m.type==="exec"){const allowed=["flutter pub get","flutter analyze","flutter test","flutter build apk --release","flutter build appbundle --release","flutter build web --release","dart format .","git status --short"];if(!allowed.includes(m.command))return ws.send(JSON.stringify({type:"error",message:"command not allowed"}));proc=spawn("bash",["-lc",m.command],{cwd:path.join(d,"apps/mobile"),env:{...process.env,TERM:"xterm-256color"}});proc.stdout.on("data",x=>ws.send(JSON.stringify({type:"stdout",data:x.toString()})));proc.stderr.on("data",x=>ws.send(JSON.stringify({type:"stderr",data:x.toString()})));proc.on("close",code=>ws.send(JSON.stringify({type:"exit",code})))}if(m.type==="stop"&&proc)proc.kill("SIGTERM")}catch(e){ws.send(JSON.stringify({type:"error",message:String(e)}))}})});
server.listen(PORT);