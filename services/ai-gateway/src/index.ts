import { getProviderConfig, getSecretForProvider, type ProviderName } from "./providers.js";
import { listModels } from "./models.js";
import { routeChat } from "./router.js";
import { streamChat } from "./stream.js";
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
    },
    stream(request: ChatRequest, onToken: (token: string) => void) {
      return streamChat(request, onToken);
    }
  };
}

export type { ChatRequest, ChatResponse, ModelDescriptor, ProviderName } from "./types.js";
