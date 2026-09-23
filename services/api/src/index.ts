import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAiGateway } from "@genesis-ai/ai-gateway";
import { rateLimit, clientKey } from "./security.js";

const oauthProjects = new Map<string, { projectId: string; platform: "github" | "cloudflare" | "figma" }>();

const port = Number(process.env.PORT ?? 8080);
const gateway = createAiGateway();

function sendJson(response: ServerResponse, status: number, data: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(data));
}

async function readJson(request: IncomingMessage) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 1_000_000) throw new Error("Request body too large");
  }
  if (!body) return {};
  return JSON.parse(body);
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
        import("@genesis-ai/ai-gateway/feature-registry"),
        import("@genesis-ai/ai-gateway/additional-features")
      ]);
      return sendJson(response, 200, { features: [...GENESIS_FEATURES, ...ADDITIONAL_GENESIS_FEATURES] });
    }
    if (url.pathname === "/v1/integrations" && request.method === "GET") {\n      const { listIntegrations, listIntegrationStatuses } = await import("@genesis-ai/ai-gateway/integration-registry");\n      return sendJson(response, 200, { integrations: listIntegrations(), statuses: listIntegrationStatuses() });\n    }\n    if (url.pathname === "/v1/integrations/status" && request.method === "GET") {\n      const { listIntegrationStatuses } = await import("@genesis-ai/ai-gateway/integration-registry");\n      return sendJson(response, 200, { statuses: listIntegrationStatuses() });\n    }\n    const integrationTestMatch = url.pathname.match(/^\\/v1\\/integrations\\/([^/]+)\\/test$/);\n    if (integrationTestMatch && request.method === "POST") {\n      return sendJson(response, 200, await gateway.testConnector(integrationTestMatch[1]));\n    }\n    if (url.pathname.startsWith("/v1/integrations/") && request.method === "GET") {\n      const id = url.pathname.slice("/v1/integrations/".length);\n      const { getIntegration, getIntegrationStatus } = await import("@genesis-ai/ai-gateway/integration-registry");\n      const definition = getIntegration(id);\n      if (!definition) return sendJson(response, 404, { error: "Unknown integration" });\n      return sendJson(response, 200, { integration: definition, status: getIntegrationStatus(id) });\n    }\n    if (url.pathname === "/v1/platforms" && request.method === "GET") {
      const { ALL_PLATFORMS } = await import("@genesis-ai/ai-gateway/extended-platforms");
      return sendJson(response, 200, { platforms: ALL_PLATFORMS });
    }

    if (url.pathname === "/v1/platform/access/request" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.platformId || !body.projectId || !Array.isArray(body.scopes)) return sendJson(response, 400, { error: "platformId, projectId and scopes are required" });
      return sendJson(response, 200, gateway.requestPlatformAccess({
        platformId: body.platformId,
        projectId: body.projectId,
        scopes: body.scopes,
        reason: typeof body.reason === "string" ? body.reason : "Genesis needs to work on the selected platform."
      }));
    }
    if (url.pathname === "/v1/platform/access/approve" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.platformId || !body.projectId) return sendJson(response, 400, { error: "platformId and projectId are required" });
      return sendJson(response, 200, gateway.approvePlatformAccess(body.projectId, body.platformId));
    }
    if (url.pathname === "/v1/connectors" && request.method === "GET") {
      return sendJson(response, 200, { connectors: gateway.listOAuthPlatforms() });
    }
    if (url.pathname === "/v1/connectors/authorize" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.platform || !body.projectId || !body.redirectUri) return sendJson(response, 400, { error: "platform, projectId and redirectUri are required" });
      const start = gateway.startOAuth(body.platform, body.redirectUri);
      oauthProjects.set(start.state, { projectId: body.projectId, platform: body.platform });
      return sendJson(response, 200, { platform: body.platform, authorizationUrl: start.authorizationUrl, state: start.state });
    }
    if (url.pathname === "/v1/connectors/callback" && request.method === "GET") {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
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
      return sendJson(response, 200, { connected: true, platform: target.platform, projectId: target.projectId, scopes: token.scope ? token.scope.split(/[ ,]/).filter(Boolean) : undefined });
    }

    if (url.pathname === "/v1/platform/access/revoke" && request.method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 200, { revoked: gateway.revokePlatformAccess(body.projectId, body.platformId) });
    }

    if (url.pathname === "/v1/tools/execute" && request.method === "POST") {
      const body = await readJson(request);
      if (typeof body.name !== "string") return sendJson(response, 400, { error: "tool name is required" });
      return sendJson(response, 200, await gateway.executeTool(body.name, body.input));
    }
    if (url.pathname === "/v1/approvals" && request.method === "GET") return sendJson(response, 200, { approvals: gateway.listApprovals() });

    const approvalMatch = url.pathname.match(/^\/v1\/approvals\/([^/]+)\/(approve|reject)$/);
    if (approvalMatch && request.method === "POST") return sendJson(response, 200, gateway.decideApproval(approvalMatch[1], approvalMatch[2] === "approve"));

    if (url.pathname === "/v1/research" && request.method === "POST") {
      const body = await readJson(request);
      if (typeof body.query !== "string" || !body.query.trim()) return sendJson(response, 400, { error: "valid query is required" });
      return sendJson(response, 200, await gateway.research(body.query, body.limit));
    }
    if (url.pathname === "/v1/route" && request.method === "POST") return sendJson(response, 200, gateway.routeModel(await readJson(request)));
    if (url.pathname === "/v1/project/validate" && request.method === "POST") return sendJson(response, 200, { errors: gateway.validateProjectSpec(await readJson(request)) });
    if (url.pathname === "/v1/build/plan" && request.method === "POST") return sendJson(response, 200, gateway.createBuildPlan(await readJson(request)));
    if (url.pathname === "/v1/game/multiplayer-plan" && request.method === "POST") {
      const body = await readJson(request);
      return sendJson(response, 200, gateway.planMultiplayer(body.kind ?? "game"));
    }
    if (url.pathname === "/v1/export/targets" && request.method === "GET") return sendJson(response, 200, { targets: gateway.listExportTargets(url.searchParams.get("target") ?? "web") });

    if (url.pathname === "/v1/memory" && request.method === "GET") {
      const userId = url.searchParams.get("userId");
      if (!userId) return sendJson(response, 400, { error: "userId is required" });
      return sendJson(response, 200, { memories: gateway.listMemories(userId) });
    }
    if (url.pathname === "/v1/memory" && request.method === "POST") {
      const body = await readJson(request);
      if (!body.userId || !body.id || !body.text) return sendJson(response, 400, { error: "userId, id and text are required" });
      return sendJson(response, 201, gateway.addMemory({ userId: body.userId, id: body.id, text: body.text, tags: Array.isArray(body.tags) ? body.tags : [] }));
    }

    if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
      const body = await readJson(request);
      if (typeof body.model !== "string" || !Array.isArray(body.messages) || !body.messages.length) return sendJson(response, 400, { error: "Invalid chat request" });
      return sendJson(response, 200, await gateway.chat({
        model: body.model,
        messages: body.messages,
        temperature: typeof body.temperature === "number" ? body.temperature : undefined,
        maxTokens: typeof body.max_tokens === "number" ? body.max_tokens : undefined
      }));
    }

    return sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    if (!response.headersSent) sendJson(response, 500, { error: "Internal server error" });
    else response.end();
  }
});

server.listen(port, () => console.log(`Genesis API listening on :${port}`));
