const API=window.GENESIS_API_URL||"http://localhost:8080";
const projectId=localStorage.getItem("genesis_project_id")||"default-web";
localStorage.setItem("genesis_project_id",projectId);

async function api(path,options={}){const r=await fetch(API+path,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d;}

const send=document.querySelector(".composer button"),box=document.querySelector("textarea");
const output=document.createElement("div");output.className="result";document.querySelector("section").appendChild(output);

async function sendTask(){
 const message=box.value.trim();if(!message)return;
 output.textContent="⏳ Genesis يحلل المهمة...";
 try{
  const data=await api("/v1/mission",{method:"POST",body:JSON.stringify({objective:message,projectId})});
  output.textContent="✅ تم إنشاء المهمة. أي إجراء خارجي سيحتاج موافقتك.";
  console.log(data);
 }catch(e){output.textContent="❌ "+e.message;}
 box.value="";
}
send.addEventListener("click",sendTask);
box.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendTask();}});

const integration=document.querySelector('aside button:nth-of-type(7)');
if(integration)integration.addEventListener("click",async()=>{
 try{
  const d=await api("/v1/connectors");
  output.textContent="🔌 المنصات المتاحة: "+d.connectors.map(x=>x.platform||x.id).join(" • ");
 }catch(e){output.textContent="❌ "+e.message;}
});

async function requestLinkedAccount(platformId,scopes,reason){
 const req=await api("/v1/account-access/request",{method:"POST",body:JSON.stringify({projectId,platformId,mode:"linked_browser",scopes,reason})});
 if(!confirm("Genesis يطلب إذنك للوصول إلى "+platformId+" ضمن: "+scopes.join(", ")+"\n\nهل توافق؟"))return req;
 return api("/v1/account-access/approve",{method:"POST",body:JSON.stringify({requestId:req.id})});
}
window.GenesisAccount={requestLinkedAccount,projectId};
