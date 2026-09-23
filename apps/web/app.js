const API=window.GENESIS_API_URL||"http://localhost:8080";
const projectId=localStorage.getItem("genesis_project_id")||"default-web";
let conversationId=localStorage.getItem("genesis_conversation_id")||"";
const tokenKey="genesis_session_token";
localStorage.setItem("genesis_project_id",projectId);
const state=document.getElementById("sessionState");
const authPanel=document.getElementById("authPanel");
const output=document.createElement("div");output.className="result chat-log";document.querySelector("section").prepend(output);
function token(){return localStorage.getItem(tokenKey)||"";}
async function api(path,options={}){const headers={"Content-Type":"application/json",...(options.headers||{})};const t=token();if(t)headers.Authorization="Bearer "+t;const r=await fetch(API+path,{...options,headers});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||`HTTP ${r.status}`);return d;}
function setLoggedIn(user){state.textContent="● "+(user?.display_name||user?.email||"حساب متصل");authPanel.style.display="none";}
async function restore(){if(!token())return;try{const d=await api("/v1/auth/me");setLoggedIn(d.user);}catch{localStorage.removeItem(tokenKey);}}
async function auth(mode){const email=document.getElementById("authEmail").value.trim(),password=document.getElementById("authPassword").value,name=document.getElementById("authName").value.trim();if(!email||!password)throw new Error("أدخل البريد وكلمة المرور");const d=await api("/v1/auth/"+mode,{method:"POST",body:JSON.stringify({email,password,displayName:name||undefined})});localStorage.setItem(tokenKey,d.token);setLoggedIn(d.user);output.textContent="✅ تم الاتصال بـ Genesis AI.";}
document.getElementById("loginBtn").onclick=()=>auth("login").catch(e=>output.textContent="❌ "+e.message);
document.getElementById("signupBtn").onclick=()=>auth("signup").catch(e=>output.textContent="❌ "+e.message);
const send=document.querySelector(".composer button"),box=document.querySelector("textarea"),modelSelect=document.getElementById("modelSelect");
async function loadModels(){if(!modelSelect||!token())return;try{const d=await api("/v1/models/catalog");modelSelect.innerHTML='<option value="auto">⚡ تلقائي</option>';for(const m of d.models||[]){const o=document.createElement("option");o.value=m.id;o.textContent=m.name+" — "+m.provider+" ["+(m.capabilities||[]).join(", ")+"]";modelSelect.appendChild(o);}}catch(e){console.warn("model catalog",e);}}
async function ensureConversation(){if(conversationId)return conversationId;const d=await api("/v1/chats",{method:"POST",body:JSON.stringify({projectId,title:"Genesis Chat")});conversationId=d.chat.id;localStorage.setItem("genesis_conversation_id",conversationId);return conversationId;}
function addMessage(role,text){const el=document.createElement("div");el.className="msg "+role;el.textContent=text;output.appendChild(el);output.scrollTop=output.scrollHeight;}
async function sendTask(){const message=box.value.trim();if(!message)return;if(!token()){output.textContent="🔐 سجّل الدخول أولًا.";return;}addMessage("user",message);box.value="";const thinking=document.createElement("div");thinking.className="msg assistant";thinking.textContent="⏳ Genesis يعمل...";output.appendChild(thinking);try{const data=await api("/v1/chat/completions",{method:"POST",body:JSON.stringify({model:modelSelect?.value||"auto",messages:[{role:"user",content:message}],projectId,conversationId:await ensureConversation()})});thinking.textContent=data.text||"تم التنفيذ.";conversationId=data.conversationId||conversationId;localStorage.setItem("genesis_conversation_id",conversationId);}catch(e){thinking.textContent="❌ "+e.message;}}
send.addEventListener("click",sendTask);box.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendTask();}});
const integration=document.getElementById("integrations");if(integration)integration.addEventListener("click",async()=>{try{const d=await api("/v1/connectors");output.textContent="🔌 "+(d.connectors||[]).map(x=>x.platform||x.id).join(" • ");}catch(e){output.textContent="❌ "+e.message;}});
async function requestLinkedAccount(platformId,scopes,reason){const req=await api("/v1/account-access/request",{method:"POST",body:JSON.stringify({projectId,platformId,mode:"linked_browser",scopes,reason})});if(!confirm("Genesis يطلب إذنك للوصول إلى "+platformId+" ضمن: "+scopes.join(", ")+"\\n\\nهل توافق؟"))return req;return api("/v1/account-access/approve",{method:"POST",body:JSON.stringify({requestId:req.id})});}
window.GenesisAccount={requestLinkedAccount,projectId};restore().then(loadModels);
const selfImprove=document.getElementById("selfImproveBtn");
if(selfImprove)selfImprove.onclick=async()=>{if(!token()){output.textContent="🔐 سجّل الدخول أولًا.";return;}const objective=prompt("ما الذي تريد أن يطوره Genesis في نفسه؟","حسّن الاعتمادية، الاختبارات، الأدوات، وسير التطوير الذاتي");if(!objective)return;selfImprove.disabled=true;output.textContent="🧠 بدأ Genesis دورة التطوير الذاتي...";try{const d=await api("/v1/self-development/run",{method:"POST",body:JSON.stringify({objective,mode:"self-improve",maxIterations:8,createPullRequest:true})});output.textContent="✅ اكتملت الدورة: "+JSON.stringify(d,null,2);}catch(e){output.textContent="❌ "+e.message;}finally{selfImprove.disabled=false;}};
const uiBtn=document.getElementById("uiDesignerBtn");
if(uiBtn)uiBtn.onclick=()=>{output.innerHTML='<div class="designer"><h3>🎨 UI Designer</h3><input id="screenName" placeholder="اسم الشاشة" value="Home"><textarea id="components" placeholder="Button,Card,TextField,Navigation">Header,Hero,Card,TextField,Button,Navigation</textarea><button id="makeSpec">إنشاء مواصفة الشاشة</button><pre id="specOut"></pre></div>';document.getElementById("makeSpec").onclick=async()=>{try{const name=document.getElementById("screenName").value||"Home";const components=document.getElementById("components").value.split(",").map(x=>x.trim()).filter(Boolean);const d=await api("/v1/ui/screen",{method:"POST",body:JSON.stringify({name,components})});document.getElementById("specOut").textContent=JSON.stringify(d,null,2);}catch(e){document.getElementById("specOut").textContent="❌ "+e.message;}};};


