# 22: Describe-it drill

**What to build:** "Describe it" → target picked per round (1 of the session targets, cycling without repeat until exhausted) → you explain it without using its words → the LLM guesses which of the session's targets you meant → correct guess writes 8, wrong writes 2. Session of rounds with complete/cancel like Gaps. PRD story 35.

**Material/answer/verdict:**
```ts
material: { targetExpressionId, expression, candidates: string[] /* all session targets */ }
answer:   { description: string (10..600) }
verdict:  { guess: string, correct: boolean, note: string }
```
**Prompt file `api/prompts/describe-judge.md`** (from DEMO `Taboo`):
```
Candidate expressions: {{candidatesList}}
Someone described one of them without using its words: "{{description}}"
Which expression did they mean? Choose exactly one from the candidates and add one short line on how clear the description was.
```
Structured `{ guess: string, note: string }`; `correct = norm(guess) === norm(expression)`. Role `DRILL_JUDGE_MODEL`. Reject descriptions containing any word of the target (case-insensitive, words ≥ 3 letters) with `400 USES_TARGET_WORDS` before calling the LLM.

**API:** same round endpoints as ticket 21 with `type:'describe'`; limit default `settings.describeTargets ?? 1` per round (session target pool from picker default 5).

- [ ] api tests: guess matching via norm; using target words → 400 and no LLM call; scores 8/2; candidate list equals session targets.
- [ ] app: describe screen (target card, text box, result view) hook tests.
