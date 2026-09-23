import { createServer } from "node:http";
import { createAiGateway } from "@genesis-ai/ai-gateway";

const port = Number(process.env.PORT ?? 8080);
const gateway = createAiGateway();

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");

  response.setHeader("Content-Type", "application/json; charset=utf-8");

  if (url.pathname === "/health" && request.method === "GET") {
    response.statusCode = 200;
    response.end(JSON.stringify({ ok: true, service: "genesis-api" }));
    return;
  }

  if (url.pathname === "/v1/models" && request.method === "GET") {
    response.statusCode = 200;
    response.end(JSON.stringify({ providers: gateway.listProviders() }));
    return;
  }

  response.statusCode = 404;
  response.end(JSON.stringify({ error: "Not found" }));
});

server.listen(port, () => {
  console.log(`Genesis API listening on :${port}`);
});
