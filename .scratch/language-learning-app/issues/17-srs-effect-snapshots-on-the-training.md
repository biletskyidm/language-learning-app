# 17: SRS effect snapshots on the training

**What to build:** Every SRS write is recorded on the training that caused it, and the chat screen has an "Effects" sheet listing them (expression, score written, before → after for score / times / next due). PRD story 43.

**Schema (contracts `SrsEffectSchema`):**
```ts
{ expressionId, expression, scoreWritten: number, source: { kind: 'message'|'round', index: number },
  before: { score?: number, timesPracticed?: number, nextTrainingAt?: Date },
  after:  { score: number, timesPracticed: number, nextTrainingAt: Date }, at: Date }
```
Repository: `appendSrsEffects(userId, trainingId, effects[])` (`$push` with `$each`). Written in the same turn handler right after `applySrs`; the turn response includes `srsEffects` for the turn.

- [ ] api tests: turn with two attempted targets → two effects with correct before/after and `source.index` = user message index; score-0 target → no effect.
- [ ] app: effects sheet renders before → after rows (test).
