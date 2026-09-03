# 26: Home: due today and active sessions

**Blocked by:** 18 (Trainings list with type/status filter and resume)

**Status:** ready-for-agent

**What to build:** Home shows "N due today" (tap → vocabulary with Due filter), the list of ACTIVE trainings (tap → resume), and a "Start" row (New chat / Gaps / Describe / Smuggle). PRD story 46.

**API:** `GET /progress/summary` → `200 { dueNow: number, unpracticed: number, active: TrainingSummary[] }`. `dueNow` = count of `{ score: {$exists:true}, nextTrainingAt: {$lte: now} }`; `unpracticed` = `{ score: {$exists:false} }` (both per user).

- [ ] api tests: counts with injected clock; active list ordered by createdAt desc.
- [ ] app: Home renders counts and active rows; tapping due navigates with `due=true` param (test).


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
