export interface ProjectDNA { projectId:string; name?:string; type?:string; stack:string[]; integrations:string[]; requirements:string[]; decisions:Array<{decision:string;reason:string;at:string}>; knownIssues:string[]; updatedAt:string; }
const dna=new Map<string,ProjectDNA>();
export function getProjectDNA(projectId:string){return dna.get(projectId);}
export function upsertProjectDNA(input:Omit<ProjectDNA,"updatedAt">){const value={...input,updatedAt:new Date().toISOString()}; dna.set(input.projectId,value); return value;}
export function addProjectDecision(projectId:string,decision:string,reason:string){const current=dna.get(projectId)??{projectId,stack:[],integrations:[],requirements:[],decisions:[],knownIssues:[],updatedAt:""}; current.decisions.push({decision,reason,at:new Date().toISOString()}); current.updatedAt=new Date().toISOString(); dna.set(projectId,current); return current;}
