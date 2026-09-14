export interface MigrationDoc {
  _id: unknown
  expression: string
  timesPracticed?: number
  createdAt?: Date
}

export interface MigrationCollection {
  countDocuments(filter: Record<string, unknown>): Promise<number>
  updateMany(
    filter: Record<string, unknown>,
    update: { $set: Record<string, unknown> },
  ): Promise<{ modifiedCount: number }>
  find(filter: Record<string, unknown>): { toArray(): Promise<MigrationDoc[]> }
  deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }>
  createIndex(
    keys: Record<string, 1 | -1>,
    options: { unique: boolean; name: string; collation: { locale: string; strength: number } },
  ): Promise<string>
}

export interface MigrationReport {
  ownership: number
  tags: number
  examples: number
  duplicates: number
}

const MISSING = { $exists: false }

/** Matches the unique index below, so the guard and the index disagree about nothing. */
export const DUPLICATE_INDEX = {
  name: 'userId_expression_unique',
  keys: { userId: 1, expression: 1 } as const,
  collation: { locale: 'en', strength: 2 },
}

/** The copy worth keeping is the one the SRS knows most about, and the oldest of those. */
const survivor = (docs: MigrationDoc[]) =>
  [...docs].sort(
    (a, b) =>
      (b.timesPracticed ?? 0) - (a.timesPracticed ?? 0) ||
      (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
  )[0]

const duplicateIds = (docs: MigrationDoc[]) => {
  const byText = new Map<string, MigrationDoc[]>()
  for (const doc of docs) {
    const key = doc.expression.trim().toLowerCase()
    byText.set(key, [...(byText.get(key) ?? []), doc])
  }

  return [...byText.values()]
    .filter((group) => group.length > 1)
    .flatMap((group) => group.filter((doc) => doc !== survivor(group)).map(({ _id }) => _id))
}

/**
 * One-time, idempotent adoption of the pre-existing collection. The only place in the codebase that
 * writes without a userId filter — the docs it touches have no owner yet. SRS fields are never
 * written: an absent `score` means "never practiced" and the picker depends on it.
 *
 * Duplicates are dropped before the unique index is built, because the imported collection predates
 * both the index and the API's own duplicate check, and createIndex refuses a collection that
 * already violates it.
 */
export const migrateExpressions = async (
  collection: MigrationCollection,
  userId: string,
  { dryRun }: { dryRun: boolean },
): Promise<MigrationReport> => {
  const step = async (filter: Record<string, unknown>, set: Record<string, unknown>) =>
    dryRun
      ? collection.countDocuments(filter)
      : (await collection.updateMany(filter, { $set: set })).modifiedCount

  const report = {
    ownership: await step({ userId: MISSING }, { userId }),
    tags: await step({ tags: MISSING }, { tags: [] }),
    examples: await step({ examples: MISSING }, { examples: [] }),
  }

  const ids = duplicateIds(await collection.find({ userId }).toArray())
  if (!dryRun && ids.length) await collection.deleteMany({ _id: { $in: ids } })
  if (!dryRun) await collection.createIndex(DUPLICATE_INDEX.keys, { ...DUPLICATE_INDEX, unique: true })

  return { ...report, duplicates: ids.length }
}
