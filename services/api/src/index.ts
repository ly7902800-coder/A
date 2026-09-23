import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAiGateway } from "@genesis-ai/ai-gateway";
import { rateLimit, clientKey } from "./security.js";

const oauthProjects = new Map<string, { projectId: string; platform: "github" | "cloudflare" | "figma" | "google" }>();
const port = Number(process.env.PORT ?? 8080);
const gateway = createAiGateway();

function sendJson(response: ServerResponse, status: number, data: unknown) {
  response.statusCode = status; response.setHeader("Content-Type", "application/json; charset=utf-8"); response.end(JSON.stringify(data));
}
async function readJson(request: IncomingMessage) {
  let body = ""; for await (const chunk of request) { body += chunk; if (body.length > 1_000_000) throw new Error("Request body too large"); }
  return body ? JSON.parse(body) : {};
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (!rateLimit(clientKey(request))) return sendJson(response, 429, { error: "Too many requests" });

    if (url.pathname === "/health" && request.method === "GET") return sendJson(response, 200, { ok: true, service: "genesis-api" });
    if (url.pathname === "/v1/providers" && request.method === "GET") return sendJson(response, 200, { providers: gateway.listProviders() });
    if (url.pathname === "/v1/models" && request.method === "GET") return sendJson(response, 200, { models: gateway.listModels() });
    if (url.pathname === "/v1/tools" && request.method === "GET") return sendJson(response, 200, { tools: gateway.listTools() });

    if (url.pathname === "/v1/features" && request.method === "GET") {
      const [{ GENESIS_FEATURES }, { ADDITIONAL_GENESIS_FEATURES }] = await Promise.all([
        import("@genesis-ai/ai-gateway/feature-registry"), import("@genesis-ai/ai-gateway/additional-features")
      ]);
      return sendJson(response, 200, { features: [...GENESIS_FEATURES, ...ADDITIONAL_GENESIS_FEATURES] });
    }

    if (url.pathname === "/v1/connectors" && request.method === "GET")
      return sendJson(response, 200, { connectors: gateway.listOAuthPlatforms() });

    if (url.pathname === "/v1/account/google" && request.method === "GET") {
      const projectId = url.searchParams.get("projectId");
      if (!projectId) return sendJson(response, 400, { error: "projectId is required" });
      const connector = gateway.listOAuthPlatforms().find((x) => x.platform === "google");
      return sendJson(response, 200, {
        platform: "google", projectId,
        connected: false,
        configured: connector?.configured ?? false,
        status: "not_connected",
        scopes: connector?.scopes ?? [],
        capabilities: {
          profile: true, driveMetadataReadonly: true, calendarReadonly: true,
          gmail: false, driveWrite: false, calendarWrite: false
        }
      });
    }

    if (url.pathname === "/v1/account/google/connect" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.projectId || !body.redirectUri) return sendJson(response, 400, { error: "projectId and redirectUri are required" });
      const start = gateway.startOAuth("google", body.redirectUri);
      oauthProjects.set(start.state, { projectId: body.projectId, platform: "google" });
      return sendJson(response, 200, {
        provider: "google", projectId: body.projectId,
        authorizationUrl: start.authorizationUrl, state: start.state,
        permissions: ["Basic profile", "Google Drive metadata (read-only)", "Google Calendar (read-only)"]
      });
    }

    if (url.pathname === "/v1/connectors/authorize" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.platform || !body.projectId || !body.redirectUri) return sendJson(response, 400, { error: "platform, projectId and redirectUri are required" });
      const start = gateway.startOAuth(body.platform, body.redirectUri);
      oauthProjects.set(start.state, { projectId: body.projectId, platform: body.platform });
      return sendJson(response, 200, { platform: body.platform, authorizationUrl: start.authorizationUrl, state: start.state });
    }

    if (url.pathname === "/v1/connectors/callback" && request.method === "GET") {
      const code = url.searchParams.get("code"), state = url.searchParams.get("state");
      const redirectUri = url.searchParams.get("redirect_uri") ?? process.env.GENESIS_OAUTH_CALLBACK_URL ?? "";
      if (!code || !state || !redirectUri) return sendJson(response, 400, { error: "code, state and redirect URI are required" });
      const target = oauthProjects.get(state);
      if (!target) return sendJson(response, 400, { error: "Unknown or expired OAuth state" });
      const token = await gateway.finishOAuth(target.platform, code, state, redirectUri);
      oauthProjects.delete(state);
      const { storeConnectorTokens } = await import("@genesis-ai/ai-gateway/token-vault");
      const ref = storeConnectorTokens({ accessToken: token.accessToken, refreshToken: token.refreshToken, expiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : undefined });
      gateway.approvePlatformAccess(target.projectId, target.platform);
      const { attachConnectorCredentials } = await import("@genesis-ai/ai-gateway/platform-permissions");
      attachConnectorCredentials(target.projectId, target.platform, { accessTokenRef: ref, expiresAt: token.expiresIn ? Date.now() + token.expiresIn * 1000 : undefined });
      return sendJson(response, 200, { connected: true, platform: target.platform, projectId: target.projectId, scopes: token.scope?.split(/[ ,]/).filter(Boolean) });
    }

    if (url.pathname === "/v1/account/google/disconnect" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.projectId) return sendJson(response, 400, { error: "projectId is required" });
      return sendJson(response, 200, { disconnected: gateway.revokePlatformAccess(body.projectId, "google"), platform: "google" });
    }

    if (url.pathname === "/v1/mission" && request.method === "POST") {
      const body = await readJson(request); if (typeof body.objective !== "string" || !body.objective.trim()) return sendJson(response, 400, { error: "objective is required" });
      return sendJson(response, 201, gateway.createBrainPlan(body.objective));
    }
    if (url.pathname === "/v1/missions" && request.method === "GET") return sendJson(response, 200, { missions: gateway.listMissions() });
    const missionMatch = url.pathname.match(/^\/v1\/missions\/([^/]+)$/);
    if (missionMatch && request.method === "GET") { const mission = gateway.getMission(missionMatch[1]); return mission ? sendJson(response, 200, { mission }) : sendJson(response, 404, { error: "Mission not found" }); }
    const missionStepMatch = url.pathname.match(/^\/v1\/missions\/([^/]+)\/steps\/([^/]+)$/);
    if (missionStepMatch && request.method === "POST") { const body = await readJson(request); const allowed = ["pending","running","completed","failed","blocked","approval_required"]; if (!allowed.includes(body.status)) return sendJson(response, 400, { error: "invalid step status" }); const mission = gateway.updateMissionStep(missionStepMatch[1], missionStepMatch[2], body.status); return mission ? sendJson(response, 200, { mission }) : sendJson(response, 404, { error: "Mission or step not found" }); }

    if (url.pathname === "/v1/project/dna" && request.method === "GET") { const projectId = url.searchParams.get("projectId"); if (!projectId) return sendJson(response, 400, { error: "projectId is required" }); return sendJson(response, 200, { dna: gateway.getProjectDNA(projectId) ?? null }); }
    if (url.pathname === "/v1/project/dna" && request.method === "POST") { const body = await readJson(request); if (!body.projectId) return sendJson(response, 400, { error: "projectId is required" }); return sendJson(response, 200, { dna: gateway.upsertProjectDNA({ projectId: body.projectId, name: body.name, type: body.type, stack: Array.isArray(body.stack)?body.stack:[], integrations: Array.isArray(body.integrations)?body.integrations:[], requirements: Array.isArray(body.requirements)?body.requirements:[], decisions: Array.isArray(body.decisions)?body.decisions:[], knownIssues: Array.isArray(body.knownIssues)?body.knownIssues:[] }) }); }
    if (url.pathname === "/v1/project/checkpoints" && request.method === "GET") { const projectId = url.searchParams.get("projectId"); if (!projectId) return sendJson(response, 400, { error: "projectId is required" }); return sendJson(response, 200, { checkpoints: gateway.listCheckpoints(projectId), latest: gateway.latestCheckpoint(projectId) ?? null }); }
    if (url.pathname === "/v1/project/checkpoints" && request.method === "POST") { const body = await readJson(request); if (!body.projectId || !body.label) return sendJson(response, 400, { error: "projectId and label are required" }); return sendJson(response, 201, { checkpoint: gateway.createCheckpoint(body.projectId, body.label, body.snapshotRef) }); }
    if (url.pathname === "/v1/self-healing/plan" && request.method === "POST") { const body = await readJson(request); if (typeof body.error !== "string" || !body.error.trim()) return sendJson(response, 400, { error: "error is required" }); return sendJson(response, 200, { plan: gateway.createHealingPlan(body.error) }); }
    if (url.pathname === "/v1/agents/parallel-plan" && request.method === "POST") { const body = await readJson(request); if (typeof body.objective !== "string" || !body.objective.trim()) return sendJson(response, 400, { error: "objective is required" }); return sendJson(response, 200, { tasks: gateway.planParallelAgents(body.objective) }); }

    if (url.pathname === "/v1/platforms" && request.method === "GET") { const { ALL_PLATFORMS } = await import("@genesis-ai/ai-gateway/extended-platforms"); return sendJson(response, 200, { platforms: ALL_PLATFORMS }); }
    if (url.pathname === "/v1/platform/access/request" && request.method === "POST") { const body = await readJson(request); if (!body.platformId || !body.projectId || !Array.isArray(body.scopes)) return sendJson(response, 400, { error: "platformId, projectId and scopes are required" }); return sendJson(response, 200, gateway.requestPlatformAccess({ platformId: body.platformId, projectId: body.projectId, scopes: body.scopes, reason: typeof body.reason === "string" ? body.reason : "Genesis needs to work on the selected platform." })); }
    if (url.pathname === "/v1/platform/access/approve" && request.method === "POST") { const body = await readJson(request); if (!body.platformId || !body.projectId) return sendJson(response, 400, { error: "platformId and projectId are required" }); return sendJson(response, 200, gateway.approvePlatformAccess(body.projectId, body.platformId)); }
    if (url.pathname === "/v1/platform/access/revoke" && request.method === "POST") { const body = await readJson(request); return sendJson(response, 200, { revoked: gateway.revokePlatformAccess(body.projectId, body.platformId) }); }

    if (url.pathname === "/v1/tools/execute" && request.method === "POST") { const body = await readJson(request); if (typeof body.name !== "string") return sendJson(response, 400, { error: "tool name is required" }); return sendJson(response, 200, await gateway.executeTool(body.name, body.input)); }
    if (url.pathname === "/v1/approvals" && request.method === "GET") return sendJson(response, 200, { approvals: gateway.listApprovals() });
    const approvalMatch = url.pathname.match(/^\/v1\/approvals\/([^/]+)\/(approve|reject)$/);
    if (approvalMatch && request.method === "POST") return sendJson(response, 200, gateway.decideApproval(approvalMatch[1], approvalMatch[2] === "approve"));

    if (url.pathname === "/v1/research" && request.method === "POST") { const body = await readJson(request); if (typeof body.query !== "string" || !body.query.trim()) return sendJson(response, 400, { error: "query is required" }); return sendJson(response, 200, await gateway.research(body.query, body.limit)); }
    if (url.pathname === "/v1/chat/completions" && request.method === "POST") { return sendJson(response, 200, await gateway.chat(await readJson(request))); }
    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(response, 500, { error: error instanceof Error ? error.message : "Internal server error" });
  }
});
server.listen(port, () => console.log(`Genesis API listening on :${port}`));
