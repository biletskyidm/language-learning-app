# 23: Smuggle drill

**Blocked by:** 21 (Drill framework and Gaps drill as a round session)

**Status:** ready-for-agent

**What to build:** "Smuggle" → 3 targets per round → you write one natural message using all three → the LLM judges each target (present, correct meaning, natural fit) and replies in character (2 sentences, no teaching) → each ok target writes 8, each not-ok writes 2. PRD story 36.

**Material/answer/verdict:**
```ts
material: { targets: Target[] }            // 3
answer:   { message: string (20..1500) }
verdict:  { results: { expression: string, ok: boolean, note: string }[], reply: string }
```
**Prompt file `api/prompts/smuggle-judge.md`** (from DEMO `Smuggle`):
```
A learner had to work these expressions into one natural message: {{targetsList}}
They wrote: "{{message}}"
For each expression say whether it appears and is used with correct meaning and natural fit (ok true/false) with a short note.
Then write one friendly in-character reply to their message (2 sentences, no teaching).
```
Structured `{ results: { expression, ok, note }[], reply }`; post-validate that `results` covers exactly the 3 targets (fill missing as `ok:false, note:'not found'`). Role `DRILL_JUDGE_MODEL`.

**API:** round endpoints as ticket 21 with `type:'smuggle'`; limit default `settings.smuggleTargets ?? 3` per round.

- [ ] api tests: 3 results always returned; missing result filled as not ok; scores per target 8/2; reply persisted in verdict.
- [ ] app: smuggle screen with chips lighting per result (reuse chip component from 14).


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
