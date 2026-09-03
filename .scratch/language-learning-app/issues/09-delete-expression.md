# 09: Delete expression

**Blocked by:** 06 (Expression detail screen with trained counter)

**Status:** ready-for-agent

**What to build:** "Delete" on the detail screen with a confirm dialog; on success navigate back and remove from the list. PRD story 10.

**API:** `DELETE /expressions/:id` → `204` | 404. Deleting does not touch trainings that snapshotted the id (history keeps the text — see ticket 13's snapshot decision).

- [ ] api tests: 204 then GET → 404; other user's → 404.
- [ ] app: confirm → mutation → list cache updated (test).


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