const cloudPlatformsBtn=document.getElementById("cloudPlatformsBtn");
const CLOUD_PLATFORMS=[
  {id:"flutter",icon:"🦋",name:"Flutter",type:"تطبيقات Android / iOS / Web",target:"flutter-apk",desc:"بناء تطبيقات متعددة المنصات وتشغيل الاختبارات."},
  {id:"python",icon:"🐍",name:"Python",type:"Runtime + مكتبات + سكربتات",target:"python",desc:"تشغيل Python، فحص الكود، والمكتبات والمهام الآلية."},
  {id:"termux",icon:"⌨️",name:"Termux",type:"بيئة طرفية Android",target:"node",desc:"بيئة أوامر شبيهة بالطرفية لمهام Android؛ التنفيذ السحابي يمر عبر Worker."},
  {id:"node",icon:"🟢",name:"Node.js",type:"Backend + أدوات JavaScript",target:"node",desc:"تشغيل npm، بناء خدمات Node.js واختبارها."},
  {id:"docker",icon:"🐳",name:"Docker",type:"Containers + DevOps",target:"node",desc:"بيئات معزولة وحزم بناء قابلة للتكرار."},
  {id:"blender",icon:"🧊",name:"Blender",type:"3D + Assets",target:"blender",desc:"معالجة ملفات 3D، سكربتات Python، وتجهيز أصول الألعاب."},
  {id:"godot",icon:"🎮",name:"Godot",type:"محرك ألعاب 2D / 3D",target:"godot",desc:"إنشاء وفحص مشاريع ألعاب Godot."},
  {id:"unity",icon:"🕹️",name:"Unity",type:"محرك ألعاب 2D / 3D",target:"unity",desc:"مسار تنفيذ Unity جاهز للـ runner المرخّص."},
  {id:"unreal",icon:"⚡",name:"Unreal Engine",type:"3D + C++ + Blueprints",target:"unreal",desc:"مسار تنفيذ Unreal يحتاج runner سحابي مزودًا بالمحرك."},
  {id:"playwright",icon:"🧪",name:"Playwright",type:"Browser Automation + Testing",target:"node",desc:"اختبارات المتصفح والأتمتة ضمن Worker."}
];
function renderCloudPlatforms(){
  output.innerHTML='<div class="cloud-workspace"><div class="cloud-head"><div><h2>☁️ المنصات السحابية وبيئات التنفيذ</h2><p>بيئات كمبيوتر سحابية يستخدمها Genesis لبناء التطبيقات والألعاب وتشغيل المكتبات والأوامر والاختبارات.</p></div><span class="cloud-badge">10 منصات</span></div><div class="platform-grid">'+CLOUD_PLATFORMS.map(p=>'<article class="platform-card"><div class="platform-icon">'+p.icon+'</div><div class="platform-main"><h3>'+p.name+'</h3><span>'+p.type+'</span><p>'+p.desc+'</p><div class="platform-actions"><button data-run="'+p.id+'">▶ تشغيل</button><button class="ghost" data-info="'+p.id+'">ℹ التفاصيل</button></div></div></article>').join('')+'</div><div id="platformResult" class="platform-result">اختر منصة لبدء مهمة تنفيذ أو بناء.</div></div>';
  output.querySelectorAll("[data-run]").forEach(btn=>btn.onclick=()=>runCloudPlatform(btn.dataset.run));
  output.querySelectorAll("[data-info]").forEach(btn=>btn.onclick=()=>showPlatformInfo(btn.dataset.info));
}
async function runCloudPlatform(id){
  const p=CLOUD_PLATFORMS.find(x=>x.id===id), box=document.getElementById("platformResult");
  if(!p||!box)return;
  if(!token()){box.textContent="🔐 سجّل الدخول أولًا.";return;}
  if(!["flutter","python","node","blender","godot"].includes(id)){
    box.textContent="ℹ️ "+p.name+" مضاف كمسار تنفيذ. يحتاج Runner/بيئة مناسبة قبل التشغيل الفعلي من السحابة.";
    return;
  }
  box.textContent="⏳ يتم إرسال مهمة "+p.name+" إلى Execution Worker...";
  try{
    const d=await api("/v1/execution/build",{method:"POST",body:JSON.stringify({repo:"ly7902800-coder/A",branch:"main",target:p.target})});
    box.textContent="✅ تم إنشاء المهمة: "+(d.id||d.jobId||"بدون رقم")+" — يمكنك متابعة السجل من Logs.";
  }catch(e){box.textContent="❌ "+e.message;}
}
function showPlatformInfo(id){
  const p=CLOUD_PLATFORMS.find(x=>x.id===id);
  const box=document.getElementById("platformResult");
  if(box&&p)box.textContent="🔎 "+p.name+" — "+p.type+" — "+p.desc;
}
if(cloudPlatformsBtn)cloudPlatformsBtn.onclick=renderCloudPlatforms;
