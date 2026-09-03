# 01: Monorepo skeleton, local API + Mongo, app shell with health

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**What to build:** From a clean checkout, `pnpm install && pnpm --filter api dev` starts a Hono server on `http://localhost:8787` backed by the **existing MongoDB Atlas database** (same cluster, database and `expressions` collection the MCP server and Go API used — it already holds the user's vocabulary; nothing is set up from scratch), and the Expo app (iOS simulator / dev build) shows a Home screen with a green "API: ok" line fetched from `GET /health`. Same handler tree is exported for Lambda later (ticket 03). Covers PRD stories 49 (local part) and 51.

**Repo layout (decision):**
```
app/                 Expo (expo-router, TanStack Query, StyleSheet + tokens.ts, expo-secure-store)
api/                 Hono app; src/<domain>/{handler,service,repository,mongo-repository,memory-repository,mapper}.ts
api/prompts/         prompt template files (introduced in ticket 10)
infra/               CDK (TypeScript) — introduced in ticket 03
packages/contracts/  zod schemas, shared types, token module (ticket 02)
docker-compose.yml   optional local Mongo sandbox
```

**docker-compose.yml** — OPTIONAL isolated sandbox only (e.g. to try destructive experiments); not the default. Port from old repo, same shape:
```yaml
services:
  mongodb:
    image: mongo
    restart: always
    ports: ["27017:27017"]
    volumes: ["./.mongo-data:/data/db"]
```

**API composition root (decision, SOLID/DI):** `createApp(deps: { expressions: ExpressionRepository, trainings: TrainingRepository, settings: SettingsRepository, scenarios: ScenarioRepository, llm: LlmGateway, clock: () => Date, tokenVerifier: TokenVerifier })` returns a Hono app. `src/local.ts` builds real deps from env and calls `serve`. Nothing under `src/<domain>/service.ts` may import mongodb, langchain or hono.

**Env vars (decision, `api/.env.example`):**
```
PORT=8787
MONGO_URI=<existing Atlas connection string from ../language-learning env>
MONGO_DB=<existing database name used by the MCP server>   # NOT a new database
AUTH_SECRET=            # ticket 02
USER_ID=me
OPENROUTER_API_KEY=     # ticket 10
REPLY_MODEL=gpt5.6-luna
ASSESSMENT_MODEL=gpt5.6-luna
NARRATIVE_MODEL=gpt5.6-luna
DRAFT_MODEL=gpt5.6-luna
DRILL_GEN_MODEL=gpt5.6-luna
DRILL_JUDGE_MODEL=gpt5.6-luna
LANGSMITH_TRACING=false
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=language-learning
```
Config loader validates with zod at startup and fails loudly on a missing required var. Old Go stack used `AUTH_TOKEN, USER_ID, MONGO_URI, MONGO_DB` — same idea, new names above.

**Health contract:** `GET /health` → `200 {"status":"ok","db":"ok"|"down"}` (db check = Mongo `ping`, 1s timeout). Unauthenticated.

**Running on a real phone:** the app has no offline mode and always needs an API. Ticket 03 deploys the Lambda right after auth; until then (and for local iteration) point the app at the Mac's LAN address (`http://192.168.x.x:8787`, API bound to `0.0.0.0`) via the setup screen or `EXPO_PUBLIC_API_URL`.

**App:** `app/app/_layout.tsx` with QueryClientProvider; `app/app/index.tsx` Home showing API status via `useHealth()` hook; `app/src/api/client.ts` fetch wrapper reading base URL from secure store (fallback to `EXPO_PUBLIC_API_URL`).

- [ ] `pnpm -r test` passes: api has a vitest test asserting `GET /health` returns 200 with `status: ok` using a fake db-ping dep.
- [ ] `pnpm --filter api dev` serves on 8787 against the existing Atlas database; `curl localhost:8787/health` returns `db: ok`.
- [ ] Startup logs the connected database name and the `expressions` document count, proving it is the existing data.
- [ ] App Home renders "API: ok" (RNTL test of `useHealth` against a mocked client).
- [ ] `createApp` compiles with all repository interfaces declared (even if only in-memory implementations exist yet).
- [ ] README at root documents the three commands above.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
