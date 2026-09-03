# 15: Assessment UI: compact badge, expandable breakdown, chip lighting

**What to build:** Each of your bubbles shows a small badge with the overall score (mean of the four category scores, 1 decimal) colored green ≥7 / amber 4–6.9 / red <4. Tapping expands a panel with the four categories (score + messageWithSuggestions) and a "Targets" section listing attempted targets with score, correctVersion and suggestions. Target chips in the header turn lit once any message has that target with score ≥ 7. PRD stories 21, 25.

**Pure helpers (app, tested):** `overallScore(assessment)`, `badgeTone(score)`, `litTargets(messages): Set<expressionText>` (≥7 rule — same threshold as the aggregator's `usedCorrectly`).

- [ ] app tests: helpers; bubble expands/collapses; chips lit after a qualifying message.
- [ ] Manual: a message using a target correctly lights its chip.
