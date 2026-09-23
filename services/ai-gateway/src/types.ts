export type ProviderName = "openrouter" | "together" | "replicate" | "openai" | "anthropic" | "gemini" | "xai";
export interface ChatRequest { model:string; messages:Array<{role:"system"|"user"|"assistant";content:string}>; temperature?:number; maxTokens?:number; conversationId?:string; projectId?:string; }
export interface ChatResponse { provider:ProviderName; model:string; text:string; usage?:{inputTokens?:number;outputTokens?:number}; }
export interface ModelDescriptor { id:string; provider:ProviderName; name:string; capabilities:string[]; contextWindow?:number; maxOutputTokens?:number; modalities?:string[]; }
