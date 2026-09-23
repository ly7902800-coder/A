export interface AgentTask { id:string; agent:string; input:string; dependsOn:string[]; status:"pending"|"running"|"completed"|"failed"; }
export function planParallelAgents(objective:string):AgentTask[]{
 return [
  {id:"planner",agent:"planner",input:objective,dependsOn:[],status:"pending"},
  {id:"ui",agent:"ui-designer",input:objective,dependsOn:["planner"],status:"pending"},
  {id:"backend",agent:"coder",input:objective,dependsOn:["planner"],status:"pending"},
  {id:"database",agent:"database-engineer",input:objective,dependsOn:["planner"],status:"pending"},
  {id:"security",agent:"security",input:objective,dependsOn:["planner"],status:"pending"},
  {id:"qa",agent:"qa",input:objective,dependsOn:["ui","backend","database","security"],status:"pending"}
 ];
}
