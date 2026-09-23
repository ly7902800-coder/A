import { getProviderConfig, getSecretForProvider } from "./providers.js";
import { listModels } from "./models.js";
import type { ProviderName } from "./types.js";

export type RoutingTask = "chat" | "code" | "research" | "vision" | "generation";

export interface RoutingRequest {
  task: RoutingTask;
  preferredProviders?: ProviderName[];
  requireConfiguredSecret?: boolean;
}

export interface RoutingCandidate {
  provider: ProviderName;
  model: string;
  configured: boolean;
}

export function routeModel(request: RoutingRequest): RoutingCandidate[] {
  const preferred = request.preferredProviders?.length
    ? request.preferredProviders
    : getProviderConfig().map((p) => p.name as ProviderName);

  const models = listModels();
  return preferred
    .filter((provider) => !request.requireConfiguredSecret || Boolean(getSecretForProvider(provider)))
    .map((provider) => {
      const model = models.find((m) => m.provider === provider);
      return {
        provider,
        model: model?.id ?? `${provider}/auto`,
        configured: Boolean(getSecretForProvider(provider))
      };
    });
}
