import type { ModelDescriptor } from "./types.js";

export const MODEL_REGISTRY: ModelDescriptor[] = [
  {
    id: "openrouter/auto",
    provider: "openrouter",
    name: "OpenRouter Auto",
    capabilities: ["chat", "reasoning", "coding"]
  },
  {
    id: "together/auto",
    provider: "together",
    name: "Together Auto",
    capabilities: ["chat", "coding"]
  },
  {
    id: "replicate/auto",
    provider: "replicate",
    name: "Replicate",
    capabilities: ["generation"]
  }
];

export function listModels(): ModelDescriptor[] {
  return MODEL_REGISTRY;
}
