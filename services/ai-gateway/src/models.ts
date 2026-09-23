import type { ModelDescriptor } from "./types.js";

export const MODEL_REGISTRY: ModelDescriptor[] = [
  { id: "openrouter/auto", provider: "openrouter", name: "OpenRouter Auto", capabilities: ["chat","reasoning","coding"] },
  { id: "together/auto", provider: "together", name: "Together Auto", capabilities: ["chat","coding"] },
  { id: "replicate/auto", provider: "replicate", name: "Replicate Auto", capabilities: ["generation"] },
  { id: "openai/auto", provider: "openai", name: "OpenAI", capabilities: ["chat","reasoning","coding","vision","tools"] },
  { id: "anthropic/claude-opus-5-5", provider: "anthropic", name: "Claude Opus 5.5", capabilities: ["chat","reasoning","coding","tools","vision"] },
  { id: "anthropic/auto", provider: "anthropic", name: "Anthropic Auto", capabilities: ["chat","reasoning","coding","tools"] },
  { id: "gemini/auto", provider: "gemini", name: "Google Gemini", capabilities: ["chat","reasoning","coding","vision","audio","tools"] },
  { id: "xai/auto", provider: "xai", name: "xAI Grok", capabilities: ["chat","reasoning","coding","vision","tools"] }
];

export function listModels(): ModelDescriptor[] {
  return MODEL_REGISTRY;
}
