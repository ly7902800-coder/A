import { getSecretForProvider } from "./providers.js";
import type { ChatRequest, ProviderName } from "./types.js";

const URLS: Record<"openrouter" | "together", string> = {
  openrouter: "https://openrouter.ai/api/v1/chat/completions",
  together: "https://api.together.xyz/v1/chat/completions"
};

function providerFor(model: string): "openrouter" | "together" {
  return model.startsWith("together/") ? "together" : "openrouter";
}

function cleanModel(model: string) {
  return model.replace(/^(openrouter|together)\//, "");
}

export async function streamChat(
  request: ChatRequest,
  onToken: (token: string) => void
): Promise<void> {
  const provider = providerFor(request.model);
  const key = getSecretForProvider(provider as ProviderName);
  if (!key) throw new Error(`Provider secret is not configured: ${provider}`);

  const upstream = await fetch(URLS[provider], {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: cleanModel(request.model),
      messages: request.messages,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      stream: true
    })
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text();
    throw new Error(`${provider} stream failed (${upstream.status}): ${detail.slice(0, 500)}`);
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;

      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const data = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const token = data.choices?.[0]?.delta?.content;
        if (token) onToken(token);
      } catch {
        // Ignore non-JSON SSE keepalive/control frames.
      }
    }
  }
}
