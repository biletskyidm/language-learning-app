import { beforeEach, describe, expect, it } from 'vitest'
import { migrateExpressions, type MigrationCollection } from '../src/expressions/migration'

type Doc = Record<string, unknown>

/** Understands only the two operators the migration uses: `{ field: { $exists: false } }` and `$set`. */
class FakeCollection implements MigrationCollection {
  constructor(readonly docs: Doc[]) {}

  private matching(filter: Doc) {
    return this.docs.filter((doc) =>
      Object.entries(filter).every(([field, condition]) => {
        const exists = (condition as { $exists: boolean }).$exists
        return exists === (field in doc)
      }),
    )
  }

  async countDocuments(filter: Doc) {
    return this.matching(filter).length
  }

  async updateMany(filter: Doc, update: { $set: Doc }) {
    const hits = this.matching(filter)
    hits.forEach((doc) => Object.assign(doc, update.$set))
    return { modifiedCount: hits.length }
  }
}

const mcpEraDoc = (): Doc => ({ expression: 'break the ice', meaning: 'to start a conversation' })
const goEraDoc = (): Doc => ({ userId: 'someone-else', expression: 'hit the sack', tags: [], examples: [] })

let collection: FakeCollection

describe('migrateExpressions', () => {
  beforeEach(() => {
    collection = new FakeCollection([mcpEraDoc(), goEraDoc()])
  })

  it('stamps the single userId on documents that have none', async () => {
    await migrateExpressions(collection, 'me', { dryRun: false })

    expect(collection.docs.map((d) => d.userId)).toEqual(['me', 'someone-else'])
  })

  it('fills missing tags and examples with empty arrays', async () => {
    await migrateExpressions(collection, 'me', { dryRun: false })

    expect(collection.docs[0]).toMatchObject({ tags: [], examples: [] })
  })

  it('never writes SRS fields, so unpracticed expressions stay unpracticed', async () => {
    await migrateExpressions(collection, 'me', { dryRun: false })

    collection.docs.forEach((doc) => {
      expect(doc).not.toHaveProperty('score')
      expect(doc).not.toHaveProperty('timesPracticed')
      expect(doc).not.toHaveProperty('nextTrainingAt')
    })
  })

  it('reports what it would change without writing anything on a dry run', async () => {
    const before = structuredClone(collection.docs)

    await expect(migrateExpressions(collection, 'me', { dryRun: true })).resolves.toEqual({
      ownership: 1,
      tags: 1,
      examples: 1,
    })
    expect(collection.docs).toEqual(before)
  })

  it('is a no-op when re-run', async () => {
    await migrateExpressions(collection, 'me', { dryRun: false })
    const after = structuredClone(collection.docs)

    await expect(migrateExpressions(collection, 'me', { dryRun: false })).resolves.toEqual({
      ownership: 0,
      tags: 0,
      examples: 0,
    })
    expect(collection.docs).toEqual(after)
  })
})
