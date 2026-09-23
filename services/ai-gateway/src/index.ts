import { getProviderConfig, getSecretForProvider, type ProviderName } from "./providers.js";
import { listModels } from "./models.js";
import { chat } from "./chat.js";
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
      return chat(request);
    }
  };
}

export type { ChatRequest, ChatResponse, ModelDescriptor, ProviderName } from "./types.js";
