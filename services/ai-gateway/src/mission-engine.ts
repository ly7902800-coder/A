import {planMission,routeTools,Mission} from "./platform-core.js";
const missions=new Map<string,Mission>();
export function createMission(goal:string){const m=planMission(goal);missions.set(m.id,m);return m;}
export function getMission(id:string){return missions.get(id);}
export function suggestTools(intent:string){return routeTools(intent);}
