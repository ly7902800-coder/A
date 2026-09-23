export type ProviderName = "openrouter" | "together" | "replicate";

export interface ProviderConfig {
  name: ProviderName;
  configured: boolean;
}

export function getProviderConfig(): ProviderConfig[] {
  return [
    {
      name: "openrouter",
      configured: Boolean(process.env.OPENROUTER_API_KEY)
    },
    {
      name: "together",
      configured: Boolean(process.env.TOGETHER_API_KEY)
    },
    {
      name: "replicate",
      configured: Boolean(process.env.REPLICATE_API_TOKEN)
    }
  ];
}
