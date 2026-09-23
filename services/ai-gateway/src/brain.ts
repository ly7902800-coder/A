import { createMission, type Mission } from "./mission.js";
import { planParallelAgents } from "./parallel-agents.js";
export interface BrainPlan { objective:string; mission:Mission; parallelTasks:ReturnType<typeof planParallelAgents>; risk:"low"|"medium"|"high"; approvals:string[]; }
export function createBrainPlan(objective:string):BrainPlan{
 const risk=/delete|publish|deploy|payment|billing|credentials|external action/i.test(objective)?"high":/database|auth|api|production/i.test(objective)?"medium":"low";
 const approvals=risk==="high"?["external side effects","publish/deploy","destructive changes"]:risk==="medium"?["production changes","credential changes"]:[];
 return {objective,mission:createMission(objective),parallelTasks:planParallelAgents(objective),risk,approvals};
}
