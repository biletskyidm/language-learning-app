# 25: Scenario presets

**Blocked by:** 13 (Chat training creation with targets and tutor opening message)

**Status:** ready-for-agent

**What to build:** On the chat start screen, a horizontal list of saved scenarios (name, context, style) for one-tap start, plus "Manage" to create/edit/delete presets. Selecting a preset pre-fills context and style; free text still available. PRD story 18.

**Schema:** `Scenario { id, userId, name (1..60), context (1..500), style, createdAt }`. Seed 4 defaults on first `GET` when the collection is empty for the user: "Scrum standup (informal)", "Job interview (formal)", "Catching up with a friend (informal)", "Customer support email thread (formal)".

**API:** `GET /scenarios`, `POST /scenarios`, `PATCH /scenarios/:id`, `DELETE /scenarios/:id`. `POST /trainings` accepts `scenarioId` as an alternative to `context+style` (server copies them onto the training; the training never references the scenario afterwards).

- [ ] api tests: CRUD + own-user isolation; create training with `scenarioId` copies context/style; unknown scenarioId → 404; defaults seeded once.
- [ ] app: preset row + manage screen (hook tests); start flow passes `scenarioId`.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
