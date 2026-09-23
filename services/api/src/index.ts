import { createAiGateway } from "@genesis-ai/ai-gateway";

const port = Number(process.env.PORT ?? 8080);
const gateway = createAiGateway();

const server = Bun?.serve
  ? Bun.serve({
      port,
      fetch: async (request: Request) => {
        const url = new URL(request.url);

        if (url.pathname === "/health") {
          return Response.json({ ok: true, service: "genesis-api" });
        }

        if (url.pathname === "/v1/models" && request.method === "GET") {
          return Response.json({ models: gateway.listProviders() });
        }

        return Response.json({ error: "Not found" }, { status: 404 });
      }
    })
  : null;

if (!server) {
  console.log("Genesis API scaffold created. Runtime adapter will be added next.");
} else {
  console.log(`Genesis API listening on :${port}`);
}
