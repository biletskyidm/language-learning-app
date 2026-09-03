# PRD: Language Learning API (v1)

## Problem Statement

I want to learn English words and phrases by using them in realistic written conversations and getting structured feedback. My current setup is an MCP server connected to Claude Desktop. That works for the data layer, but the entire user experience is constrained by the chat interface: I cannot build dedicated screens, structured workflows, persistent training sessions, vocabulary management UIs, or any client of my choosing. Every session requires me to manually craft prompts and orchestrate the flow, and there is no API I can build a real product on top of.

I also want to deepen my understanding of how to build modern AI agents, but the chat interface gives me no surface to experiment with agent patterns. I need a foundation I can build on top of for both the structured product and the agent experiments.

## Solution

A Go HTTP API that owns the language-learning domain end-to-end, with no dependence on a chat interface. The API exposes deterministic, scripted endpoints that any client (web, mobile, CLI, scripts) can drive. It manages a personal vocabulary, runs training sessions where I chat with an LLM tutor and use target expressions, returns per-message and final assessments, and tracks spaced-repetition progress.

A separate `/chat` agent endpoint will be designed in its own PRD later. The scripted product and the agent experiment will share the same underlying services and data, so the agent has a real domain to operate on instead of a toy.

The API runs locally as a plain HTTP server during development and is deployed to AWS Lambda via the existing CDK infrastructure. The same handler and service code runs in both environments; only the entry point differs.

## User Stories

### Vocabulary management

1. As the user, I want to add a new expression to my vocabulary with its type, meaning, examples, frequency, part of speech, and tags, so that I can build up the set of things I'm trying to learn.
2. As the user, I want to list my expressions with search and filters (by text, frequency, tag), so that I can browse and find what I've added.
3. As the user, I want to read a single expression, so that I can review its full details.
4. As the user, I want to update an expression, so that I can fix typos, add examples, or refine its meaning.
5. As the user, I want to delete an expression, so that I can remove things I no longer want to learn.
6. As the user, I want each expression to track how many times I've practiced it, when I last practiced it, when it's next due, and a running score, so that the system can prioritize what I should review next.

### Vocabulary promotion from training

7. As the user, when an LLM uses a word or phrase I like or don't understand during a training session, I want to send that text to the API and get a fully drafted expression object back without it being saved, so that I can review the LLM-generated fields before committing.
8. As the user, I want to optionally include surrounding context when drafting an expression, so that the LLM disambiguates the meaning correctly when the same word can mean multiple things.
9. As the user, I want to edit the drafted expression and then save it via the normal create endpoint, so that I stay in control of what enters my vocabulary.

### Training creation

10. As the user, I want to create a new training session with a free-text context (e.g. "scrum standup with the dev team") and a style (formal or informal), so that the conversation feels grounded in a specific situation.
11. As the user, I want to optionally pass a list of expression IDs that I want to practice, so that I can target specific items I'm working on.
12. As the user, when I do not provide expression IDs, I want the API to automatically pick what I should practice using the spaced-repetition rules (due first, then unpracticed by frequency tier), so that I don't have to think about what to study.
13. As the user, I want the training to be created with the tutor's first message already generated and saved, so that when I open it I see something to respond to immediately.
14. As the user, I want the IDs of target expressions to be snapshotted on the training, so that the training always references the same items I started practicing.

### Training conversation

15. As the user, I want to send a message to a training session and get back the tutor's next reply along with the assessment of my message in a single response, so that the API feels like a normal request/response interaction.
16. As the user, I want each of my messages assessed across grammar, vocabulary diversity, sentence complexity, sentence naturalness, and target expression correctness, so that I get a complete picture of how I'm doing.
17. As the user, I want the tutor's reply and the assessment to come from different models — a fast cheap model for the reply and a more capable model for the assessment — so that conversation stays snappy without sacrificing feedback quality.
18. As the user, I want assessments to use a structured JSON shape, so that any client can render them consistently.

### Training lifecycle

19. As the user, I want to list all my trainings filtered by status, so that I can find active sessions to continue and review past ones.
20. As the user, I want to read a single training and see its full message history with per-message assessments, so that I can review what I said and how the tutor evaluated it.
21. As the user, I want to resume any non-completed, non-canceled training and continue the conversation, so that I can pick up where I left off.
22. As the user, I want to have multiple active trainings at the same time, so that I can have several conversations going in parallel without being forced to finish one before starting another.
23. As the user, I want to complete a training and have a final assessment automatically computed and stored, so that I get a holistic view of how the session went.
24. As the user, I want the final assessment to combine deterministic per-category aggregates with a short LLM-generated narrative covering strengths, weaknesses, and what to focus on next, so that I get both trustable numbers and useful prose.
25. As the user, I want to cancel a training at any time without running a final assessment, so that I can abandon sessions that aren't worth finalizing.
26. As the user, after every turn in a training, I want each target expression that was assessed in my message to have its progress fields updated (score, times practiced, next training date) immediately, so that the SRS scheduler keeps working turn by turn without waiting for the training to be completed.

