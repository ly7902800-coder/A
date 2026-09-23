import type { ProviderName } from "./types.js";

export interface ProviderConfig {
  name: ProviderName;
  configured: boolean;
}

export function getProviderConfig(): ProviderConfig[] {
  return [
    { name: "openrouter", configured: Boolean(process.env.aliz) },
    { name: "together", configured: Boolean(process.env.alizx) },
    { name: "replicate", configured: Boolean(process.env.alizc) }
  ];
}

export function getSecretForProvider(provider: ProviderName): string | undefined {
  switch (provider) {
    case "openrouter": return process.env.aliz;
    case "together": return process.env.alizx;
    case "replicate": return process.env.alizc;
  }
}
