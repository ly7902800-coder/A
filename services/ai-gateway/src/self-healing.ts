export interface HealingPlan { error:string; causeCandidates:string[]; fixes:string[]; validation:string[]; approvalRequired:boolean; }
export function createHealingPlan(error:string):HealingPlan{
 const text=error.toLowerCase(); const causes:string[]=[]; const fixes:string[]=[];
 if(text.includes("module")||text.includes("import")){causes.push("Missing or incompatible dependency/import");fixes.push("Resolve module path or dependency version, then rebuild.");}
 if(text.includes("type")||text.includes("typescript")){causes.push("TypeScript type mismatch");fixes.push("Correct the affected types and rerun typecheck.");}
 if(text.includes("401")||text.includes("403")){causes.push("Authentication or permission failure");fixes.push("Revalidate the connector and requested scopes; do not bypass authorization.");}
 if(text.includes("timeout")||text.includes("network")){causes.push("Network or provider timeout");fixes.push("Retry with bounded backoff and verify provider health.");}
 if(!causes.length){causes.push("Unknown build/runtime failure");fixes.push("Inspect logs and isolate the smallest failing component.");}
 return {error,causeCandidates:causes,fixes,validation:["typecheck","automated tests","rebuild"],approvalRequired:true};
}
