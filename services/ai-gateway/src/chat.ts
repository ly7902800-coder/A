import { getSecretForProvider } from "./providers.js";
import type { ChatRequest, ChatResponse, ProviderName } from "./types.js";
import { chatExtended } from "./extended-providers.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";

function providerFromModel(model: string): ProviderName {
  if (model.startsWith("together/")) return "together";
  if (model.startsWith("replicate/")) return "replicate";
  return "openrouter";
}

function cleanModel(model: string): string {
  return model.replace(/^(openrouter|together|replicate)\//, "");
}

async function callOpenAICompatible(
  provider: ProviderName,
  url: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const apiKey = getSecretForProvider(provider);
  if (!apiKey) throw new Error(`Provider secret is not configured: ${provider}`);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: cleanModel(request.model),
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${provider} request failed (${response.status}): ${detail.slice(0, 500)}`);
  }

  const data = await response.json() as any;
  const text = data?.choices?.[0]?.message?.content;

  if (typeof text !== "string") {
    throw new Error(`Unexpected ${provider} response format`);
  }

  return {
    provider,
    model: request.model,
    text,
    usage: {
      inputTokens: data?.usage?.prompt_tokens,
      outputTokens: data?.usage?.completion_tokens
    }
  };
}

export async function chat(request: ChatRequest): Promise<ChatResponse> {
  const prefix = request.model.split("/")[0];
  if (["openai", "anthropic", "gemini", "xai"].includes(prefix)) {
    return chatExtended(request);
  }

  const provider = providerFromModel(request.model);

  if (provider === "openrouter") {
    return callOpenAICompatible("openrouter", OPENROUTER_URL, request);
  }

  if (provider === "together") {
    return callOpenAICompatible("together", TOGETHER_URL, request);
  }

  throw new Error("Replicate generation adapter is not a chat-completions provider yet");
}
