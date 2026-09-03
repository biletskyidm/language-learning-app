# 08: Edit expression

**What to build:** "Edit" on the detail screen opens the same form pre-filled; saving PATCHes only changed fields; detail and list refresh. SRS fields are not editable from the app. PRD story 9.

**API:** `PATCH /expressions/:id` body = partial of `CreateExpressionInput` (allowed keys mirror Go: `expression, type, partOfSpeech, meaning, examples, tags, frequency`) → 200 Expression | 404. Unknown keys (e.g. `score`, `userId`) → `400 VALIDATION_ERROR`.

- [ ] api tests: partial patch keeps other fields; attempt to patch `score` → 400; other user's doc → 404.
- [ ] app: diff-only patch body (test); cache invalidation for list + detail.
