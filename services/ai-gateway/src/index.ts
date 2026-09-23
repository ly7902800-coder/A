import { getProviderConfig } from "./providers.js";

export function createAiGateway() {
  return {
    listProviders() {
      return getProviderConfig();
    }
  };
}
