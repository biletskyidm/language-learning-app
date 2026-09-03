# 06: Expression detail screen with trained counter

**What to build:** Tapping a row opens `/expressions/[id]` showing every field: expression, type, part of speech, meaning, examples (list), tags (chips), frequency, and an SRS block: **Trained N times** (prominent counter), score (1 decimal, "—" if never), last practiced (relative), next due (relative, "due now" if past). The list rows also show a small "×N" trained counter. PRD stories 7, 8.

**API:** `GET /expressions/:id` → 200 Expression | `404 NOT_FOUND` (also for malformed id — mirror Go: invalid ObjectId → not found, never 500).

- [ ] api tests: found; other user's doc → 404; malformed id → 404.
- [ ] app: detail hook + rendering test for counter states (0/absent, 1, 7) and score absent vs present.
- [ ] Manual: seeded practiced item shows "Trained 3 times", next due relative text.
