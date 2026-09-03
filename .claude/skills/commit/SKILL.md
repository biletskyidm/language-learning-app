---
name: commit
description: Commit current changes with a one-line conventional commit message.
argument-hint: "optional hint for the message"
disable-model-invocation: true
---

Commit the working tree with a **conventional commit** message.

1. Run `git status` and `git diff` (staged + unstaged). If the index already has staged changes, commit only those; otherwise stage everything with `git add -A`.
2. Write the message in the form `type(scope): subject`:
   - `type`: one of `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `style`, `build`, `ci`, `chore`, `revert`. Pick by the dominant change in the diff.
   - `scope`: optional, the touched module/area (`auth`, `deps`, `api`). Omit when the change is cross-cutting.
   - `subject`: one sentence, imperative mood, lowercase, no trailing period, ≤72 chars total. Says what changed, not how.
3. If the user passed arguments, treat them as a hint for the subject.
4. Commit with `git commit -m "<message>"`. Body only when the diff needs a why that the subject cannot carry. The message contains no trailers: no `Co-Authored-By`, no `Generated with` line.
5. Print the resulting `git log -1 --oneline`.

Examples:

```
feat(auth): add refresh token rotation
fix(api): return 404 for unknown expression id
refactor(picker): extract due-first sort into helper
docs: describe smart picker aggregation
build(deps): bump mongoose to 8.6
ci: cache node_modules between jobs
chore: remove unused issue templates
```
