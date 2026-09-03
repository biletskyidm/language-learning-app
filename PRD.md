# PRD: Language Learning Mobile App (v3)

## Problem Statement

I collect English words, phrases and idioms and want to actually *own* them: produce them in realistic conversation, get structured feedback, and have a spaced-repetition system decide what to revisit. Two earlier iterations exist: an MCP server used from Claude Desktop (data layer only, chat-bound UX) and a Go HTTP API (scripted endpoints, no client). Neither is something I can open on my phone and use for ten minutes on a commute. The practice loop is not in my pocket, drills do not exist, and nothing keeps history of what I got right or wrong.

## Solution

A personal iOS app (React Native + Expo) backed by a new TypeScript API on AWS Lambda. The app is the complete home of my vocabulary and the daily practice loop:

- **Vocabulary**: browse, search, edit, delete; capture new expressions by typing/pasting text and letting the LLM draft the full card for review.
- **Tutor chat trainings**: scenario-based conversations (presets or free text, formal/informal) where target phrases are shown as chips, the tutor steers toward them, and every message gets a compact 5-axis assessment that expands on tap.
- **Short drills**: Gaps (cloze), Describe-it (taboo), Smuggle (three phrases in one message), played as sessions of rounds.
- **SRS**: the existing interval ladder, fed equally by chats and drills, with every score change snapshotted on the training that caused it.
- **History and progress**: every training of every type is fully saved and reviewable; per-phrase and per-session progress views.

The backend owns all LLM calls through LangChain.js + OpenRouter, with model ids per role configured in environment variables. The data model is decoupled from MongoDB behind repository interfaces so the store can be swapped later. Single user, static bearer token, no accounts.

## User Stories

### Access and setup
1. As the user, I want to enter my API URL and shared secret once on first launch and have them stored in secure storage, so that the app works without a login flow.
2. As the user, I want the app to generate a short-lived bearer token from the secret for each request and the backend to verify it, so that no constant token ever sits in a config or on the wire.
3. As the user, I want every request with a missing, invalid, stale or replayed token to be rejected, so that nobody else can use my backend.
4. As the user, I want the backend to stamp a fixed userId on every record and filter every query by it, so that the data layer is ready for multi-user without being multi-user now.

### Vocabulary management
5. As the user, I want to see my expressions in a list with search by text, so that I can find what I have added.
6. As the user, I want to filter the list by tag, frequency, and "due now", and sort by score, next due date, or times practiced, so that I can focus on what matters.
7. As the user, I want to open an expression and see its type, part of speech, meaning, examples, tags, frequency, and SRS fields (score, times practiced, last practiced, next due), so that I can review it fully.
8. As the user, I want a visible counter of how many times each expression has been trained, shown both in the list row and on the expression card, so that I can see at a glance what I have actually practiced.
9. As the user, I want to edit any field of an expression, so that I can fix typos or refine meanings.
10. As the user, I want to delete an expression, so that I can drop things I no longer want to learn.
11. As the user, I want to type or paste a phrase (optionally with surrounding context) and receive an LLM-drafted expression card that is not yet saved, so that I can review before committing.
12. As the user, I want to edit the drafted card and then save it through the normal create flow, so that I stay in control of what enters my vocabulary.
13. As the user, I want the vocabulary list and training history to be cached on the device, so that screens open instantly and only LLM actions need the network.

### Choosing what to practice
14. As the user, I want the backend to pick target expressions automatically (SRS-due first, then unpracticed by frequency tier from very_common to formal/academic), so that I never have to decide what to study.
15. As the user, I want to see the picker's suggestion before a session starts and optionally swap items or pick by tag/search, so that I can override when I have a specific goal.
16. As the user, I want default target counts per mode (chat, gaps, describe, smuggle) to be configurable in settings, so that sessions fit my energy.