### Authentication and isolation

27. As the user, I want every request to require a static bearer token I configure in an environment variable, so that nobody else can hit my API.
28. As the user, I want the user ID to be derived from the validated token and stamped onto every record I create, so that the data layer enforces ownership consistently even though there's only one user.

### Local development and deployment

29. As the user, I want to run the API as a plain local HTTP server during development with the same handler and service code that runs in Lambda, so that I can iterate quickly without deploying.
30. As the user, I want to deploy the API to AWS Lambda via CDK, so that I can use it from anywhere without running a server locally.

## Development Methodology

**This project will be built test-first using TDD.** Every module listed under "Modules under test" below is implemented via the red-green-refactor loop:

1. Write a failing test that defines the next slice of behavior through the module's public interface.
2. Write the smallest implementation that turns the test green.
3. Refactor under the green test, keeping the suite passing on every save.

This is non-negotiable for the pure modules (SRS Scheduler, Score Aggregator, Final Assessment Aggregator, Assessment Decoder, Prompt Builder, Repository Mappers) and the service modules (Expression Service, Training Service) where fakes stand in for the LLM client and repositories. Handlers and middleware are exercised the same way via `httptest`.

No production code is written without a failing test that demands it. No test is written after the fact to "cover" code that already exists. Each tracer-bullet slice in the delivery plan is itself a TDD cycle: write the failing end-to-end-ish test for the slice, then drive the inner modules out under their own unit tests until the slice is green.

The boundary modules explicitly excluded from unit testing (real LLM client, raw Mongo query code) are the only places where code may land without a preceding test.

## Implementation Decisions

### Stack

- Language: Go.
- Database: MongoDB (existing Atlas setup).
- Deployment: AWS Lambda via CDK (reusing the existing infrastructure pattern from `/mcp`).
- Local execution: plain HTTP server using stdlib `net/http` (Go 1.22+ routing) running as a normal process.
- Lambda execution: the same handler tree running behind a Lambda entry point (Lambda Web Adapter or `aws-lambda-go-api-proxy`) so that one code path serves both environments.
- LLM SDK: official `anthropic-sdk-go`.
- Models: Claude Haiku 4.5 for tutor replies; Claude Sonnet 4.6 for assessments and narrative summaries.
- Structured LLM output: JSON via prompt instructions plus assistant prefill — no tool use in v1.

### Project layout

- New sibling folder `/api`. Existing `/mcp` is kept until parity is reached in real use, then deleted.
- Two entry points (`cmd/server` and `cmd/lambda`) wire the same internal packages with environment-specific configuration.
- Domain-per-folder layout: each domain (expressions, trainings) owns its handler, service, repository (interface plus Mongo implementation), model, and tests in one package.
- Shared infrastructure packages for the LLM client, auth middleware, and HTTP helpers.

### Authentication

- Static bearer token configured via environment variable.
- Middleware validates the `Authorization: Bearer <token>` header on every request and injects a single hardcoded `userId` into the request context. There is no users collection.
- Every record stores `userId` and every query filters by it, even though there is only one user. This keeps the data layer honest and ready for future multi-user work.

### Collections and schemas

Two collections: `expressions` and `trainings`.

**Expression** (preserves the existing MCP shape, plus `userId`):

- Identity and ownership: `_id`, `userId`.
- Lexical: `expression`, `type` (word | phrase | idiom | sentence | collocation | phrasal_verb), `partOfSpeech` (noun | verb | adjective | adverb), `meaning`, `examples`, `tags`, `frequency` (very_common | common | moderate | uncommon | formal/academic).
- Lifecycle: `createdAt`.
- SRS progress: `score`, `timesPracticed`, `lastTimePracticedAt`, `nextTrainingAt`.

Per-expression history is not stored on the document. It is derived on read from the `trainings` collection when needed.

**Training**:

- Identity and ownership: `_id`, `userId`.
- Status: one of `ACTIVE`, `COMPLETED`, `CANCELED`.
- Timestamps: `createdAt`, `completedAt`, `canceledAt`.
- Configuration: free-text `context`, `style` enum (`formal` | `informal`), `exerciseMode` set to `chat` for v1.
- Targets: `expressionIds` snapshotted at creation. Expressions are immutable in meaning, so referencing by ID is sufficient.
- Messages: embedded array of `{ role, content, createdAt, assessment? }`. Assessment is present only on user messages.
- `finalAssessment`: present only on `COMPLETED` trainings.

