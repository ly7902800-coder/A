import {discoverPlatform,planPlatformMission,listPlatformTargets,type PlatformTarget} from "./universal-platform-agent.js";
export interface Connector{platformId:string;auth:"oauth"|"api_key"|"browser";status:"ready"|"credential_required"|"browser_required";capabilities:string[];connectUrl?:string;}
export function listConnectors():Connector[]{return listPlatformTargets().map(p=>({platformId:p.id,auth:(p.auth[0]==="connector"?"browser":p.auth[0]) as Connector["auth"],status:p.id==="google"?"ready":"credential_required",capabilities:p.capabilities}));}
export function resolveConnector(input:string){const p=discoverPlatform(input);if(!p)return null;return {connector:listConnectors().find(c=>c.platformId===p.id),platform:p};}
export function createIntegrationPlan(objective:string,platform:string){const p=discoverPlatform(platform);if(!p)throw new Error("Platform not found in connector catalog");return planPlatformMission(objective,p);}
export type {PlatformTarget};
