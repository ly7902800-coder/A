import { createServer } from "node:http";
import { createAiGateway } from "@genesis-ai/ai-gateway";

const port = Number(process.env.PORT ?? 8080);
const gateway = createAiGateway();

function sendJson(response: import("node:http").ServerResponse, status: number, data: unknown) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(data));
}

async function readJson(request: import("node:http").IncomingMessage) {
  let body = "";
  for await (const chunk of request) body += chunk;
  if (!body) return {};
  return JSON.parse(body);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname === "/health" && request.method === "GET") {
      sendJson(response, 200, { ok: true, service: "genesis-api" });
      return;
    }

    if (url.pathname === "/v1/providers" && request.method === "GET") {
      sendJson(response, 200, { providers: gateway.listProviders() });
      return;
    }

    if (url.pathname === "/v1/models" && request.method === "GET") {
      sendJson(response, 200, { models: gateway.listModels() });
      return;
    }

    if (url.pathname === "/v1/chat/completions" && request.method === "POST") {
      const body = await readJson(request);

      if (typeof body.model !== "string" || !Array.isArray(body.messages)) {
        sendJson(response, 400, { error: "model and messages are required" });
        return;
      }

      const result = await gateway.chat({
        model: body.model,
        messages: body.messages,
        temperature: typeof body.temperature === "number" ? body.temperature : undefined,
        maxTokens: typeof body.max_tokens === "number" ? body.max_tokens : undefined
      });

      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    sendJson(response, 500, { error: message });
  }
});

server.listen(port, () => {
  console.log(`Genesis API listening on :${port}`);
});
