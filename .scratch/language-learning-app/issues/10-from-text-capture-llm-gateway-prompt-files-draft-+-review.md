# 10: From-text capture: LLM gateway, prompt files, draft + review

**What to build:** On the vocabulary tab, "Add from text": paste/type a phrase and optional surrounding context → the API returns an LLM-drafted expression (not saved) → review screen pre-fills the create form from ticket 07 → save via `POST /expressions`. This ticket introduces the whole LLM stack. PRD stories 11, 12, 50 and the amendments (structured output, LangSmith, prompts as files).

**LLM gateway (decision):** `LlmGateway` interface with role-specific methods, one per prompt: `draftExpression(input)`, later `tutorFirstMessage`, `tutorReply`, `assess`, `narrative`, `generateGapsRound`, `judgeDescribe`, `judgeSmuggle`. Real implementation `OpenRouterGateway` uses LangChain.js `ChatOpenAI` pointed at OpenRouter (`configuration.baseURL = "https://openrouter.ai/api/v1"`, `apiKey = OPENROUTER_API_KEY`, `modelName` from the role's env var) and **always** `model.withStructuredOutput(zodSchema)` — no free-text JSON parsing anywhere. `FakeLlmGateway` for tests returns canned typed objects and records calls. LangSmith: set `LANGSMITH_TRACING/API_KEY/PROJECT` env and pass `tags: [role]`, `metadata: { trainingId? }` on each invoke via `RunnableConfig`.

**Prompt loader (decision):** `api/prompts/<role>.md` files with `{{placeholder}}` tokens; `loadPrompt(role)` reads once and caches; `renderPrompt(template, vars)` throws on a missing placeholder value. Test: loader interpolates and fails loudly. No prompt text in `.ts`.

**Prompt file `api/prompts/draft-expression.md`** (port of Go `BuildDraftExpressionPrompt`; structured output replaces the JSON instruction lines):
```
You are an English language expert.
Draft a vocabulary entry for the following expression: {{text}}
{{#context}}Surrounding context: {{context}}{{/context}}
Fill: type (word|phrase|idiom|sentence|collocation|phrasal_verb), partOfSpeech (noun|verb|adjective|adverb),
meaning (clear definition), examples (2-3 sentences using the expression), tags, frequency (very_common|common|moderate|uncommon|formal/academic).
```
Structured schema = `ExpressionDraftSchema` (contracts): `{ type, partOfSpeech?, meaning, examples: string[], tags: string[], frequency }`. Service stamps `expression: text` on the draft (as Go did) — the model does not choose the headword.

**API:** `POST /expressions/from-text` body `{ text: string (1..200), context?: string (..1000) }` → `200 ExpressionDraft`. Not persisted. LLM failure (after one retry) → `502 LLM_UNAVAILABLE`.

- [ ] api tests (fake gateway): draft returned with `expression` = input text; empty text → 400; gateway throws twice → 502; gateway called with `role: 'draft'`.
- [ ] prompt loader tests: interpolation; missing var throws; optional block renders/omits.
- [ ] app: "Add from text" screen → review form pre-filled → save calls normal create (hook test).
- [ ] Manual with a real OPENROUTER key: draft "cut corners", see meaning/examples, save; trace visible in LangSmith with tag `draft`.
