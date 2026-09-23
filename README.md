# Genesis AI

Genesis AI is a phone-first, multi-model AI platform with chat, AI routing, agents, coding tools, web research, files, creative tools, projects, memory, and external integrations.

## Repository layout

- `apps/mobile` — Flutter mobile client
- `apps/web` — web client/admin surface
- `services/api` — authenticated API gateway
- `services/ai-gateway` — provider routing and model adapters
- `packages/types` — shared TypeScript contracts
- `docs` — architecture and implementation notes
- `.github/workflows` — CI

## Provider secrets

The repository is public, so provider credentials must never be committed.

Configured GitHub repository secret names:

- `aliz` — OpenRouter
- `alizx` — Together AI
- `alizc` — Replicate

Their values must remain inside GitHub/deployment secret storage. The mobile app must never contain these credentials.
