# 08: Edit expression

**Blocked by:** 06 (Expression detail screen with trained counter)

**Status:** ready-for-agent

**What to build:** "Edit" on the detail screen opens the same form pre-filled; saving PATCHes only changed fields; detail and list refresh. SRS fields are not editable from the app. PRD story 9.

**API:** `PATCH /expressions/:id` body = partial of `CreateExpressionInput` (allowed keys mirror Go: `expression, type, partOfSpeech, meaning, examples, tags, frequency`) → 200 Expression | 404. Unknown keys (e.g. `score`, `userId`) → `400 VALIDATION_ERROR`.

- [ ] api tests: partial patch keeps other fields; attempt to patch `score` → 400; other user's doc → 404.
- [ ] app: diff-only patch body (test); cache invalidation for list + detail.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
