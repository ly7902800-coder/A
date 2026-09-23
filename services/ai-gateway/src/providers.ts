import type { ProviderName } from "./types.js";
export interface ProviderConfig { name: ProviderName; configured: boolean; }
const ENV_KEYS:Record<ProviderName,string>={openrouter:"aliz",together:"alizx",replicate:"alizc",openai:"OPENAI_API_KEY",anthropic:"ANTHROPIC_API_KEY",gemini:"GEMINI_API_KEY",xai:"XAI_API_KEY"};
export function getProviderConfig():ProviderConfig[]{return (Object.keys(ENV_KEYS) as ProviderName[]).map(name=>({name,configured:Boolean(process.env[ENV_KEYS[name]])}));}
export function getSecretForProvider(provider:ProviderName):string|undefined{return process.env[ENV_KEYS[provider]];}
export type { ProviderName } from "./types.js";
