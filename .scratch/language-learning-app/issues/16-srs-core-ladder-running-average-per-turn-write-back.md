# 16: SRS core: ladder, running average, per-turn write-back

**What to build:** After a successful chat turn, every target that received a non-zero score gets its SRS fields recomputed and saved; targets with score 0 or not attempted are untouched. The vocabulary list/detail counters reflect it immediately. PRD stories 26, 27, 41, 42.

**Pure module `src/srs/scheduler.ts` — port verbatim (MCP `service.mjs` / Go `srs`):**
```ts
export function nextTrainingAt(timesPracticed: number, lastPracticedAt: Date | undefined, score: number): Date {
  if (!lastPracticedAt) return new Date(0);
  let base: number;
  if (timesPracticed <= 1) base = 1;
  else if (timesPracticed === 2) base = 3;
  else if (timesPracticed === 3) base = 7;
  else if (timesPracticed === 4) base = 14;
  else if (timesPracticed === 5) base = 30;
  else base = 30 * Math.pow(2, timesPracticed - 5);
  let interval = base;
  if (score <= 3) interval = 0;
  else if (score <= 6) interval = base * 0.5;
  else if (score >= 9) interval = base * 1.5;
  return new Date(lastPracticedAt.getTime() + interval * 24 * 60 * 60 * 1000);
}
export const averageScore = (oldAvg: number, newScore: number, count: number) => (oldAvg * (count - 1) + newScore) / count;
```
**Apply rule (port of MCP `updateProgress` / Go `AddTurn` tail):**
```
for (text, ts) in assessment.targetExpressionCorrectness:
  if ts.score === 0: continue
  expr = targetById(text); if !expr: continue
  count = (expr.timesPracticed ?? 0) + 1
  now = clock()
  newScore = averageScore(expr.score ?? 0, ts.score, count)
  next = nextTrainingAt(count, now, newScore)
  repo.applySrs(userId, expr.id, { score: newScore, timesPracticed: count, lastTimePracticedAt: now, nextTrainingAt: next })
```
Mongo write = `$set` of exactly those four fields (Go `UpdateSRS`). Encapsulate in `SrsService.apply(userId, targets, scores: Map<expressionId, number>, clock)` returning the list of `{ expressionId, before, after }` (consumed by ticket 17). Drills reuse this same service with constant scores (ticket 21) — one code path.

- [ ] scheduler unit tests: never practiced → epoch; ladder 1/3/7/14/30/60/120 days; score 3 → +0d; score 5 → half; score 9 → 1.5×; score 7 → base.
- [ ] averageScore tests: first practice (oldAvg 0, count 1) → newScore; running average.
- [ ] api tests: after a turn with `{score: 8}` for one target and `{score: 0}` for another, only the first expression's fields change; `timesPracticed` increments from absent → 1.
- [ ] app: after send, vocabulary queries invalidated so the counter updates.
