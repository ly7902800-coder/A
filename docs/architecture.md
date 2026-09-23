# Genesis AI Architecture

## Request flow

Client -> authenticated API -> AI Gateway -> provider adapter

## Core services

- API gateway: authentication, authorization, rate limits, request validation
- AI gateway: model registry, routing, fallbacks, provider adapters
- Agent orchestrator: planning, tool execution, approval gates
- Web research: search, URL extraction, crawling
- Integration service: GitHub, Figma, storage, databases, social APIs
- Worker service: asynchronous jobs
- Persistence: Supabase/PostgreSQL

## Security model

1. Client never receives provider master keys.
2. Provider keys are stored as deployment secrets.
3. Tool actions are permission-scoped.
4. Destructive/external side effects require explicit user approval.
5. Logs must redact credentials and sensitive request headers.
