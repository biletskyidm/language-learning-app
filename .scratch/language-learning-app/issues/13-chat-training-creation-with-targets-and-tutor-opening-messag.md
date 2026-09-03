# 13: Chat training creation with targets and tutor opening message

**Blocked by:** 10 (From-text capture: LLM gateway, prompt files, draft + review), 11 (Smart picker endpoint and 'what to practice' preview)

**Status:** ready-for-agent

**What to build:** "New chat" → optional pick/override step → context (free text) + style (formal/informal) → `POST /trainings` → chat screen opens showing target chips and the tutor's first message. Introduces the typed `trainings` collection. PRD stories 17, 19, 20, 21, 22.

**Training schema (contracts, discriminated union on `type`):**
```ts
Base { id, userId, type: 'chat'|'gaps'|'describe'|'smuggle', status: 'ACTIVE'|'COMPLETED'|'CANCELED',
       targets: { expressionId: string, expression: string, meaning: string }[],   // snapshot incl. text+meaning
       createdAt, completedAt?, canceledAt?, srsEffects: SrsEffect[] /* ticket 17 */ }
Chat  = Base & { type:'chat', context: string, style: 'formal'|'informal',
       messages: { role:'user'|'assistant', content, createdAt, assessment? }[], finalAssessment? }
```
Snapshotting text+meaning (not just ids) means deleting an expression later never breaks history.

**Prompt file `api/prompts/tutor-first-message.md`** (port of Go `BuildTutorFirstMessagePrompt`):
```
You are an English language tutor.
The conversation takes place in the following context: {{context}}
Use a {{style}} tone throughout.
{{#targets}}
The student is practicing these expressions:
{{#each targets}}- {{expression}}
{{/each}}
Naturally guide the conversation so the student has opportunities to use them. Never name or hint at the expressions themselves.
{{/targets}}
Write a short opening message (2-4 sentences) to start the conversation. Stay in character as a conversation partner in the described context — do not introduce yourself as a tutor or mention that this is a practice session.
```
Structured schema `{ message: string }`; role env `REPLY_MODEL`.

**Service flow (port of Go `Create`):** if `expressionIds` given → load each via repo, 404 `EXPRESSION_NOT_FOUND` if any missing; else `pick(limit ?? settings.chatTargets ?? 5)`. Build targets snapshot → LLM first message → persist training with one assistant message → return training.

**API:** `POST /trainings` body `{ type:'chat', context (1..500), style, expressionIds?: string[], limit? }` → `201 Training`. `GET /trainings/:id` → 200 | 404.

**App:** chat screen `/trainings/[id]`: chips row (all unlit), message list, composer (send wired in 13).

- [ ] api tests: create with explicit ids snapshots text+meaning; without ids uses picker with limit; unknown id → 404; first message persisted as `assistant`; gateway called with role `reply` and rendered prompt containing context/style/targets.
- [ ] mapper tests for chat training round-trip.
- [ ] app: start flow hook sends `expressionIds` from selection (ticket 12) or omits; chat screen renders chips + first message.
- [ ] Manual: start "scrum standup", see an in-character opening line.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
