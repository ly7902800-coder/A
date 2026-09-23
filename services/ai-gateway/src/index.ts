import { getProviderConfig, getSecretForProvider, type ProviderName } from "./providers.js";
import { listModels } from "./models.js";
import { routeChat } from "./router.js";
import { streamChat } from "./stream.js";
import { runAgentPipeline } from "./orchestrator.js";
import { createDefaultToolRegistry } from "./tools.js";
import { research } from "./research.js";
import { FirecrawlResearchProvider } from "./tool-adapters.js";
import type { ChatRequest } from "./types.js";

export function createAiGateway() {
  const executor = {
    execute: (request: ChatRequest) => routeChat(request)
  };
  const tools = createDefaultToolRegistry();
  const researchProvider = new FirecrawlResearchProvider(process.env.FIRECRAWL_API_KEY);

  return {
    listProviders() {
      return getProviderConfig();
    },
    listModels,
    listTools() {
      return tools.list();
    },
    executeTool(name: string, input: unknown) {
      return tools.execute(name, input);
    },
    research(query: string, limit?: number) {
      return research(query, researchProvider, limit);
    },
    hasProviderSecret(provider: ProviderName) {
      return Boolean(getSecretForProvider(provider));
    },
    chat(request: ChatRequest) {
      return routeChat(request);
    },
    stream(request: ChatRequest, onToken: (token: string) => void) {
      return streamChat(request, onToken);
    },
    runAgents(objective: string, context: string | undefined, model: string) {
      return runAgentPipeline(objective, context, model, executor);
    }
  };
}

export type { ChatRequest, ChatResponse, ModelDescriptor, ProviderName } from "./types.js";
