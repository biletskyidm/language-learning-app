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
- If anything fails — a test, the lint/typecheck, or a checklist item — go back to step 5. Never mark the issue done or commit on a red or partial state.

## 7. Mark complete

- Once every checklist item is genuinely satisfied, edit MAP.md: flip that issue's `- [ ]` to `- [x]`. Leave every other line untouched.

## 8. Commit

- Invoke the `commit` skill on the staged changes (implementation + the MAP.md checkbox flip together).

## 9. Push and open the PR

- Push the branch: `git push -u origin issues-<NN>`.
- Open a PR with `gh pr create` targeting `main`. Title matches the commit's conventional-commit type and subject. Body: a short summary of what was implemented, the issue's DoD checklist reproduced with every box checked, and a reference to the issue file path (`.scratch/language-learning-app/issues/<NN>-....md`) since these issues aren't tracked as GitHub issues.
- Report the PR URL to the user.
