# 17: SRS effect snapshots on the training

**What to build:** Every SRS write is recorded on the training that caused it. Tapping a target chip in the chat shows how that phrase's score moved during the chat (score it came in with → latest) and how many times it is practiced. PRD story 43.

**Schema (contracts `SrsEffectSchema`):**
```ts
{ expressionId, expression, scoreWritten: number, source: { kind: 'message'|'round', index: number },
  before: { score?: number, timesPracticed?: number, nextTrainingAt?: Date },
  after:  { score: number, timesPracticed: number, nextTrainingAt: Date }, at: Date }
```
Repository: `appendSrsEffects(userId, trainingId, effects[])` (`$push` with `$each`). Written in the same turn handler right after `applySrs`; the turn response includes `srsEffects` for the turn.

- [ ] api tests: turn with two attempted targets → two effects with correct before/after and `source.index` = user message index; score-0 target → no effect.
- [ ] app: tapping a target chip shows its score before → after and times practiced (test).