### Assessment shapes

**Per-message assessment** covers all five categories:

- `grammar`: `{ score, messageWithSuggestions }`
- `vocabularyDiversity`: `{ score, messageWithSuggestions }`
- `sentenceComplexity`: `{ score, messageWithSuggestions }`
- `sentenceNaturalness`: `{ score, messageWithSuggestions }`
- `targetExpressionCorrectness`: a map of `expression -> { score, messageWithSuggestions, correctVersion }`

**Final assessment** is hybrid:

- Deterministic aggregates: per-category averages computed from all user-message assessments in the training, plus per-target-expression stats (used / used correctly / final score).
- LLM narrative: a single Sonnet call returns a short prose section with strengths, weaknesses, and a suggested focus for next session.
- Stored once on the `COMPLETED` transition. `CANCELED` skips this entirely.

### Training turn flow

- Synchronous request/response. No streaming, no polling.
- A turn issues two LLM calls in parallel: Haiku generates the tutor's next reply against the running conversation; Sonnet assesses the just-received user message against the targets, context, and style.
- The endpoint returns `{ reply, assessment }` once both calls complete. The user message and tutor reply are appended to the training's embedded messages array, and the assessment is attached to the user message.
- After the assessment is persisted, every target expression that received a non-zero score in this turn's `targetExpressionCorrectness` map has its SRS progress updated in the same request, before the response is returned.

### SRS update

- SRS progress is updated per turn: each target expression assessed in the just-handled user message has its running average score, `timesPracticed`, `lastTimePracticedAt`, and `nextTrainingAt` recomputed and written back to the `expressions` collection immediately.
- Training completion does not re-run SRS updates. It only computes and stores the hybrid final assessment.
- The scheduling rules are ported directly from the existing Node implementation in `mcp/service.mjs` (intervals 1d, 3d, 7d, 14d, 30d, then doubling; score-based adjustments).

### Smart picker

- Used when `POST /trainings` is called without `expressionIds`.
- Selection rules: SRS-due expressions first (`nextTrainingAt <= now`), then unpracticed expressions ordered by frequency tier (very_common → formal/academic), capped by the `limit` parameter.
- Implementation lives in the expression repository as a Mongo aggregation. The pure ranking rule is extractable as a standalone function for testing if and when the aggregation grows complex enough to warrant it.

### Vocabulary promotion (`POST /expressions/from-text`)

- Two-step preview/confirm flow.
- The endpoint accepts `{ text, context? }` and calls Sonnet to draft a full expression object (type, partOfSpeech, meaning, examples, frequency).
- The draft is returned to the client and **not saved**. The client may edit and then call the regular `POST /expressions` to commit it.

### API surface

```
POST   /expressions
GET    /expressions
GET    /expressions/:id
PATCH  /expressions/:id
DELETE /expressions/:id
POST   /expressions/from-text          # returns draft, not saved

POST   /trainings                      # body: { context, style, expressionIds?, limit? }
GET    /trainings                      # filters: status
GET    /trainings/:id
POST   /trainings/:id/messages         # returns { reply, assessment }
POST   /trainings/:id/complete         # runs hybrid final assessment
POST   /trainings/:id/cancel           # no final assessment
```

### Modules

Deep modules with stable interfaces, designed to be tested in isolation:

- **SRS Scheduler**: pure function from `(timesPracticed, lastPracticedAt, score)` to the next due date. Ported from the existing Node implementation.
- **Score Aggregator**: pure running-average computation for expression scores.
- **Smart Picker / Ranker**: the ranking rule that orders candidate expressions for a new training. Lives in the repository as an aggregation; the rule is conceptually one unit.
- **Final Assessment Aggregator**: pure function from a list of per-message assessments to per-category averages and per-expression stats.
- **Assessment Decoder**: pure validation and parsing of the LLM's JSON output into typed assessment structs.
- **Prompt Builder**: pure function that builds tutor-reply, assessment, narrative, and from-text prompts from inputs.
- **Repository Mappers**: pure conversions between BSON documents and domain structs for both collections.
- **Expression Service**: orchestrates CRUD plus the `from-text` draft flow.
- **Training Service**: orchestrates training creation (with or without smart picker), turn handling (parallel reply and assessment, followed by per-turn SRS write-back for assessed targets), completion (deterministic aggregation plus narrative LLM call), and cancellation.

Boundary modules that are deliberately not unit tested:

