# 26: Home: due today and active sessions

**What to build:** Home shows "N due today" (tap → vocabulary with Due filter), the list of ACTIVE trainings (tap → resume), and a "Start" row (New chat / Gaps / Describe / Smuggle). PRD story 46.

**API:** `GET /progress/summary` → `200 { dueNow: number, unpracticed: number, active: TrainingSummary[] }`. `dueNow` = count of `{ score: {$exists:true}, nextTrainingAt: {$lte: now} }`; `unpracticed` = `{ score: {$exists:false} }` (both per user).

- [ ] api tests: counts with injected clock; active list ordered by createdAt desc.
- [ ] app: Home renders counts and active rows; tapping due navigates with `due=true` param (test).
