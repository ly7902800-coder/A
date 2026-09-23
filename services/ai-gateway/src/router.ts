import { listModels } from "./models.js";
import { chat } from "./chat.js";
import type { ChatRequest, ChatResponse, ProviderName } from "./types.js";

export interface RoutePolicy {
  preferred?: ProviderName;
  fallback?: ProviderName[];
}

export async function routeChat(request: ChatRequest, policy: RoutePolicy = {}): Promise<ChatResponse> {
  const candidates = policy.preferred
    ? [policy.preferred, ...(policy.fallback ?? [])]
    : [undefined, ...(policy.fallback ?? [])];

  let lastError: unknown;

  for (const candidate of candidates) {
    const model = candidate
      ? request.model.includes("/") ? request.model : `${candidate}/${request.model}`
      : request.model;

    try {
      return await chat({ ...request, model });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("No AI provider succeeded");
}

export function resolveModel(modelId: string) {
  return listModels().find((model) => model.id === modelId);
}
