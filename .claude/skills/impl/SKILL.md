---
name: impl
description: Pick the next unblocked issue from the project issue map, implement it end-to-end (TDD, verify, DoD), then commit, push to issues-<N> and open a PR.
argument-hint: "optional issue number to force, e.g. 07"
disable-model-invocation: true
---

Implement exactly one issue from the project's issue map, start to finish: pick it, build it, verify it, record it, ship it. One issue per run — never spill into the next one, even if it's now unblocked.

## 1. Load context

- Read [PRD.md](../../../PRD.md) for what the product is and the architecture/testing decisions behind it.
- Read [AGENTS.md](../../../AGENTS.md) for the house coding rules (think before coding, simplicity first, surgical changes, goal-driven execution). This skill enforces those; it doesn't restate them.
- Read [.scratch/language-learning-app/issues/MAP.md](../../../.scratch/language-learning-app/issues/MAP.md): the full issue list with checkbox status and blocking edges, and its "Conventions" section (pnpm workspace layout, API error shape, `@contracts` zod validation, test tooling). Every issue is bound by these conventions.

## 2. Pick the task

- If the user passed an issue number as an argument, use that one — fail loudly if it's already checked off or one of its blockers isn't.
- Otherwise scan MAP.md top to bottom and pick the **first** unchecked (`- [ ]`) issue whose every "blocked by" number is already checked (`blocked by: none` is always eligible).
- If nothing is eligible (everything done, or every remaining issue is still blocked), stop and report that — don't guess and don't pick a blocked issue.
- State which issue you picked, its title, and why it's unblocked.

## 3. Read the issue file

- Open the issue's file linked from MAP.md and read it in full: the "What to build" section, any decisions/contracts it fixes, and the checklist at the bottom.
- That checklist is the success criteria for this run (AGENTS.md §4 — goal-driven execution). Don't expand scope beyond what this one file describes.

## 4. Branch

- Check `git status`; if the tree isn't clean, stop and ask rather than risk overwriting in-progress work.
- Bring `main` up to date (`git fetch origin && git checkout main && git pull`), then create `issues-<NN>` from it (`git checkout -b issues-<NN>`, zero-padded to match the issue number in MAP.md). If the branch already exists locally or on origin, check it out instead of recreating it.

## 5. Implement

- Backend code is TDD per MAP.md's conventions: write a failing vitest test first — in-process `app.request()` against `createApp(deps)` with in-memory repos, a fake LLM client and a fixed clock — then make it pass. App code follows the pragmatic rule: Jest + React Native Testing Library on hooks/logic only, screens untested.
- Touch only what this issue requires (AGENTS.md §2–3): no speculative abstractions, no drive-by refactors, no fixing unrelated dead code you notice along the way — mention it to the user instead of touching it.
- Every request/response body validates against a zod schema exported from `@contracts`; every error response follows `{ "error": { "code": "<UPPER_SNAKE>", "message": "..." } }`.

## 6. Verify

- Run the test suite and linter/typechecker for every workspace this issue touched (`pnpm -r test`, `pnpm -r lint`, `pnpm -r typecheck` once those scripts exist — issue 01 is what sets them up, so if it hasn't landed yet, set up and run whatever the issue specifies rather than skipping verification).
- Walk the issue file's checklist item by item and confirm each is actually true — run the literal command it names where it names one (e.g. a `curl` against a local endpoint), don't just infer it from the diff.
- **If the issue changes anything the app renders or sends** — a screen, a hook, `src/api/`, a native dependency — run it on the iOS Simulator before marking it done. Jest mocks every native module, so a green app suite proves the logic and nothing about the app. Do not settle for "not verified on device" and hand that to the user as a caveat; either run it or say plainly why it was impossible.
- If anything fails — a test, the lint/typecheck, a checklist item, or the simulator run — go back to step 5. Never mark the issue done or commit on a red or partial state.

### Running the slice on the simulator

1. `control` with `attach` **first**, before building — it is cheap, opens instantly on a booted simulator, and lets the user watch the rest.
2. Start the API the app will call, in the background on port 8787, against the docker sandbox Mongo and a throwaway `AUTH_SECRET` you generate and keep — never the real `api/.env`, which is unreadable by design. The simulator reaches the Mac's `localhost` directly, so `http://localhost:8787` is the URL to type into the app.
3. If this run added a dependency with an iOS pod (anything `expo-*` native, e.g. `expo-crypto`), `pod install` in `app/ios` first or the module is missing at runtime. Run it as `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install` — bare `pod install` dies with `Encoding::CompatibilityError`. Confirm the pod appears in `Podfile.lock`.
4. `build` against `app/ios/LanguageLearning.xcworkspace`, scheme `LanguageLearning`. Omit `device`: passing a name fails unless a simulator is booted under exactly that name. Poll `build_status` until it reports the `.app` path.
5. The build is Debug, so it loads its JS from Metro rather than a bundle: check `curl -s -o /dev/null -w '%{http_code}' localhost:8081/status` and start `pnpm --filter app exec expo start` in the background only if nothing answers — one is often already running, and a second instance just prompts for a different port. Restart it if this run added a JS dependency it has never resolved.
6. `launch` it, then drive the real user path with `tap` / `text` / `screenshot` — type into the actual fields, press the actual buttons. Exercise the failure path too wherever the issue names one (a wrong secret, an unreachable API), not just the happy path.
7. Screenshot the end state and send it with `SendUserFile` so the user sees the evidence rather than a claim.
8. Tear down: stop the API process and drop the sandbox database. Leave a Metro instance you did not start running.

## 7. Mark complete

- Once every checklist item is genuinely satisfied, edit MAP.md: flip that issue's `- [ ]` to `- [x]`. Leave every other line untouched.

## 8. Commit

- Invoke the `commit` skill on the staged changes (implementation + the MAP.md checkbox flip together).

## 9. Push and open the PR

- Push the branch: `git push -u origin issues-<NN>`.
- Open a PR with `gh pr create` targeting `main`. Title matches the commit's conventional-commit type and subject. Body: a short summary of what was implemented, the issue's DoD checklist reproduced with every box checked, and a reference to the issue file path (`.scratch/language-learning-app/issues/<NN>-....md`) since these issues aren't tracked as GitHub issues.
- Report the PR URL to the user.
