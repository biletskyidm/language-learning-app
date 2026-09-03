# 11: Smart picker endpoint and 'what to practice' preview

**Blocked by:** 04 (Expressions list with text search and cached reads)

**Status:** ready-for-agent

**What to build:** `GET /expressions/pick?limit=5` returns the next expressions to practice; the app shows a "What to practice" screen listing them (used as the start step for chats and drills later). PRD story 14.

**Authoritative rule (MCP `db.mjs`, user-supplied) — port verbatim in `MongoExpressionRepository.pick`:**
```js
[
  { $match: { userId, $or: [
      { score: { $exists: true }, nextTrainingAt: { $lte: now } },
      { score: { $exists: false }, frequency: 'very_common' },
      { score: { $exists: false }, frequency: 'common' },
      { score: { $exists: false }, frequency: 'moderate' },
      { score: { $exists: false }, frequency: 'uncommon' },
      { score: { $exists: false }, frequency: 'formal/academic' } ] } },
  { $addFields: { priority: { $switch: { branches: [
      { case: { $and: [ { $ifNull: ['$score', false] }, { $lt: ['$nextTrainingAt', now] } ] }, then: 1 },
      { case: { $eq: ['$frequency', 'very_common'] }, then: 2 },
      { case: { $eq: ['$frequency', 'common'] }, then: 3 },
      { case: { $eq: ['$frequency', 'moderate'] }, then: 4 },
      { case: { $eq: ['$frequency', 'uncommon'] }, then: 5 },
      { case: { $eq: ['$frequency', 'formal/academic'] }, then: 6 } ], default: 99 } } } },
  { $sort: { priority: 1, nextTrainingAt: 1, createdAt: 1 } },   // tie-breakers added for determinism
  { $limit: limit }
]
```
Note the Go port deviated (`timesPracticed > 0` instead of `score exists`); the MCP version above is authoritative. Also extract the pure rule `priorityOf(expr, now): 1..6|99` in `src/expressions/picker.ts`; the memory repository sorts with it, so handler tests exercise the same ranking.

**API:** `GET /expressions/pick?limit=` (default 5, max 20) → `200 { items: Expression[] }`. Also add `userId` to the `$match` (MCP had a single user without it).

- [ ] picker unit tests: due-with-score → 1; unpracticed by tier → 2..6; practiced-but-not-due → 99 (excluded); `score: 0` present counts as practiced (`$ifNull` semantics: 0 is not null → truthy check must mirror `$ifNull`, i.e. field presence, NOT numeric truthiness — test this edge explicitly).
- [ ] api tests: limit default/max; ordering across mixed seed; only own userId.
- [ ] app: preview screen lists picked items with priority reason ("due", "new · very common").


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