### Tutor chat trainings
17. As the user, I want to start a chat by choosing a saved scenario preset or typing a free-text context, plus a formal/informal style, so that the conversation is grounded in a situation.
18. As the user, I want to create, edit and delete scenario presets, so that my common situations are one tap away.
19. As the user, I want the tutor's opening message generated and saved at creation, so that I have something to respond to immediately.
20. As the user, I want the target expressions snapshotted on the training at creation, so that the session always refers to the same items.
21. As the user, I want my targets shown as chips during the chat that light up once used correctly, so that I know what is still open.
22. As the user, I want the tutor to steer the conversation toward situations where my targets fit without naming them, so that practice feels natural.
23. As the user, I want to send a message and receive the tutor reply and my assessment in one response, so that the turn feels like a normal exchange.
24. As the user, I want each of my messages assessed on grammar, vocabulary diversity, sentence complexity, sentence naturalness, and target-expression correctness, each scored 0–10 with a suggested rewrite and, for targets, a correct version, so that feedback is complete.
25. As the user, I want each of my bubbles to show a compact score badge that expands to the full breakdown on tap, so that the conversation flow is not interrupted.
26. As the user, I want targets I attempted in a message to have their SRS updated immediately after that turn, so that scheduling works turn by turn.
27. As the user, I want targets I did not use in a message (score 0) to be left untouched, so that not yet using a phrase is neutral.
28. As the user, I want a failed turn (LLM timeout or invalid output after a retry) to save nothing and keep my draft, so that there are never half-turns in history.
29. As the user, I want to have several active chats and resume any of them, so that I can keep parallel conversations going.
30. As the user, I want an "End session" button always available and a nudge to end once every target has been used correctly, so that sessions have a natural close.
31. As the user, I want completion to compute per-category averages that stay permanently visible on the training (header of the ended chat and in the history list), plus per-target stats (used, used correctly, average score), and a short LLM narrative (strengths, areas for improvement, suggested focus), so that I get numbers I can trust and prose I can act on.
32. As the user, I want to cancel a chat at any time without a final assessment, so that I can abandon sessions not worth finishing.

### Drills
33. As the user, I want to start a Gaps session where the LLM writes a short paragraph using my target phrases with the phrases blanked out, and I place the phrases from a shuffled bank, so that I practice recognition cheaply.
34. As the user, I want Gaps checked deterministically by exact normalized match per blank, so that results are instant and predictable.
35. As the user, I want to start a Describe-it session where I explain a target phrase without using its words and the LLM guesses which of the session's targets I meant, so that I prove I own the meaning.
36. As the user, I want to start a Smuggle session where I must work three target phrases into one natural message and the LLM judges each phrase for presence, correct meaning and natural fit, then replies in character, so that I practice production.
37. As the user, I want each drill to be a session of rounds ("another one") that I end explicitly, so that history stays tidy.
38. As the user, I want every drill round saved with its targets, my answer, and the verdict per phrase, so that I can later see where I was right and wrong.
39. As the user, I want a correct drill answer to write score 8 and a wrong one to write score 2 into the SRS math, so that drills advance the normal ladder without granting the "easy" bonus and wrong answers force immediate review.
40. As the user, I want new drill types to be cheap to add later, so that the drill set can grow.

### SRS and history
41. As the user, I want the interval ladder (1d, 3d, 7d, 14d, 30d, then doubling) with score adjustments (≤3 review now, ≤6 half interval, 7–8 base, ≥9 1.5×) and running-average scoring ported unchanged, so that behavior matches what I already rely on.
42. As the user, I want chats and drills to feed SRS with identical weight, so that there is one scoring path.
43. As the user, I want every SRS change to be recorded on the training that caused it (expression, score written, before/after values of score, times practiced, next due), so that I can audit how a phrase got its schedule.
44. As the user, I want to list all trainings of all types, filterable by type and status, so that I can find active sessions and review past ones.
45. As the user, I want to open any past training and see its full content (messages with assessments, or rounds with verdicts) and its SRS effects, so that I can learn from history.

