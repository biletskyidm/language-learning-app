# 27: Per-phrase progress list

**Blocked by:** 16 (SRS core: ladder, running average, per-turn write-back)

**Status:** ready-for-agent

**What to build:** "Progress" tab: vocabulary sorted by weakest first by default (score asc, unpracticed last), each row with expression, score bar (0–10), trained counter, next due; segmented control to sort by due date or times practiced; tap → expression detail. Reuses `GET /expressions` sort params from ticket 05, so mostly app work plus one API tweak. PRD story 47.

**API tweak:** `GET /expressions?sort=score&dir=asc&practiced=true` — add `practiced=true|false` filter (score exists / not).

- [ ] api tests: `practiced` filter.
- [ ] app: score bar component with 0–10 → width mapping (test); sort segmented control updates query.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
