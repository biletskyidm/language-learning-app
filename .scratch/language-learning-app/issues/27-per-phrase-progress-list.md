# 27: Per-phrase progress list

**What to build:** "Progress" tab: vocabulary sorted by weakest first by default (score asc, unpracticed last), each row with expression, score bar (0–10), trained counter, next due; segmented control to sort by due date or times practiced; tap → expression detail. Reuses `GET /expressions` sort params from ticket 05, so mostly app work plus one API tweak. PRD story 47.

**API tweak:** `GET /expressions?sort=score&dir=asc&practiced=true` — add `practiced=true|false` filter (score exists / not).

- [ ] api tests: `practiced` filter.
- [ ] app: score bar component with 0–10 → width mapping (test); sort segmented control updates query.
