import { chatExtended } from "./extended-providers.js";
export type AgentRole="planner"|"architect"|"coder"|"reviewer"|"security"|"qa"|"devops";
const prompts:Record<AgentRole,string>={
 planner:"Turn the objective into a precise implementation plan with acceptance criteria.",
 architect:"Design the architecture, interfaces, data flow and integration boundaries.",
 coder:"Propose concrete implementation changes. Prefer small, testable changes.",
 reviewer:"Review the proposed plan for correctness, maintainability and missing cases.",
 security:"Threat-model the plan. Identify auth, secrets, permissions, isolation and supply-chain risks.",
 qa:"Create an executable test strategy and regression checklist.",
 devops:"Define CI/build/release/rollback requirements and observability."
};
export async function runMultiAgentTeam(objective:string,context="",model="anthropic/claude-opus-5-5"){
 const roles:AgentRole[]=["planner","architect","coder","reviewer","security","qa","devops"];
 const results=await Promise.all(roles.map(async role=>{
  const input="Role: "+role+"\n"+prompts[role]+"\nObjective: "+objective+"\nContext: "+context;
  try{return {role,ok:true,text:(await chatExtended({model,messages:[{role:"user",content:input}],maxTokens:12000})).text};}
  catch(error){return {role,ok:false,error:error instanceof Error?error.message:"agent failed"};}
 }));
 const synthesis="You are the lead CTO. Synthesize the following specialist reports into one implementation plan. Preserve disagreements as risks, do not invent completed work. Objective: "+objective+"\nReports:\n"+results.map(r=>r.role+": "+("text" in r?r.text:r.error)).join("\n\n");
 const final=await chatExtended({model,messages:[{role:"user",content:synthesis}],maxTokens:16000});
 return {objective,agents:results,synthesis:final.text};
}