- **LLM Client**: interface exposing `GenerateReply`, `AssessMessage`, and `DraftExpressionFromText`. Real implementation wraps `anthropic-sdk-go`. Tests use a fake that returns canned JSON strings.
- **Repository query layer**: the actual Mongo calls. Mappers around them are tested.

Cross-cutting:

- **Auth Middleware**: validates the static bearer token and injects `userId` into the request context.
- **HTTP Handlers**: thin layer that parses requests, calls services, and formats responses.

## Testing Decisions

### What makes a good test

A good test exercises observable behavior through a module's public interface. It does not assert on internal call counts, private fields, or implementation details that could change without affecting the contract. It uses fakes at the boundaries (LLM client, repositories) so that pure logic can be exercised quickly and deterministically without hitting a network or a database.

**Tests are always written first.** TDD is the mandated workflow for this project, not a suggestion (see "Development Methodology" above). The failing test defines the contract, the implementation makes it pass, and refactoring happens under the green test. Code that arrives without a preceding failing test does not belong in this codebase, with the sole exception of the boundary modules listed below.

### Modules under test

- SRS Scheduler — pure date math.
- Score Aggregator — pure arithmetic.
- Final Assessment Aggregator — pure aggregation over per-message assessments.
- Assessment Decoder — JSON parsing and validation, including malformed input.
- Prompt Builder — string composition for each prompt template.
- Repository Mappers — BSON to domain and back, for both collections.
- Expression Service — exercised with fake repository and fake LLM client.
- Training Service — exercised with fake repository and fake LLM client; covers create-with-and-without-`expressionIds`, turn handling (including per-turn SRS write-back), completion, and cancellation.
- HTTP handlers — exercised via `httptest` against the real router, with services or their dependencies faked as needed.
- Auth middleware — bearer token validation and `userId` injection.

### Modules NOT under test

- The real LLM client implementation. Tests assume the LLM returns valid JSON; the client's job is to call the API and return the string.
- The raw Mongo query code in repositories. The mappers around it are tested.

### Prior art

There is no Go test suite in this repository yet. The MCP server in `/mcp` is untested. This PRD's testing approach is new prior art for the project.

## Out of Scope

- The `/chat` agent endpoint and any agent-driven flows. These will be designed in their own PRD on top of the same data and services.
- Any frontend (web, mobile, CLI, desktop).
- Streaming responses (SSE, WebSockets, Lambda response streaming).
- Exercise modes other than `chat` (rephrasing, "make it more polite/casual", freestyle, audio).
- Audio or voice features of any kind.
- Multiple users, login flows, password handling, JWTs, refresh tokens, OAuth.
- Observability beyond what CloudWatch gives by default.
- Integration tests against real Mongo or real Claude.
- Editing or deleting messages within a training. Conversations are append-only.
- Per-expression history materialized on the expression document.
- Any feature in the original ideas document not explicitly listed in user stories above (collocations API, thesaurus, urban dictionary, dspy, promptfoo, elastic cache, tokenizing/stemming via `natural`, dashboards of mistakes, etc.).
- Removing the existing `/mcp` folder. It stays in the repo until parity is verified through real use, at which point it will be deleted in a separate change.

## Further Notes

- The existing Node MCP server in `/mcp` is the source of truth for two pieces of logic that are being ported: the SRS scheduling rules in `mcp/service.mjs` (`getNextTrainingDate`, `calculateAverageScore`) and the smart picker aggregation in `mcp/db.mjs` (`getExpressionsToLearn`). Behavior should be preserved unless TDD reveals a clearer rule.
- The original prompt drafts in `Words&phrases_learning_app.md` (assessment template, tutor first-message guidelines, training instructions) are the starting point for the Go prompt builder. They will be ported and then iterated on against real sessions.
- Delivery is sliced into vertical tracer-bullet steps so that every increment is end-to-end runnable through the local HTTP server with passing unit tests:
  1. Skeleton: server, router, auth middleware, health endpoint.
  2. Expressions CRUD with Mongo wired.
  3. Smart picker in the expression repository.
  4. LLM client (real implementation plus fake) and prompt builder.
  5. Training creation with the tutor's first message generated immediately.
  6. Training turn (parallel reply and assessment, with per-turn SRS write-back for assessed targets).
  7. Training list, read, and resume.
  8. Training complete (with hybrid final assessment) and cancel.
  9. `POST /expressions/from-text` draft endpoint.
  10. Lambda entry point and CDK deployment.
- Lambda deployment is intentionally last. Local server parity makes every prior slice runnable, so deploying earlier would only add infrastructure work without unblocking development.
- Open implementation details to settle while building (not architectural enough for this PRD): exact env var names, local config loading approach, HTTP error response shape, request validation library, Mongo connection reuse strategy in Lambda, and the final wording of each prompt template.