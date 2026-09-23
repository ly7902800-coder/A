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
async function ensureConversation(){if(conversationId)return conversationId;const d=await api("/v1/chats",{method:"POST",body:JSON.stringify({projectId,title:"Genesis Chat"}));conversationId=d.chat.id;localStorage.setItem("genesis_conversation_id",conversationId);return conversationId;}
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
  {id:"flutter",icon:"🦋",name:"Flutter",type:"تطبيقات Android / iOS / Web",target:"flutter-apk",desc:"منصة رئيسية لبناء تطبيقات الهاتف والويب من مشروع واحد."},
  {id:"react-native",icon:"⚛️",name:"React Native",type:"تطبيقات Android / iOS",target:"node",desc:"بناء تطبيقات أصلية متعددة المنصات باستخدام React وJavaScript/TypeScript."},
  {id:"expo",icon:"📱",name:"Expo",type:"React Native + Mobile",target:"node",desc:"تطوير وبناء ونشر تطبيقات React Native بسرعة ضمن بيئة سحابية."},
  {id:"android-kotlin",icon:"🤖",name:"Android + Kotlin",type:"Android Native",target:"node",desc:"بناء تطبيقات Android أصلية باستخدام Kotlin وواجهات Android."},
  {id:"ionic",icon:"⚡",name:"Ionic",type:"Hybrid Mobile Apps",target:"node",desc:"إنشاء تطبيقات الهاتف باستخدام تقنيات الويب مع Capacitor."},
  {id:"dotnet-maui",icon:"🔷",name:".NET MAUI",type:"Cross-platform Apps",target:"node",desc:"بناء تطبيقات Android وiOS وWindows من قاعدة كود مشتركة."},
  {id:"python",icon:"🐍",name:"Python",type:"Backend + Libraries",target:"python",desc:"بيئة سحابية للـ APIs والخدمات الخلفية والمكتبات والسكربتات التي تخدم التطبيقات."},
  {id:"node",icon:"🟢",name:"Node.js",type:"Backend + npm",target:"node",desc:"تشغيل JavaScript/TypeScript، بناء APIs، وإدارة مكتبات npm."},
  {id:"termux",icon:"⌨️",name:"Termux",type:"Terminal + Commands",target:"node",desc:"واجهة أوامر وأدوات تطوير؛ داخل Genesis تُنفذ الأوامر عبر بيئة سحابية آمنة."},
  {id:"capacitor",icon:"🔌",name:"Capacitor",type:"Web → Native Apps",target:"node",desc:"تحويل تطبيقات الويب إلى تطبيقات Android وiOS مع الوصول إلى قدرات الجهاز."}
];
function renderCloudPlatforms(){
  output.innerHTML='<div class="cloud-workspace"><div class="cloud-head"><div><h2>☁️ منصات بناء التطبيقات</h2><p>هذا القسم مخصص حصريًا لتطوير وبناء التطبيقات. Genesis يستخدم هذه البيئات لإنشاء المشروع، تثبيت المكتبات، تشغيل الأوامر، الاختبارات، وإخراج ملفات البناء.</p></div><span class="cloud-badge">10 منصات</span></div><div class="platform-grid">'+CLOUD_PLATFORMS.map(p=>'<article class="platform-card"><div class="platform-icon">'+p.icon+'</div><div class="platform-main"><h3>'+p.name+'</h3><span>'+p.type+'</span><p>'+p.desc+'</p><div class="platform-actions"><button data-run="'+p.id+'">▶ تشغيل البيئة</button><button class="ghost" data-info="'+p.id+'">ℹ التفاصيل</button></div></div></article>').join('')+'</div><div id="platformResult" class="platform-result">اختر منصة لبدء إنشاء أو بناء تطبيق.</div></div>';
  output.querySelectorAll("[data-run]").forEach(btn=>btn.onclick=()=>runCloudPlatform(btn.dataset.run));
  output.querySelectorAll("[data-info]").forEach(btn=>btn.onclick=()=>showPlatformInfo(btn.dataset.info));
}
async function runCloudPlatform(id){
  const p=CLOUD_PLATFORMS.find(x=>x.id===id), box=document.getElementById("platformResult");
  if(!p||!box)return;
  if(!token()){box.textContent="🔐 سجّل الدخول أولًا.";return;}
  box.textContent="⏳ يتم تجهيز بيئة "+p.name+"...";
  try{
    const d=await api("/v1/execution/build",{method:"POST",body:JSON.stringify({repo:"ly7902800-coder/A",branch:"main",target:p.target})});
    box.textContent="✅ تم إنشاء مهمة "+p.name+": "+(d.id||d.jobId||"بدون رقم")+" — النتيجة والسجلات تظهر في Build وLogs.";
  }catch(e){box.textContent="❌ "+e.message;}
}
function showPlatformInfo(id){
  const p=CLOUD_PLATFORMS.find(x=>x.id===id);
  const box=document.getElementById("platformResult");
  if(box&&p)box.textContent="🔎 "+p.name+" — "+p.type+" — "+p.desc;
}
if(cloudPlatformsBtn)cloudPlatformsBtn.onclick=renderCloudPlatforms;
