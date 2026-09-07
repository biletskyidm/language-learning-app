export interface MigrationCollection {
  countDocuments(filter: Record<string, unknown>): Promise<number>
  updateMany(
    filter: Record<string, unknown>,
    update: { $set: Record<string, unknown> },
  ): Promise<{ modifiedCount: number }>
}

export interface MigrationReport {
  ownership: number
  tags: number
  examples: number
}

const MISSING = { $exists: false }

/**
 * One-time, idempotent adoption of the pre-existing collection. The only place in the codebase that
 * writes without a userId filter — the docs it touches have no owner yet. SRS fields are never
 * written: an absent `score` means "never practiced" and the picker depends on it.
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

  return {
    ownership: await step({ userId: MISSING }, { userId }),
    tags: await step({ tags: MISSING }, { tags: [] }),
    examples: await step({ examples: MISSING }, { examples: [] }),
  }
}
