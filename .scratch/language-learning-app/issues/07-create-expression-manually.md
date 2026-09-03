# 07: Create expression manually

**What to build:** "+" on the vocabulary tab opens a form (expression, type, part of speech, meaning, examples as repeatable rows, tags as chips input, frequency). Saving POSTs, the list updates optimistically, and the new item opens. This is the "normal create endpoint" that the from-text flow (09) reuses. Part of PRD story 12 and the CRUD baseline.

**Validation (port of Go handler rules):** required `expression, type, meaning, frequency`; enums as in ticket 04; `examples`/`tags` default `[]`; trims strings; duplicate `expression` for the same user → `409 DUPLICATE`.

**API:** `POST /expressions` body `CreateExpressionInput` → `201 Expression`. Server sets `userId`, `createdAt`, and does NOT set any SRS field.

- [ ] api tests: 201 with created doc; missing meaning → 400 with field path; invalid frequency → 400; duplicate → 409; SRS fields absent on created doc.
- [ ] app: form validation mirrors zod schema (shared from contracts); mutation test with optimistic insert + rollback on error.
- [ ] Manual: create "hit the nail on the head", appears at top of list.
