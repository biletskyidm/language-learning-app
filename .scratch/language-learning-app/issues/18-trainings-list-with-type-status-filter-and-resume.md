# 18: Trainings list with type/status filter and resume

**Blocked by:** 13 (Chat training creation with targets and tutor opening message)

**Status:** ready-for-agent

**What to build:** "Sessions" tab lists trainings newest first with type icon, status, context (chat) or type name (drills), created date, and for COMPLETED chats the four averages (rendered from ticket 19 data when present). Filter by status (Active/Completed/Canceled/All) and type. Tapping an ACTIVE chat resumes it in the chat screen with full history. PRD stories 29, 44.

**API:** `GET /trainings?type=&status=&limit=50&before=<createdAt cursor>` → `200 { items: TrainingSummary[], nextBefore? }` where `TrainingSummary` omits messages/rounds but includes `finalAssessment.averages` when present.

- [ ] api tests: filters; summary excludes messages; cursor pagination; own user only.
- [ ] app: list + filter state; resume opens chat with history rendered (hook + render test).


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
