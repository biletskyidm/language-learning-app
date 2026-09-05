# Issues map

Single source for status, dependencies and conventions. Issue files contain only the work itself.

## Issues

Tick when done. "Blocked by" lists issue numbers that must be done first.

- [x] **01** [Monorepo skeleton, local API + Mongo, app shell with health](01-monorepo-skeleton-local-api-+-mongo-app-shell-with-health.md) — blocked by: none
- [ ] **02** [Shared-secret token handshake and auth middleware](02-shared-secret-token-handshake-and-auth-middleware.md) — blocked by: 01
- [ ] **03** [CDK deploy: Lambda Function URL and env wiring](03-cdk-deploy-lambda-function-url-and-env-wiring.md) — blocked by: 02
- [ ] **04** [Expressions list with text search and cached reads](04-expressions-list-with-text-search-and-cached-reads.md) — blocked by: 02
- [ ] **05** [Expression filters and sort](05-expression-filters-and-sort.md) — blocked by: 04
- [ ] **06** [Expression detail screen with trained counter](06-expression-detail-screen-with-trained-counter.md) — blocked by: 04
- [ ] **07** [Create expression manually](07-create-expression-manually.md) — blocked by: 04
- [ ] **08** [Edit expression](08-edit-expression.md) — blocked by: 06
- [ ] **09** [Delete expression](09-delete-expression.md) — blocked by: 06
- [ ] **10** [From-text capture: LLM gateway, prompt files, draft + review](10-from-text-capture-llm-gateway-prompt-files-draft-+-review.md) — blocked by: 07
- [ ] **11** [Smart picker endpoint and 'what to practice' preview](11-smart-picker-endpoint-and-what-to-practice-preview.md) — blocked by: 04
- [ ] **12** [Manual override on the pick screen](12-manual-override-on-the-pick-screen.md) — blocked by: 11
- [ ] **13** [Chat training creation with targets and tutor opening message](13-chat-training-creation-with-targets-and-tutor-opening-messag.md) — blocked by: 10, 11
- [ ] **14** [Chat turn: parallel reply and structured assessment, atomic](14-chat-turn-parallel-reply-and-structured-assessment-atomic.md) — blocked by: 13
- [ ] **15** [Assessment UI: compact badge, expandable breakdown, chip lighting](15-assessment-ui-compact-badge-expandable-breakdown-chip-lighti.md) — blocked by: 14
- [ ] **16** [SRS core: ladder, running average, per-turn write-back](16-srs-core-ladder-running-average-per-turn-write-back.md) — blocked by: 14
- [ ] **17** [SRS effect snapshots on the training](17-srs-effect-snapshots-on-the-training.md) — blocked by: 16
- [ ] **18** [Trainings list with type/status filter and resume](18-trainings-list-with-type-status-filter-and-resume.md) — blocked by: 13
- [ ] **19** [End session nudge, completion with persistent averages and narrative](19-end-session-nudge-completion-with-persistent-averages-and-na.md) — blocked by: 16, 18
- [ ] **20** [Cancel training](20-cancel-training.md) — blocked by: 18
- [ ] **21** [Drill framework and Gaps drill as a round session](21-drill-framework-and-gaps-drill-as-a-round-session.md) — blocked by: 19
- [ ] **22** [Describe-it drill](22-describe-it-drill.md) — blocked by: 21
- [ ] **23** [Smuggle drill](23-smuggle-drill.md) — blocked by: 21
- [ ] **24** [Settings: target counts per mode and default style](24-settings-target-counts-per-mode-and-default-style.md) — blocked by: 21
- [ ] **25** [Scenario presets](25-scenario-presets.md) — blocked by: 13
- [ ] **26** [Home: due today and active sessions](26-home-due-today-and-active-sessions.md) — blocked by: 18
- [ ] **27** [Per-phrase progress list](27-per-phrase-progress-list.md) — blocked by: 16
- [ ] **28** [Unified history: open any past training with details and SRS effects](28-unified-history-open-any-past-training-with-details-and-srs.md) — blocked by: 17, 21

Milestone 1 (daily use) = redeploy after 20 lands (vocab + chat complete).

## Conventions

Fixed in issue 01, apply to every issue.

- pnpm workspaces: `app/`, `api/`, `infra/`, `packages/contracts/`.
- API error shape: `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`.
- All request/response bodies validated with zod schemas exported from `@contracts`.
- API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock.
- App tests: jest + React Native Testing Library on hooks/logic only.
- Backend is TDD: failing test first.
