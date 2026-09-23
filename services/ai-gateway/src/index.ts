import { getProviderConfig, getSecretForProvider, type ProviderName } from "./providers.js";

export function createAiGateway() {
  return {
    listProviders() {
      return getProviderConfig();
    },
    hasProviderSecret(provider: ProviderName) {
      return Boolean(getSecretForProvider(provider));
    }
  };
}
