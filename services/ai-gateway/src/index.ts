import { getProviderConfig, getSecretForProvider } from "./providers.js";
import type { ProviderName } from "./types.js";
import { discoverModels } from "./model-discovery.js";
import { listModels } from "./models.js";
import { routeChat } from "./router.js";
import { streamChat } from "./stream.js";
import { runAgentPipeline } from "./orchestrator.js";
import { createDefaultToolRegistry } from "./tools.js";
import { decideApproval, listApprovals, consumeApproval } from "./approvals.js";
import { research } from "./research.js";
import { FirecrawlResearchProvider } from "./tool-adapters.js";
import { routeModel } from "./auto-router.js";
import { smartRoute } from "./smart-router.js";
import { createArenaPlan } from "./model-arena.js";
import { validateProjectSpec, type ProjectSpec } from "./project-spec.js";
import { createBuildPlan as pipelineBuildPlan, type BuildRequest } from "./build-pipeline.js";
import { createQAChecks } from "./qa-agent.js";
import { planMultiplayer } from "./multiplayer.js";
import { createAssetPipeline } from "./asset-pipeline.js";
import { createScenePlan } from "./scene-builder.js";
import { createAnimationPlan } from "./animation-assistant.js";
import { listExportTargets } from "./exporter.js";
import { addMemory, listMemories, deleteMemory } from "./memory.js";
import { requestPlatformAccess, approvePlatformAccess, revokePlatformAccess } from "./platform-permissions.js";
import { listOAuthPlatforms, startOAuth, finishOAuth, type OAuthPlatform } from "./oauth-connectors.js";
import { testConnector, type ConnectorHealth } from "./connector-health.js";
import { createBrainPlan } from "./brain.js";
import { createMission, getMission, listMissions, updateMissionStep, nextReadySteps } from "./mission.js";
import { getProjectDNA, upsertProjectDNA, addProjectDecision } from "./project-dna.js";
import { createCheckpoint, listCheckpoints, latestCheckpoint } from "./checkpoints.js";
import { createHealingPlan } from "./self-healing.js";
import { planParallelAgents } from "./parallel-agents.js";
import { listPlatformTargets, discoverPlatform, planPlatformMission } from "./universal-platform-agent.js";
import { createBrowserSession, browserPolicy } from "./browser-cloud-agent.js";
import { requestAccountAccess, approveAccountAccess, revokeAccountAccess, listAccountAccess, createLinkedBrowserSession, approveLinkedBrowserSession, getLinkedBrowserSession, revokeLinkedBrowserSession } from "./account-access.js";
import { listConnectors, resolveConnector, createIntegrationPlan } from "./connector-engine.js";
import { executePlatformMission } from "./platform-executor.js";
import { executeConnectorAction, type ConnectorActionInput } from "./connector-actions.js";
import type { ChatRequest } from "./types.js";
import { executeCodingTask } from "./coding-agent.js";
import { registerMcpServer, listMcpServers, listMcpTools, callMcpTool, disconnectMcpServer } from "./mcp-hub.js";
import { runMultiAgentTeam } from "./multi-agent-runtime.js";
import { runOpenAIAgent } from "./openai-agents-sdk.js";
import { createBuildPlan, dispatchBuild, uiScreenSpec, seoGeoAudit } from "./platform-factory.js";
import { runSelfDevelopment, type SelfDevelopmentInput } from "./self-development-engine.js";

export function createAiGateway(){
 const executor={execute:(request:ChatRequest)=>routeChat(request)};
 const tools=createDefaultToolRegistry();
 const researchProvider=new FirecrawlResearchProvider(process.env.FIRECRAWL_API_KEY);
 return {
  listProviders:()=>getProviderConfig(),listModels,discoverModels,listTools:()=>tools.list(),executeTool:(name:string,input:unknown)=>tools.execute(name,input),
  listApprovals:(status?:import("./approvals.js").ApprovalStatus)=>listApprovals(status),decideApproval:(id:string,approved:boolean)=>decideApproval(id,approved),consumeApproval:(id:string)=>consumeApproval(id),
  research:(query:string,limit?:number)=>research(query,researchProvider,limit),hasProviderSecret:(provider:ProviderName)=>Boolean(getSecretForProvider(provider)),
  chat:(request:ChatRequest)=>smartRoute(request),stream:(request:ChatRequest,onToken:(token:string)=>void)=>streamChat(request,onToken),
  runAgents:(objective:string,context:string|undefined,model:string)=>runAgentPipeline(objective,context,model,executor),routeModel,createArenaPlan,
  validateProjectSpec:(spec:ProjectSpec)=>validateProjectSpec(spec),createBuildPlan:(request:BuildRequest)=>pipelineBuildPlan(request),createQAChecks,planMultiplayer,createAssetPipeline,createScenePlan,createAnimationPlan,listExportTargets,
  addMemory,listMemories,deleteMemory,requestPlatformAccess,approvePlatformAccess,revokePlatformAccess,
  listOAuthPlatforms,startOAuth,finishOAuth:(platform:OAuthPlatform,code:string,state:string,redirectUri:string)=>finishOAuth(platform,code,state,redirectUri),testConnector:(id:string):Promise<ConnectorHealth>=>testConnector(id),
  createBrainPlan,createMission,getMission,listMissions,updateMissionStep,nextReadySteps,getProjectDNA,upsertProjectDNA,addProjectDecision,createCheckpoint,listCheckpoints,latestCheckpoint,createHealingPlan,planParallelAgents,
  listPlatformTargets,discoverPlatform,planPlatformMission,createBrowserSession,browserPolicy,requestAccountAccess,approveAccountAccess,revokeAccountAccess,listAccountAccess,createLinkedBrowserSession,approveLinkedBrowserSession,getLinkedBrowserSession,revokeLinkedBrowserSession,listConnectors,resolveConnector,createIntegrationPlan,executePlatformMission,
  executeConnectorAction:(input:ConnectorActionInput)=>executeConnectorAction(input),executeCodingTask,registerMcpServer,listMcpServers,listMcpTools,callMcpTool,disconnectMcpServer,runMultiAgentTeam ,runOpenAIAgent,dispatchBuild,uiScreenSpec,seoGeoAudit,
  runSelfDevelopment
 };
}
export type { ChatRequest, ChatResponse, ModelDescriptor, ProviderName } from "./types.js";