### Progress
46. As the user, I want a home view showing how many phrases are due today and my active sessions, so that I know what to do next.
47. As the user, I want a per-phrase progress list sortable by score, due date and times practiced, so that I see which phrases land and which slip.
48. As the user, I want a per-session view of final assessment aggregates and narrative, so that I can see how sessions went.

### Operations
49. As the user, I want the same handler code to run as a local Node server against a docker-compose Mongo and as a Lambda behind a Function URL, so that I can iterate locally and deploy with one path.
50. As the user, I want all model ids per role configured in environment variables, so that I can switch models without a code change.
51. As the user, I want the whole stack (app, API, infra, shared contracts) in one monorepo with fresh CDK in TypeScript, so that types are shared and deployment is one command.

## Implementation Decisions

### Stack
- **App**: React Native + Expo, iOS only in v1, installed via dev build / TestFlight. expo-router for navigation, TanStack Query for server state and cache, plain StyleSheet with a small token file, system light/dark theme, expo-secure-store for the token. Text only; no dictation or TTS.
- **API**: TypeScript on AWS Lambda, single function behind a Lambda Function URL, Hono router in-process, same handler tree served by a local Node server in development.
- **LLM**: all calls from the backend through LangChain.js with the OpenRouter chat integration. Model ids live in env vars, one per role: reply, assessment, narrative, draft, drill generation, drill judging. Initial default for every role is the OpenRouter id the user named as `gpt5.6-luna` (exact id to be confirmed against OpenRouter's catalog at setup). Every LLM call uses LangChain structured output (`withStructuredOutput` bound to a zod schema from the contracts package); no free-text JSON parsing. Decoders validate the typed result before use.
- **Observability**: LangSmith tracing enabled for every LLM call (project name, API key and tracing flag via env vars); traces tagged with training id, type and role so a bad turn can be inspected end to end.
- **Database**: the existing MongoDB Atlas cluster, database and `expressions` collection are reused as-is for both local development and Lambda; the collection already holds the user's vocabulary and nothing is rebuilt from scratch. Records created by the MCP server carry no `userId` and lack some optional fields, so a one-time idempotent migration stamps the single userId and fills `tags`/`examples` defaults without touching SRS fields (absence of `score` is meaningful to the picker). Mappers tolerate both MCP-era and Go-era document shapes. A docker-compose Mongo exists only as an optional sandbox. All access goes through repository interfaces so Mongo can be replaced by RDS or DynamoDB without touching services or handlers.
- **Infra**: monorepo with `app`, `api`, `infra` (CDK, TypeScript) and `packages/contracts` (zod schemas shared by API validation and app types). local development runs against the existing Atlas database; an optional docker-compose Mongo sandbox can be filled by a clone script.
- **Auth**: a shared secret (not a constant token) is configured in both backend env and app secure storage. The app generates a short-lived bearer token from the secret per request (HMAC-SHA256 over a timestamp and nonce); middleware recomputes the signature, checks freshness, rejects replays, and injects the fixed userId. Token generation and verification live in one shared module in the contracts package so both sides cannot drift.
- Old MCP server and Go API are retired once the app is in daily use; their code stays in the sibling repo as reference only. The `trainings` collection is empty today, so its schema is unconstrained.

### Code principles
- SOLID throughout the backend and app logic: single-responsibility modules (handler, service, repository, LLM gateway, prompt loader, scheduler each do one thing); open for extension via typed training/drill strategies so a new drill type is a new module, not an edit to a switch; substitutable fakes for every boundary (repository, LLM client, clock, token generator); small role-specific interfaces rather than one wide client; dependencies injected through interfaces so services never import Mongo, LangChain or Expo modules directly.

### Data model
- **Expression** keeps the existing shape: expression, type (word | phrase | idiom | sentence | collocation | phrasal_verb), partOfSpeech, meaning, examples, tags, frequency (very_common | common | moderate | uncommon | formal/academic), createdAt, and SRS fields score, timesPracticed, lastTimePracticedAt, nextTrainingAt. "Unpracticed" means the score field is absent.
- **Training** is one collection for every session type: `type` (chat | gaps | describe | smuggle), status (ACTIVE | COMPLETED | CANCELED), timestamps, snapshotted expressionIds, a type-specific payload, and an `srsEffects` array of snapshots `{expressionId, scoreWritten, before: {score, timesPracticed, nextTrainingAt}, after: {...}, at}`.
  - chat payload: context, style, messages `{role, content, createdAt, assessment?}`, finalAssessment on completion.
  - drill payloads: rounds `[{targets, prompt/generated material, answer, verdicts per target, at}]` plus aggregates on completion.
- **Settings** document: default target counts per mode, default style.
- **Scenarios** collection: named presets with context and style.

### Assessment shapes
- Per-message assessment identical to the Go implementation: four category scores `{score 0–10, messageWithSuggestions}` plus `targetExpressionCorrectness` map `{expression → {score, messageWithSuggestions, correctVersion}}`.
- Final chat assessment: deterministic averages per category, per-target stats (used, usedCorrectly, average score), plus narrative fields strengths, areasForImprovement, suggestedFocus from one LLM call. The averages are stored on the training and always rendered on ended trainings (detail header and history row), not hidden behind the narrative.
- Drill verdicts map to constants: correct 8, wrong 2.

### Smart picker
- Ported from the MCP aggregation: priority 1 = has score and nextTrainingAt ≤ now; 2–6 = no score, by frequency tier very_common → formal/academic; sort by priority; limit N. Implemented in the repository; the ranking rule is also a pure function for tests. Client may pass explicit expressionIds to override.

### Chat turn flow
- Synchronous, no streaming. Two LLM calls in parallel: reply (with history, context, style, targets) and assessment (targets with meanings, context, style, user message). Each call retried once. The turn is atomic: on any failure nothing is persisted and the client keeps the draft.
- After persisting, each target with a non-zero score gets the SRS update and a snapshot appended to the training. Score 0 means untouched.
- Completion is manual; the app nudges once every target has been used correctly at least once. Completion runs aggregation plus one narrative call. Cancel stores nothing extra.
- Every prompt is a separate template file (one file per role: tutor first message, tutor reply, assessment, narrative, draft expression, each drill's generation and judging) in a dedicated prompts directory, with placeholders filled at runtime. Prompt text is never embedded in TypeScript, so wording can be edited without touching code; the prompt builder only loads and interpolates. Prompts start from the Go prompt builders (tutor first message, tutor reply, assessment, narrative, draft expression) and gain drill prompts. The assessment pipeline is shaped so a "detected non-target candidates" list can be added later without schema changes; not built in v1.

### Drill flows
- Start session → training created with type and picked targets. Each round: backend generates material (Gaps paragraph with blanks and answer order; Describe-it target; Smuggle triple), client submits an answer, backend judges, persists the round, applies SRS with constants, returns verdicts.
- Gaps judged deterministically by normalized exact match per blank. Describe-it: LLM picks among the session's target set. Smuggle: LLM judges each phrase and returns an in-character reply.
- End session → COMPLETED with round aggregates. Cancel available.

### API surface
```
GET/POST        /expressions            list (search, tag, frequency, due, sort) / create
GET/PATCH/DELETE /expressions/:id
POST            /expressions/from-text  returns draft, not saved
GET             /expressions/pick       smart picker preview (limit)

GET/POST        /trainings              list (type, status) / create {type, expressionIds?, limit?, context?, style?, scenarioId?}
GET             /trainings/:id
POST            /trainings/:id/messages chat turn → {reply, assessment, srsEffects}
POST            /trainings/:id/rounds   drill: generate next round
POST            /trainings/:id/rounds/:roundId/answer  drill: judge → {verdicts, reply?, srsEffects}
POST            /trainings/:id/complete
POST            /trainings/:id/cancel

GET/PUT         /settings
GET/POST        /scenarios, PATCH/DELETE /scenarios/:id
GET             /progress               due-today count, active sessions, per-phrase summary
```

## Testing Decisions

- A good test exercises observable behavior through a public boundary and never asserts on call counts, private state, or prompt wording beyond what the contract needs. Tests run without network or database.
- **Backend is TDD** (red-green-refactor, no production code without a failing test) at one primary boundary: the Hono app invoked in-process with two fakes injected — an in-memory repository set and a fake LLM client returning canned JSON. Services are exercised only through handlers.
- Pure modules are unit-tested directly: SRS scheduler (date math incl. thresholds), score averaging, picker ranking rule, assessment/draft/narrative decoders (including malformed input), prompt builders, BSON↔domain mappers, drill judging (Gaps normalization).
- Also unit-tested: the shared token generate/verify module (valid, stale, replayed, wrong secret) and the prompt loader (placeholder interpolation, missing placeholder fails loudly).
- Not tested: the real Mongo repository queries, the real OpenRouter client, and LangSmith wiring.
- **App is pragmatic**: hooks and logic tested with Jest + React Native Testing Library against a mocked API client; screens are not unit-tested.
- Prior art: the Go API's handler tests via httptest with fake repo and fake LLM, and its pure-module tests, are the pattern being reproduced in TypeScript.

## Out of Scope

- Story mode (interactive fiction with hidden objectives) — deferred, not dead.
- Voice: dictation, TTS, pronunciation.
- Streaming responses.
- Credit for non-target phrases used incidentally (pipeline shaped for it, not built).
- Reminders and push notifications.
- Android, Expo Go, App Store distribution.
- Multi-user, accounts, OAuth, billing.
- Agent-driven modes (LangGraph tutor); LangChain is used purely as the LLM client layer.
- Offline writes or local-first sync; only read caching.
- Rich analytics dashboard (trends, streaks, mistake categories).
- iOS share sheet, clipboard capture, long-press capture from tutor bubbles.
- Migration of old trainings (none exist) and any change to the expression schema beyond additive fields.

## Further Notes

- **Delivery**: vertical slices, each usable on the phone, backend half TDD. The app has no offline mode and always needs the API, so the Lambda is deployed right after auth and redeployed after every slice; before that, and for local iteration, the app points at the Mac's LAN address. Tickets live in `.scratch/language-learning-app/issues/` (28 story-level tickets with blocking edges):
  1. Monorepo skeleton, contracts package, local server + docker Mongo, app shell with health.
  2. Shared-secret token handshake and auth middleware.
  3. CDK deploy to Lambda Function URL with env wiring — redeployed after each later slice.
  4. Expressions: list + search, filters/sort, detail with trained counter, create, edit, delete.
  5. From-text capture: LLM gateway (LangChain.js + OpenRouter, structured output, LangSmith), prompt template files, draft + review.
  6. Smart picker + manual override screen.
  7. Chat training: create with opening message, turn with parallel reply/assessment (atomic), compact expandable assessment UI, SRS write-back, SRS snapshots.
  8. Chat lifecycle: sessions list/resume, end nudge + completion with persistent averages and narrative, cancel — **milestone 1: daily use begins (vocab + chat on Lambda)**.
  9. Drill framework + Gaps, then Describe-it, then Smuggle, as round sessions.
  10. Settings and scenario presets.
  11. Home (due today, active sessions), per-phrase progress, unified history with SRS effects.
- Reference implementations to port: SRS math and picker aggregation from the sibling repo's MCP server; prompts and assessment decoder from its Go API.
- Open items to settle during build: exact OpenRouter model id, env var names (incl. LangSmith and shared secret), token lifetime window, HTTP error shape, Lambda memory/timeout for parallel LLM calls, Gaps normalization rules, settings defaults (proposed chat 5, gaps 4, describe 1, smuggle 3).
