export type MissionStepStatus = "pending" | "running" | "completed" | "failed" | "blocked" | "approval_required";

export interface MissionStep { id:string; name:string; agent:string; status:MissionStepStatus; dependsOn:string[]; description:string; }
export interface Mission { id:string; objective:string; status:"planning"|"running"|"completed"|"failed"|"blocked"; createdAt:string; steps:MissionStep[]; }

const missions = new Map<string,Mission>();

export function createMission(objective:string): Mission {
  const id = `mission_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  const steps:MissionStep[] = [
    {id:"planning",name:"Planning",agent:"planner",status:"pending",dependsOn:[],description:"Convert the objective into an executable technical plan."},
    {id:"architecture",name:"Architecture",agent:"architect",status:"pending",dependsOn:["planning"],description:"Choose project architecture, services and integrations."},
    {id:"ui",name:"UI Design",agent:"ui-designer",status:"pending",dependsOn:["planning"],description:"Define screens, components and responsive behavior."},
    {id:"backend",name:"Backend",agent:"coder",status:"pending",dependsOn:["architecture"],description:"Implement APIs, business logic and data access."},
    {id:"database",name:"Database",agent:"database-engineer",status:"pending",dependsOn:["architecture"],description:"Design schema, migrations, indexes and policies."},
    {id:"integration",name:"Integrations",agent:"integration-agent",status:"pending",dependsOn:["architecture"],description:"Connect approved external services and validate credentials."},
    {id:"testing",name:"Testing",agent:"qa",status:"pending",dependsOn:["ui","backend","database","integration"],description:"Run automated quality, security and integration checks."},
    {id:"build",name:"Build",agent:"devops",status:"pending",dependsOn:["testing"],description:"Create the requested build artifacts."},
    {id:"release",name:"Release",agent:"devops",status:"approval_required",dependsOn:["build"],description:"Publish or deploy only after explicit user approval."}
  ];
  const mission:Mission={id,objective,status:"planning",createdAt:new Date().toISOString(),steps};
  missions.set(id,mission); return mission;
}
export function getMission(id:string){return missions.get(id);}
export function listMissions(){return [...missions.values()];}
export function updateMissionStep(id:string,stepId:string,status:MissionStepStatus){
  const m=missions.get(id); if(!m) return undefined; const s=m.steps.find(x=>x.id===stepId); if(!s) return undefined;
  s.status=status; m.status=m.steps.some(x=>x.status==="failed")?"failed":m.steps.every(x=>x.status==="completed"||x.status==="approval_required")?"completed":"running"; return m;
}
export function nextReadySteps(id:string){const m=missions.get(id); if(!m)return []; return m.steps.filter(s=>s.status==="pending"&&s.dependsOn.every(d=>m.steps.find(x=>x.id===d)?.status==="completed"));}
