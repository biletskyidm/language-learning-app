# 05: Expression filters and sort

**Blocked by:** 04 (Expressions list with text search and cached reads)

**Status:** ready-for-agent

**What to build:** Filter chips above the list: by tag (multi-value picker from distinct tags), by frequency, and a "Due now" toggle; sort control: created (default), score, next due, times practiced, asc/desc. Filters persist in the URL/search params so back navigation keeps them. PRD story 6.

**Query semantics (decision):**
- `tag=x` → `tags: x` (array contains); `frequency=v`; `due=true` → `nextTrainingAt <= now` (implies practiced).
- `sort=score` puts docs without `score` last regardless of dir; same for `nextTrainingAt`. Implement in the repository (Mongo: `$sort` with `{ [field]: dir, _id: 1 }` after `$addFields` null-last flag; memory: comparator).
- `GET /expressions/tags` → `200 { items: string[] }` distinct tags for the user.

**API:** `GET /expressions?tag=&frequency=&due=&sort=&dir=` — invalid enum → `400 VALIDATION_ERROR`.

- [ ] api tests: each filter alone and combined; due uses injected clock; sort null-last for score and nextTrainingAt; invalid frequency → 400.
- [ ] app: filter bar state ↔ query params; hook builds the query string correctly (test).
- [ ] Manual: "Due now" on seeded data shows only due rows.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
