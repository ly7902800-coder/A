import { Agent, run } from "@openai/agents";
export async function runOpenAIAgent(input:string,model=process.env.OPENAI_AGENT_MODEL??"gpt-5.4"){
 if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured");
 const agent=new Agent({name:"Genesis Agent",instructions:"You are a production software engineering agent. Be precise, safe and concise.",model});
 const result=await run(agent,input,{maxTurns:8});
 return {output:result.finalOutput,history:result.history,lastResponseId:result.lastResponseId};
}
