# 20: Cancel training

**What to build:** "Cancel session" (from the chat screen menu and the Sessions list) marks the training CANCELED without any LLM call; it stays in history, filtered under Canceled. PRD story 32.

**API:** `POST /trainings/:id/cancel` → `200 Training` | `409 TRAINING_NOT_ACTIVE`. Sets `canceledAt`; no finalAssessment; SRS effects already written stay.

- [ ] api tests: cancel ACTIVE → CANCELED with `canceledAt`; cancel COMPLETED → 409; gateway not called.
- [ ] app: confirm dialog → list refresh.
