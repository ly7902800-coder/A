import { getProviderConfig, getSecretForProvider, type ProviderName } from "./providers.js";
import { listModels } from "./models.js";
import { routeChat } from "./router.js";
import { streamChat } from "./stream.js";
import { runAgentPipeline } from "./orchestrator.js";
import type { ChatRequest } from "./types.js";

export function createAiGateway() {
  const executor = {
    execute: (request: ChatRequest) => routeChat(request)
  };

  return {
    listProviders() {
      return getProviderConfig();
    },
    listModels,
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
