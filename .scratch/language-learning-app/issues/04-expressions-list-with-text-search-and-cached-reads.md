# 04: Expressions list with text search and cached reads

**What to build:** Vocabulary tab lists all expressions (newest first) with a search box matching expression text or meaning, case-insensitive. Rows show expression, type, frequency, and the trained counter placeholder (`timesPracticed`, finalized visually in 06). List is cached by TanStack Query so reopening is instant. **The list must show every record already in the Atlas `expressions` collection**, which requires the one-time migration below. PRD stories 5, 13.

**Expression schema (keep existing Atlas shape; contracts `ExpressionSchema`):**
```ts
{ id: string, userId: string, expression: string,
  type: 'word'|'phrase'|'idiom'|'sentence'|'collocation'|'phrasal_verb',
  partOfSpeech?: 'noun'|'verb'|'adjective'|'adverb',
  meaning: string, examples: string[], tags: string[],
  frequency: 'very_common'|'common'|'moderate'|'uncommon'|'formal/academic',
  createdAt: Date, score?: number, timesPracticed?: number,
  lastTimePracticedAt?: Date, nextTrainingAt?: Date }
```
Note: in Atlas, unpracticed docs have NO `score` field (the picker relies on that — ticket 11). Mapper must preserve absence, not write `score: 0`.

**Repository interface (decision):**
```ts
interface ExpressionRepository {
  list(userId, q: { search?, tag?, frequency?, due?: boolean, sort?: 'createdAt'|'score'|'nextTrainingAt'|'timesPracticed', dir?: 'asc'|'desc' }): Promise<Expression[]>
  getById(userId, id): Promise<Expression|null>
  create(userId, input): Promise<Expression>
  update(userId, id, patch): Promise<Expression|null>
  delete(userId, id): Promise<boolean>
  pick(userId, limit): Promise<Expression[]>                     // ticket 11
  applySrs(userId, id, fields: SrsFields): Promise<Expression|null> // ticket 16
}
```
Two implementations: `MemoryExpressionRepository` (tests) and `MongoExpressionRepository`. Mapper `toDomain(doc)` / `toDoc(expr)` converts `_id: ObjectId` ↔ `id: string`.

**Old Mongo filter to port (Go):**
```go
f := bson.M{"userId": userID}
if search != "" { f["$or"] = [ {expression: {$regex: search, $options: "i"}}, {meaning: {$regex: ...}} ] }
```
Escape regex metacharacters in `search`.

**API:** `GET /expressions?search=` → `200 { items: Expression[] }`.

**Existing data reality (verified in the old repo):**
- MCP-era docs (`mcp/server-factory.mjs`) were inserted with `{ expression, type, partOfSpeech?, meaning, examples, tags: [], frequency, createdAt }` and **no `userId`**. `type` enum was only `word|phrase|sentence` then. SRS fields appear only after practice, written by `updateExpressionProgress` as `score, timesPracticed, lastTimePracticedAt, nextTrainingAt`.
- Go-era docs add `userId` and the wider `type` enum. Both shapes coexist in the same collection.

**One-time migration (decision):** `pnpm --filter api migrate` runs idempotent steps against `MONGO_URI/MONGO_DB` with `--dry-run` printing counts first:
```js
// 1. ownership: every doc without userId belongs to the single user
db.expressions.updateMany({ userId: { $exists: false } }, { $set: { userId: USER_ID } })
// 2. shape defaults so zod parsing never fails on old docs
db.expressions.updateMany({ tags: { $exists: false } }, { $set: { tags: [] } })
db.expressions.updateMany({ examples: { $exists: false } }, { $set: { examples: [] } })
// 3. never touch score/timesPracticed/nextTrainingAt — absence of `score` is meaningful for the picker
```
Migration is a script under `api/scripts/`, logged, safe to re-run, and it is the ONLY place `updateMany` without a userId filter is allowed. Run it once before the first real use; the deploy ticket's checklist references it.

**Mapper tolerance:** `toDomain` must accept missing `partOfSpeech`, missing `tags`/`examples` (→ `[]`), and any legacy `type` value in the current enum. Unknown extra fields are ignored, not dropped on write (`update` uses `$set` of changed fields only, never a full document replace — Go did `$set` too).

**Optional sandbox clone:** `pnpm --filter api db:clone` copies the Atlas `expressions` collection into the docker Mongo for isolated experiments. Not required for development.

- [ ] api tests: list returns only the caller's userId docs; search matches expression or meaning case-insensitively; regex metachar in search does not throw.
- [ ] mapper tests: round-trip keeps `score` absent when absent; ObjectId ↔ string.
- [ ] app: `useExpressions(search)` hook test (mocked client); list screen renders rows; typing in search refetches with 300ms debounce.
- [ ] migration script tests (memory repo / mongodb-memory-server): docs without userId get stamped; docs with userId untouched; `score` never added; re-run is a no-op.
- [ ] mapper tests: MCP-era doc (no tags, no partOfSpeech, type `phrase`) parses; Go-era doc parses.
- [ ] Manual: run `migrate --dry-run` then `migrate` against Atlas, open app, see ALL existing expressions; search narrows.
