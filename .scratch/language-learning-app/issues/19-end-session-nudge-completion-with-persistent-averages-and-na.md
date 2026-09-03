# 19: End session nudge, completion with persistent averages and narrative

**What to build:** The chat screen always shows "End session". Once every target has a lit chip (ticket 15 rule) a banner suggests ending. Ending calls complete: the API computes per-category averages and per-target stats deterministically, asks the LLM for a short narrative, stores all of it, and the training becomes COMPLETED. Averages are always visible afterwards: in the chat header, at the top of the ended chat, and in the Sessions list row. PRD stories 30, 31.

**Aggregator (pure, port of Go `AggregateFinalAssessment`):** averages over user messages that have an assessment; per target: collect `targetExpressionCorrectness[text].score` where > 0; `used = scores.length > 0`; `score = mean`; `usedCorrectly = mean >= 7`. Targets never attempted: `{ used: false, usedCorrectly: false, score: 0 }`.

**Final assessment schema:**
```ts
{ averages: { grammar, vocabularyDiversity, sentenceComplexity, sentenceNaturalness },
  targets: Record<expression, { used: boolean, usedCorrectly: boolean, score: number }>,
  narrative: { strengths: string, areasForImprovement: string, suggestedFocus: string }, computedAt: Date }
```
**Prompt file `api/prompts/narrative.md`** (port of Go `BuildNarrativePrompt`):
```
You are an English language tutor summarizing a completed training session.
Session performance averages:
- Grammar: {{grammar}}/10
- Vocabulary diversity: {{vocabularyDiversity}}/10
- Sentence complexity: {{sentenceComplexity}}/10
- Sentence naturalness: {{sentenceNaturalness}}/10
Target expression results:
{{#each targets}}- {{expression}}: {{summary}}   // "not used" | "used, avg score X/10 (correct|needs work)"
{{/each}}
Write 1-2 sentences per field: strengths, areasForImprovement, suggestedFocus.
```
Role `NARRATIVE_MODEL`, retry once; on failure → 502 and status unchanged (completion is atomic too).

**API:** `POST /trainings/:id/complete` → `200 Training` (COMPLETED, finalAssessment set) | `409 TRAINING_NOT_ACTIVE` if already terminal. Completion does NOT re-run SRS.

- [ ] aggregator unit tests: no assessed messages → zeros, all targets unused; mixed scores; `usedCorrectly` boundary at 7.
- [ ] api tests: complete stores averages+targets+narrative; second complete → 409; narrative failure → 502 and still ACTIVE.
- [ ] app: nudge banner appears only when all chips lit; ended chat shows averages header; Sessions row shows averages.
