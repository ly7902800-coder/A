import { getIntegration, getIntegrationStatus } from "./integration-registry.js";

export type ConnectorHealthStatus = "connected" | "credential_required" | "catalog_only" | "failed";

export interface ConnectorHealth {
  id: string;
  status: ConnectorHealthStatus;
  latencyMs?: number;
  httpStatus?: number;
  message: string;
  checkedAt: string;
}

type Check = { url: string; headers?: Record<string,string>; method?: "GET" | "POST"; body?: string };

function bearer(env: string): Record<string,string> {
  const value = process.env[env];
  const headers: Record<string,string> = {};
  if (value) headers.Authorization = `Bearer ${value}`;
  return headers;
}

async function request(check: Check, timeoutMs = 8000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(check.url, {
      method: check.method ?? "GET",
      headers: {"Accept":"application/json", ...(check.headers ?? {})},
      body: check.body,
      signal: controller.signal
    });
    return { ok: r.ok, status: r.status, latencyMs: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

function checkFor(id: string): Check | null {
  const checks: Record<string, Check> = {
    openai: {url:"https://api.openai.com/v1/models", headers: bearer("OPENAI_API_KEY")},
    anthropic: {url:"https://api.anthropic.com/v1/models", headers:{...bearer("ANTHROPIC_API_KEY"),"anthropic-version":"2023-06-01"}},
    gemini: {url:"https://generativelanguage.googleapis.com/v1beta/models?key="+encodeURIComponent(process.env.GEMINI_API_KEY ?? "")},
    xai: {url:"https://api.x.ai/v1/models", headers: bearer("XAI_API_KEY")},
    openrouter: {url:"https://openrouter.ai/api/v1/models", headers: bearer("OPENROUTER_API_KEY")},
    together: {url:"https://api.together.xyz/v1/models", headers: bearer("TOGETHER_API_KEY")},
    replicate: {url:"https://api.replicate.com/v1/models", headers: bearer("REPLICATE_API_TOKEN")},
    elevenlabs: {url:"https://api.elevenlabs.io/v1/user", headers:{"xi-api-key":process.env.ELEVENLABS_API_KEY ?? ""}},
    deepgram: {url:"https://api.deepgram.com/v1/projects", headers: bearer("DEEPGRAM_API_KEY")},
    assemblyai: {url:"https://api.assemblyai.com/v2/account", headers: bearer("ASSEMBLYAI_API_KEY")},
    huggingface: {url:"https://huggingface.co/api/whoami-v2", headers: bearer("HF_TOKEN")},
    stripe: {url:"https://api.stripe.com/v1/balance", headers: bearer("STRIPE_SECRET_KEY")},
    vercel: {url:"https://api.vercel.com/v2/user", headers: bearer("VERCEL_TOKEN")},
    supabase: {url:(process.env.SUPABASE_URL ?? "").replace(/\/$/,"")+"/auth/v1/settings", headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}},
    upstash: {url:(process.env.UPSTASH_REDIS_REST_URL ?? "").replace(/\/$/,"")+"/ping", headers: bearer("UPSTASH_REDIS_REST_TOKEN")},
    clerk: {url:"https://api.clerk.com/v1/instance", headers: bearer("CLERK_SECRET_KEY")},
    sentry: {url:"https://sentry.io/api/0/organizations/", headers: bearer("SENTRY_AUTH_TOKEN")},
    posthog: {url:"https://app.posthog.com/api/projects/", headers: bearer("POSTHOG_API_KEY")}
  };
  return checks[id] ?? null;
}

export async function testConnector(id: string): Promise<ConnectorHealth> {
  const checkedAt = new Date().toISOString();
  const definition = getIntegration(id);
  if (!definition) return {id,status:"failed",message:"Unknown integration",checkedAt};
  const staticStatus = getIntegrationStatus(id);
  if (definition.status === "catalog_only" || definition.auth === "none") {
    return {id,status:"catalog_only",message:"Catalog entry only; no live account connector is configured.",checkedAt};
  }
  if (staticStatus.status === "credential_required") {
    return {id,status:"credential_required",message:"Required credential is not configured on the Genesis server.",checkedAt};
  }
  const check = checkFor(id);
  if (!check) return {id,status:"connected",message:"Credentials are configured; live health check is not implemented for this connector yet.",checkedAt};
  try {
    const result = await request(check);
    return {
      id,
      status: result.ok ? "connected" : "failed",
      latencyMs: result.latencyMs,
      httpStatus: result.status,
      message: result.ok ? "Live read-only credential check succeeded." : `Provider returned HTTP ${result.status}.`,
      checkedAt
    };
  } catch (error) {
    return {id,status:"failed",message:error instanceof Error ? error.message : "Connector health check failed.",checkedAt};
  }
}
