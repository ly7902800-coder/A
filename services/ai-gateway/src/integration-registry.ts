export type IntegrationAuth = "oauth" | "api_key" | "token" | "connector" | "none";

export interface IntegrationDefinition {
  id: string;
  auth: IntegrationAuth;
  env?: string[];
  capabilities: string[];
  status: "implemented" | "credential_required" | "catalog_only";
  notes?: string;
}

const defs: IntegrationDefinition[] = [
  {id:"github",auth:"oauth",env:["GITHUB_OAUTH_CLIENT_ID","GITHUB_OAUTH_CLIENT_SECRET"],capabilities:["repos","files","issues","pull_requests"],status:"implemented"},
  {id:"cloudflare",auth:"oauth",env:["CLOUDFLARE_OAUTH_CLIENT_ID","CLOUDFLARE_OAUTH_CLIENT_SECRET"],capabilities:["workers","zones","deploy"],status:"implemented"},
  {id:"figma",auth:"oauth",env:["FIGMA_OAUTH_CLIENT_ID","FIGMA_OAUTH_CLIENT_SECRET"],capabilities:["files","design","dev_mode"],status:"implemented"},
  {id:"openai",auth:"api_key",env:["OPENAI_API_KEY"],capabilities:["chat","vision","image","audio"],status:"credential_required"},
  {id:"anthropic",auth:"api_key",env:["ANTHROPIC_API_KEY"],capabilities:["chat","vision","code"],status:"credential_required"},
  {id:"gemini",auth:"api_key",env:["GEMINI_API_KEY"],capabilities:["chat","vision","audio","video"],status:"credential_required"},
  {id:"xai",auth:"api_key",env:["XAI_API_KEY"],capabilities:["chat","vision"],status:"credential_required"},
  {id:"openrouter",auth:"api_key",env:["OPENROUTER_API_KEY"],capabilities:["multi_model_chat"],status:"credential_required"},
  {id:"together",auth:"api_key",env:["TOGETHER_API_KEY"],capabilities:["inference","image"],status:"credential_required"},
  {id:"replicate",auth:"api_key",env:["REPLICATE_API_TOKEN"],capabilities:["image","video","audio","models"],status:"credential_required"},
  {id:"firecrawl",auth:"api_key",env:["FIRECRAWL_API_KEY"],capabilities:["web_search","scraping"],status:"credential_required"},
  {id:"fal",auth:"api_key",env:["FAL_KEY"],capabilities:["image","video","audio","3d"],status:"credential_required"},
  {id:"runway",auth:"api_key",env:["RUNWAY_API_KEY"],capabilities:["video","image"],status:"credential_required"},
  {id:"elevenlabs",auth:"api_key",env:["ELEVENLABS_API_KEY"],capabilities:["tts","stt","voice"],status:"credential_required"},
  {id:"deepgram",auth:"api_key",env:["DEEPGRAM_API_KEY"],capabilities:["stt","audio_intelligence"],status:"credential_required"},
  {id:"assemblyai",auth:"api_key",env:["ASSEMBLYAI_API_KEY"],capabilities:["stt","audio_intelligence"],status:"credential_required"},
  {id:"huggingface",auth:"api_key",env:["HF_TOKEN"],capabilities:["models","inference"],status:"credential_required"},
  {id:"sentry",auth:"api_key",env:["SENTRY_AUTH_TOKEN"],capabilities:["errors","performance"],status:"credential_required"},
  {id:"posthog",auth:"api_key",env:["POSTHOG_API_KEY"],capabilities:["analytics","feature_flags"],status:"credential_required"},
  {id:"datadog",auth:"api_key",env:["DATADOG_API_KEY","DATADOG_APP_KEY"],capabilities:["logs","metrics","tracing"],status:"credential_required"},
  {id:"launchdarkly",auth:"api_key",env:["LAUNCHDARKLY_API_KEY"],capabilities:["feature_flags","rollouts"],status:"credential_required"},
  {id:"stripe",auth:"api_key",env:["STRIPE_SECRET_KEY"],capabilities:["payments","subscriptions","webhooks"],status:"credential_required"},
  {id:"twilio",auth:"api_key",env:["TWILIO_ACCOUNT_SID","TWILIO_AUTH_TOKEN"],capabilities:["sms","voice","messaging"],status:"credential_required"},
  {id:"onesignal",auth:"api_key",env:["ONESIGNAL_APP_ID","ONESIGNAL_REST_API_KEY"],capabilities:["push_notifications"],status:"credential_required"},
  {id:"supabase",auth:"api_key",env:["SUPABASE_URL","SUPABASE_SERVICE_ROLE_KEY"],capabilities:["database","auth","storage","realtime"],status:"credential_required"},
  {id:"firebase",auth:"api_key",env:["FIREBASE_PROJECT_ID"],capabilities:["database","auth","storage","notifications"],status:"credential_required"},
  {id:"vercel",auth:"token",env:["VERCEL_TOKEN"],capabilities:["deploy","projects","domains"],status:"credential_required"},
  {id:"railway",auth:"token",env:["RAILWAY_API_TOKEN"],capabilities:["deploy","projects","services"],status:"credential_required"},
  {id:"aws",auth:"connector",env:["AWS_ACCESS_KEY_ID","AWS_SECRET_ACCESS_KEY"],capabilities:["compute","storage","database"],status:"credential_required"},
  {id:"gcp",auth:"connector",env:["GOOGLE_CLOUD_PROJECT"],capabilities:["compute","storage","ai"],status:"credential_required"},
  {id:"azure",auth:"connector",env:["AZURE_TENANT_ID","AZURE_CLIENT_ID","AZURE_CLIENT_SECRET"],capabilities:["compute","storage","ai"],status:"credential_required"},
  {id:"mongodb",auth:"api_key",env:["MONGODB_URI"],capabilities:["database","atlas"],status:"credential_required"},
  {id:"neon",auth:"api_key",env:["NEON_API_KEY"],capabilities:["postgres","branching"],status:"credential_required"},
  {id:"upstash",auth:"api_key",env:["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN"],capabilities:["redis","kafka"],status:"credential_required"},
  {id:"clerk",auth:"api_key",env:["CLERK_SECRET_KEY"],capabilities:["auth","organizations"],status:"credential_required"},
  {id:"auth0",auth:"api_key",env:["AUTH0_DOMAIN","AUTH0_CLIENT_ID","AUTH0_CLIENT_SECRET"],capabilities:["auth","oauth"],status:"credential_required"},
  {id:"blender",auth:"none",capabilities:["3d","render"],status:"catalog_only"},
  {id:"unreal-engine",auth:"none",capabilities:["game","3d","build"],status:"catalog_only"},
  {id:"unity",auth:"none",capabilities:["game","3d","build"],status:"catalog_only"},
  {id:"godot",auth:"none",capabilities:["game","2d","3d"],status:"catalog_only"},
  {id:"threejs",auth:"none",capabilities:["web_3d"],status:"catalog_only"},
  {id:"babylonjs",auth:"none",capabilities:["web_3d"],status:"catalog_only"},
  {id:"playcanvas",auth:"none",capabilities:["web_3d","game"],status:"catalog_only"},
  {id:"docker",auth:"none",capabilities:["containers","build"],status:"catalog_only"},
  {id:"kubernetes",auth:"connector",capabilities:["orchestration","deploy"],status:"catalog_only"},
  {id:"terraform",auth:"none",capabilities:["infrastructure_as_code"],status:"catalog_only"},
  {id:"playwright",auth:"none",capabilities:["browser_testing","automation"],status:"catalog_only"},
  {id:"cypress",auth:"none",capabilities:["e2e_testing"],status:"catalog_only"},
  {id:"vitest",auth:"none",capabilities:["unit_testing"],status:"catalog_only"},
  {id:"expo",auth:"token",env:["EXPO_TOKEN"],capabilities:["mobile_build","notifications"],status:"credential_required"},
  {id:"descript",auth:"api_key",env:["DESCRIPT_API_KEY"],capabilities:["video_editing","transcription"],status:"credential_required"},
  {id:"shutterstock",auth:"api_key",env:["SHUTTERSTOCK_API_KEY"],capabilities:["licensed_media"],status:"credential_required"},
  {id:"luma",auth:"api_key",env:["LUMA_API_KEY"],capabilities:["video","image","3d"],status:"credential_required"},
  {id:"kling",auth:"api_key",env:["KLING_API_KEY"],capabilities:["video","image"],status:"credential_required"},
  {id:"playht",auth:"api_key",env:["PLAYHT_API_KEY"],capabilities:["tts","voice"],status:"credential_required"},
  {id:"suno",auth:"api_key",env:["SUNO_API_KEY"],capabilities:["music_generation"],status:"credential_required"}
];

export function listIntegrations() { return defs; }

export function getIntegration(id: string) {
  return defs.find((x) => x.id === id);
}

export function getIntegrationStatus(id: string) {
  const d = getIntegration(id);
  if (!d) return {id, status:"unknown" as const};
  if (d.status === "catalog_only" || d.auth === "none") return {id, status:d.status, auth:d.auth};
  const missing = (d.env ?? []).filter((key) => !process.env[key]);
  return {
    id,
    status: missing.length === 0 ? "configured" as const : "credential_required" as const,
    auth: d.auth,
    missingEnv: missing
  };
}

export function listIntegrationStatuses() {
  return defs.map((d) => getIntegrationStatus(d.id));
}
