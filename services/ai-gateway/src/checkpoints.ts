export interface Checkpoint { id:string; projectId:string; label:string; snapshotRef?:string; createdAt:string; }
const checkpoints=new Map<string,Checkpoint[]>();
export function createCheckpoint(projectId:string,label:string,snapshotRef?:string){const c={id:`cp_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,projectId,label,snapshotRef,createdAt:new Date().toISOString()}; const list=checkpoints.get(projectId)??[]; list.push(c); checkpoints.set(projectId,list); return c;}
export function listCheckpoints(projectId:string){return checkpoints.get(projectId)??[];}
export function latestCheckpoint(projectId:string){const list=listCheckpoints(projectId);return list.at(-1);}
