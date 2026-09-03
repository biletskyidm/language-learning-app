# 24: Settings: target counts per mode and default style

**Blocked by:** 21 (Drill framework and Gaps drill as a round session)

**Status:** ready-for-agent

**What to build:** Settings screen with number steppers for chat / gaps / describe / smuggle target counts and a default style toggle; values are stored server-side and used as defaults by every start flow (chat create, drill create) when `limit` is not passed. PRD story 16.

**Schema/defaults (contracts `SettingsSchema`):** `{ chatTargets: 5, gapsTargets: 4, describeTargets: 1, smuggleTargets: 3, defaultStyle: 'informal' }`, bounds 1..10 (chat 1..20). Singleton document per user in `settings` collection; `get` returns defaults when absent.

**API:** `GET /settings` → 200 Settings; `PUT /settings` body full Settings → 200. Ticket 13/21/22/23 services read `settings` via `SettingsRepository` instead of hardcoded fallbacks (refactor under green tests).

- [ ] api tests: defaults when no doc; PUT validates bounds; chat create without limit uses `chatTargets`.
- [ ] app: settings form with optimistic update and revert on error (hook test).


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
