import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAiGateway } from "@genesis-ai/ai-gateway";
import { rateLimit, clientKey } from "./security.js";

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

function isChatBody(body: any) {
  return typeof body.model === "string" &&
    Array.isArray(body.messages) &&
    body.messages.length > 0 &&
    body.messages.every((m: any) =>
      m && ["system", "user", "assistant"].includes(m.role) &&
      typeof m.content === "string"
    );
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (!rateLimit(clientKey(request))) {
      sendJson(response, 429, { error: "Too many requests" });
      return;
    }

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
      if (!isChatBody(body)) {
        sendJson(response, 400, { error: "Invalid chat request" });
        return;
      }

      const requestData = {
        model: body.model,
        messages: body.messages,
        temperature: typeof body.temperature === "number" ? body.temperature : undefined,
        maxTokens: typeof body.max_tokens === "number" ? body.max_tokens : undefined
      };

      if (body.stream === true) {
        response.statusCode = 200;
        response.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");

        await gateway.stream(requestData, (token) => {
          response.write(`data: ${JSON.stringify({ token })}\n\n`);
        });
        response.write("data: [DONE]\n\n");
        response.end();
        return;
      }

      const result = await gateway.chat(requestData);
      sendJson(response, 200, result);
      return;
    }

    if (url.pathname === "/v1/agents/run" && request.method === "POST") {
      const body = await readJson(request);

      if (
        typeof body.objective !== "string" ||
        body.objective.length === 0 ||
        body.objective.length > 20_000 ||
        typeof body.model !== "string"
      ) {
        sendJson(response, 400, { error: "objective and model are required" });
        return;
      }

      const result = await gateway.runAgents(
        body.objective,
        typeof body.context === "string" ? body.context : undefined,
        body.model
      );

      sendJson(response, 200, result);
      return;
    }

    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    if (!response.headersSent) {
      sendJson(response, 500, { error: "Internal server error" });
    } else {
      response.end();
    }
  }
});

server.listen(port, () => {
  console.log(`Genesis API listening on :${port}`);
});
