# 14: Chat turn: parallel reply and structured assessment, atomic

**Blocked by:** 13 (Chat training creation with targets and tutor opening message)

**Status:** ready-for-agent

**What to build:** Typing a message and pressing send returns the tutor's reply and the assessment of your message in one response; both are appended to the training. If either LLM call fails after one retry, nothing is saved and the app keeps the draft with a "Try again" toast. PRD stories 23, 24, 28.

**Assessment schema (contracts `AssessmentSchema`, identical to Go decoder):**
```ts
{ grammar: { score: 0..10, messageWithSuggestions: string },
  vocabularyDiversity: {...}, sentenceComplexity: {...}, sentenceNaturalness: {...},
  targetExpressionCorrectness: Record<string /*expression text*/, { score: 0..10, messageWithSuggestions: string, correctVersion: string }> }
```
Post-validation (port of Go `AddTurn`): drop keys in `targetExpressionCorrectness` that are not in the training's targets ("non-target key invented by LLM — ignore").

**Prompt files** (ports of Go builders; structured output replaces JSON instructions):
`api/prompts/tutor-reply.md`
```
You are an English language tutor acting as a conversation partner.
The conversation takes place in the following context: {{context}}
Use a {{style}} tone throughout.
The student is practicing these expressions (never name them, but keep creating natural openings for them): {{targetsList}}
Conversation so far:
{{#each history}}{{role}}: {{content}}
{{/each}}
The student just said: {{userContent}}
Respond naturally as a conversation partner (2-5 sentences). Stay in character — do not mention scores, feedback, or that this is a practice session.
```
`api/prompts/assessment.md`
```
You are an English language tutor assessing a student's message.
Conversation context: {{context}}
Style: {{style}}
Target expressions the student is practicing:
{{#each targets}}- {{expression}}: {{meaning}}
{{/each}}
Student message: {{userContent}}
Score grammar, vocabularyDiversity, sentenceComplexity, sentenceNaturalness 0-10, each with messageWithSuggestions (the student's message rewritten with improvements marked).
For targetExpressionCorrectness include ONLY expressions from the target list that the student attempted (inflection/tense changes count as attempts); score 0-10, messageWithSuggestions, and correctVersion (a natural sentence using it correctly). Omit targets not attempted.
```
Roles: `REPLY_MODEL` and `ASSESSMENT_MODEL`. Both calls via `Promise.all`; each wrapped in `withRetry(fn, {attempts: 2})`.

**Atomicity:** persist user message (with assessment) + assistant reply in ONE repository call `appendMessages(userId, id, [user, assistant])`; on any earlier failure return `502 LLM_UNAVAILABLE` and write nothing. Training must be `ACTIVE`, else `409 TRAINING_NOT_ACTIVE`.

**API:** `POST /trainings/:id/messages` body `{ content: 1..2000 }` → `200 { reply: Message, assessment: Assessment, training: Training }`.

- [ ] api tests (fake gateway): success appends 2 messages; reply fails twice → 502 and message count unchanged; assessment invalid target key stripped; COMPLETED training → 409; both gateway roles invoked with prompts containing history.
- [ ] `withRetry` unit test (1 failure then success → ok; 2 failures → throws).
- [ ] app: send mutation keeps draft on error, clears on success; optimistic user bubble marked "pending" until response.


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
