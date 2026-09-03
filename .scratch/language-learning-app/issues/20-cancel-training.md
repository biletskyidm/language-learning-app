# 20: Cancel training

**Blocked by:** 18 (Trainings list with type/status filter and resume)

**Status:** ready-for-agent

**What to build:** "Cancel session" (from the chat screen menu and the Sessions list) marks the training CANCELED without any LLM call; it stays in history, filtered under Canceled. PRD story 32.

**API:** `POST /trainings/:id/cancel` → `200 Training` | `409 TRAINING_NOT_ACTIVE`. Sets `canceledAt`; no finalAssessment; SRS effects already written stay.

- [ ] api tests: cancel ACTIVE → CANCELED with `canceledAt`; cancel COMPLETED → 409; gateway not called.
- [ ] app: confirm dialog → list refresh.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
