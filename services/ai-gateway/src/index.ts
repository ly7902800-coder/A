import { getProviderConfig, getSecretForProvider, type ProviderName } from "./providers.js";
import { listModels } from "./models.js";
import { routeChat } from "./router.js";
import type { ChatRequest } from "./types.js";

export function createAiGateway() {
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
    }
  };
}

export type { ChatRequest, ChatResponse, ModelDescriptor, ProviderName } from "./types.js";
