# 10: AI fill on the create form: LLM gateway, prompt files

**What to build:** On the create-expression form from ticket 07, a "Fill with AI" button next to the
expression field. Type the phrase, tap it, and the API drafts the remaining fields — the form is
populated in place and you save with the normal `POST /expressions`. No separate capture screen and
no separate review screen: the create form *is* the review. This ticket introduces the whole LLM
stack. PRD stories 11, 12, 50 and the amendments (structured output, LangSmith, prompts as files).

**LLM gateway (decision):** `LlmGateway` interface with role-specific methods, one per prompt:
`draftExpression(input)`, later `tutorFirstMessage`, `tutorReply`, `assess`, `narrative`,
`generateGapsRound`, `judgeDescribe`, `judgeSmuggle`. Real implementation `OpenRouterGateway` uses
LangChain.js `ChatOpenAI` pointed at OpenRouter (`configuration.baseURL =
"https://openrouter.ai/api/v1"`, `apiKey = OPENROUTER_API_KEY`, `modelName` from the role's env var)
and **always** `model.withStructuredOutput(zodSchema)` — no free-text JSON parsing anywhere.
`FakeLlmGateway` for tests returns canned typed objects and records calls. LangSmith: set
`LANGSMITH_TRACING/API_KEY/PROJECT` env and pass `tags: [role]`, `metadata: { trainingId? }` on each
invoke via `RunnableConfig`.

**Prompt loader (decision):** `api/prompts/<role>.md` files with `{{placeholder}}` tokens;
`loadPrompt(role)` reads once and caches; `renderPrompt(template, vars)` throws on a missing
placeholder value. `{{#name}}…{{/name}}` blocks are the one exception: they render when the value is
present and are omitted when it is absent. No prompt text in `.ts`.

**Prompt file `api/prompts/draft-expression.md`** (port of Go `BuildDraftExpressionPrompt`;
structured output replaces the JSON instruction lines):
```
You are an English language expert.
Draft a vocabulary entry for the following expression: {{text}}
Fill: type (word|phrase|idiom|sentence|collocation|phrasal_verb), partOfSpeech (noun|verb|adjective|adverb),
meaning (clear definition), examples (2-3 sentences using the expression), tags, frequency (very_common|common|moderate|uncommon|formal/academic).
```
Structured schema = `ExpressionDraftSchema` (contracts):
`{ type, partOfSpeech?, meaning, examples: string[], tags: string[], frequency }` — the drafted
fields only. The headword is the text the user typed; the model does not choose it and the response
does not echo it.

**API:** `POST /expressions/from-text` body `{ text: string (1..200) }` → `200 ExpressionDraft`. Not
persisted. Empty/oversized text → 400. LLM failure (after one retry) → `502 LLM_UNAVAILABLE`.

**App:** the button sits next to the Expression field on `/expressions/new` and is disabled while the
field is empty or the request is in flight. On success it **overwrites** type, partOfSpeech, meaning,
examples, tags and frequency with the draft — the expression field itself is untouched. On failure it
shows an inline message and leaves the form as it was; every field stays editable either way. Create
only — the edit screen does not get the button.

**Dropped from the earlier draft of this ticket:** the optional "surrounding context" input, and with
it the `context` field on the request and the `{{#context}}` block in the prompt. PRD story 11 still
describes context as optional input, so revisit if drafts turn out weak for phrases with several
senses. `{{#…}}` support stays in the loader for the tutor/assess prompts that need it.

- [ ] api tests (fake gateway): draft returned for valid text; empty text → 400; text over 200 chars → 400; gateway throws twice → 502; gateway invoked with the `draft-expression` role and the rendered prompt.
- [ ] prompt loader tests: interpolation; missing var throws; optional block renders/omits.
- [ ] app tests: button disabled on an empty expression; success overwrites the six fields and leaves the expression alone; failure shows the message and keeps the typed values; save still goes through the normal create hook.
- [ ] Manual with a real OPENROUTER key: type "cut corners", fill, see meaning/examples, edit one field, save; trace visible in LangSmith with tag `draft-expression`.
