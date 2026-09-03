# 03: CDK deploy: Lambda Function URL and env wiring

**Blocked by:** 02 (Shared-secret token handshake and auth middleware)

**Status:** ready-for-agent

**What to build:** `pnpm --filter infra deploy` builds the API with esbuild and deploys one Node 22 ARM64 Lambda behind a Function URL; the app's setup screen pointed at that URL with the shared secret works end to end (vocab + chat). PRD story 49 (Lambda part). Deploy happens now, right after auth, so every later ticket is tested on the phone against the real Lambda. Redeploy after each ticket (`pnpm --filter infra deploy`). **Milestone 1 (daily use)** = the redeploy after ticket 20 (cancel) lands, when vocab + chat are complete.

**Reference (old `infra/stack.js`, Go) — same topology, new runtime:**
```js
const fn = new lambda.Function(this, 'ApiFunction', {
  functionName: 'lang-learning-api-ts', runtime: lambda.Runtime.NODEJS_22_X, architecture: lambda.Architecture.ARM_64,
  memorySize: 1024, timeout: cdk.Duration.seconds(60),   // two parallel LLM calls + retry must fit
  environment: { AUTH_SECRET, USER_ID, MONGO_URI, MONGO_DB, OPENROUTER_API_KEY, REPLY_MODEL, ASSESSMENT_MODEL, NARRATIVE_MODEL, DRAFT_MODEL, DRILL_GEN_MODEL, DRILL_JUDGE_MODEL, LANGSMITH_TRACING, LANGSMITH_API_KEY, LANGSMITH_PROJECT },
});
const url = fn.addFunctionUrl({ authType: lambda.FunctionUrlAuthType.NONE });
new cdk.CfnOutput(this, 'ApiUrl', { value: url.url });
```
Use `NodejsFunction` (esbuild bundling, `externalModules: []`, `format: esm`). Handler `api/src/lambda.ts` = `handle(createApp(realDeps))` from `hono/aws-lambda`; prompts directory copied into the bundle (`commandHooks` or `bundling.assetHash` + `copy`). Mongo client created once per container at module scope. Env values read from a local untracked `infra/.env` at synth time (never committed). `MONGO_URI`/`MONGO_DB` point at the same existing Atlas database as local dev — there is no separate prod database.

- [ ] `pnpm --filter infra synth` succeeds in CI-less local run; stack has exactly one function + one URL output.
- [ ] `curl $ApiUrl/health` → `db: ok`.
- [ ] From the phone (dev build/TestFlight) against the Function URL: `/health` ok, 401 without secret, 200 with the secret entered in setup. LLM env vars are wired now (values may be empty until ticket 10).
- [ ] README: deploy steps, how to rotate `AUTH_SECRET` (redeploy + re-enter in app).


**Conventions (fixed in ticket 01, repeated for convenience):** pnpm workspaces `app/`, `api/`, `infra/`, `packages/contracts/`. API error shape `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`. All request/response bodies validated with zod schemas exported from `@contracts`. API tests: vitest, in-process `app.request()` against `createApp(deps)` with in-memory repos + fake LLM + fixed clock. App tests: jest + React Native Testing Library on hooks/logic only. Backend is TDD: failing test first.
