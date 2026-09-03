# 09: Delete expression

**What to build:** "Delete" on the detail screen with a confirm dialog; on success navigate back and remove from the list. PRD story 10.

**API:** `DELETE /expressions/:id` → `204` | 404. Deleting does not touch trainings that snapshotted the id (history keeps the text — see ticket 13's snapshot decision).

- [ ] api tests: 204 then GET → 404; other user's → 404.
- [ ] app: confirm → mutation → list cache updated (test).
