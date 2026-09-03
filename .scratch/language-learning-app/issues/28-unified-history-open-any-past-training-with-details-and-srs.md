# 28: Unified history: open any past training with details and SRS effects

**What to build:** From the Sessions list, opening any COMPLETED/CANCELED training shows a read-only detail: for chats the full conversation with expandable assessments (ticket 15 components), the averages header and narrative; for drills each round with its material, your answer and the verdict (right/wrong per blank / guess / per-phrase ok), and aggregates. An "Effects" section lists SRS snapshots for the whole training. PRD stories 45, 48.

**API:** `GET /trainings/:id` already returns everything; for drills ensure `answerKey` is included for answered rounds only. Add `GET /expressions/:id/history` → `200 { items: { trainingId, type, at, scoreWritten, before, after }[] }` built by querying `trainings` where `srsEffects.expressionId = id` and unwinding (repository method `listEffectsForExpression`) — used on the expression detail screen as a "History" section.

- [ ] api tests: expression history across chat + gaps trainings ordered by `at` desc; unanswered round hides `answerKey`.
- [ ] app: detail renderer chooses by `type`; drill round renderer for each of the three types; expression detail shows history rows.
