# 21: Drill framework and Gaps drill as a round session

**What to build:** "Drills" tab → "Gaps" → pick/override targets → a Gaps training opens. Each round: the API generates a short paragraph using 4 targets, blanks them (`___`), returns the paragraph parts plus a shuffled bank; you tap bank chips into blanks and press Check; the API judges deterministically, shows right/wrong per blank, writes 8 (right) / 2 (wrong) into SRS with snapshots, and offers "Another one". "End" completes the training with round aggregates; cancel available. Establishes the drill strategy pattern for 22/23. PRD stories 33, 34, 37, 38, 39, 40.

**Drill strategy (decision, SOLID/OCP):** `interface DrillStrategy<Round, Answer, Verdict> { type; generate(ctx): Promise<Round>; judge(round, answer, ctx): Promise<Verdict>; scoresFor(verdict): Map<expressionId, number>; aggregate(rounds): Aggregates }`. Registry keyed by `type`; adding a drill = one new module + one prompt file. Generic training service handles rounds/complete/cancel via the strategy.

**Training schema extension:**
```ts
Drill = Base & { type:'gaps'|'describe'|'smuggle', rounds: { index, targets: Target[], material: unknown, answer?: unknown, verdict?: unknown, answeredAt?: Date }[], aggregates?: { rounds: number, correct: number, wrong: number } }
```
**Gaps material/answer/verdict:**
```ts
material: { parts: string[] /* n+1 segments */, bank: string[] /* shuffled expressions */, answerKey: string[] /* server-only, stripped from API responses until answered */ }
answer:   { fills: string[] }              // length n
verdict:  { perBlank: { expected: string, given: string, correct: boolean }[] }
```
**Prompt file `api/prompts/gaps-generate.md`** (from DEMO `Cloze`):
```
Write a single vivid paragraph (5-6 sentences) that naturally uses each of these expressions exactly once, in this order or any order: {{targetsList}}.
Return the paragraph with each expression replaced by the token ___ and the list of expressions in the order the blanks appear.
```
Structured schema `{ story: string, answers: string[] }`; validate `answers` is a permutation of targets and `story.split('___').length === answers.length + 1`, else retry once then 502. Role `DRILL_GEN_MODEL`.

**Judging (deterministic):** `norm(s) = s.toLowerCase().replace(/[^a-z' ]/g,' ').replace(/\s+/g,' ').trim()` (from DEMO); `correct = norm(given) === norm(expected)`. Scores: correct → 8, wrong → 2 (drill constants; SRS via ticket 16's service; snapshots via 17 with `source: {kind:'round', index}`).

**API:**
- `POST /trainings` body `{ type:'gaps', expressionIds?, limit? }` (limit default `settings.gapsTargets ?? 4`) → 201 (no round yet).
- `POST /trainings/:id/rounds` → `200 Round` (material without answerKey).
- `POST /trainings/:id/rounds/:index/answer` body `{ fills }` → `200 { verdict, srsEffects, round }`; second answer to same round → 409.
- `POST /trainings/:id/complete` (generic; drills: aggregates, no narrative) / `cancel`.

- [ ] api tests: generate validates permutation (bad LLM output → retry → 502); answer judged deterministically; scores 8/2 applied via SrsService; answering twice → 409; complete computes aggregates and skips LLM.
- [ ] `norm` unit tests incl. apostrophes and punctuation.
- [ ] app: Gaps screen state machine (idle → playing → checked); chips move into blanks; "Another one" requests next round (hook tests).
- [ ] Manual: play two rounds, end, see counters bump in vocabulary and effects in the training.
