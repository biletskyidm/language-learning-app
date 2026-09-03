# 12: Manual override on the pick screen

**What to build:** On the "What to practice" screen, each suggested item can be removed and replaced from a searchable/tag-filterable picker of the whole vocabulary; the final selection is what gets passed as `expressionIds` when starting a training (ticket 13). PRD story 15.

**Decision:** override is client-side; the API only needs `GET /expressions` filters (ticket 05). The selection component `useTargetSelection(initial)` exposes `{ targets, replace(i, expr), remove(i), add(expr) }` and enforces `1 <= n <= 20`.

- [ ] app: hook tests for replace/remove/add and bounds.
- [ ] app: the start screen sends the current selection as `expressionIds` (verified in ticket 13's test).
