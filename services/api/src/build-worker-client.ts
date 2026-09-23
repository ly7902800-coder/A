const base=()=>process.env.BUILD_WORKER_URL??"";
const headers=()=>{const h:Record<string,string>={"Content-Type":"application/json"};if(process.env.BUILD_WORKER_TOKEN)h.Authorization="Bearer "+process.env.BUILD_WORKER_TOKEN;return h;};
async function call(path:string,init:RequestInit={}){
 const url=base()+path;if(!base())throw new Error("BUILD_WORKER_URL is not configured");
 const r=await fetch(url,{...init,headers:{...headers(),...(init.headers??{})}});
 const text=await r.text();let data:unknown;try{data=JSON.parse(text)}catch{data={raw:text}};
 if(!r.ok)throw new Error("Build worker returned "+r.status+": "+JSON.stringify(data));return data as any;
}
export async function buildWorkerCapabilities(){return call("/v1/capabilities");}
export async function createBuildJob(input:{repo:string;branch:string;target:string}){return call("/v1/builds",{method:"POST",body:JSON.stringify(input)});}
export async function getBuildJob(id:string){return call("/v1/builds/"+encodeURIComponent(id));}
