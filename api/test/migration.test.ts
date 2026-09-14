import { beforeEach, describe, expect, it } from 'vitest'
import {
  DUPLICATE_INDEX,
  migrateExpressions,
  type MigrationCollection,
  type MigrationDoc,
} from '../src/expressions/migration'

type Doc = Record<string, unknown>

/** Understands only what the migration asks of it: `{ $exists }`, `{ userId }`, `$set` and `{ _id: { $in } }`. */
class FakeCollection implements MigrationCollection {
  readonly indexes: string[] = []

  constructor(readonly docs: Doc[]) {}

  private matching(filter: Doc) {
    return this.docs.filter((doc) =>
      Object.entries(filter).every(([field, condition]) => {
        const exists = (condition as { $exists?: boolean }).$exists
        return exists === undefined ? doc[field] === condition : exists === (field in doc)
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

  find(filter: Doc) {
    return { toArray: async () => this.matching(filter) as unknown as MigrationDoc[] }
  }

  async deleteMany(filter: { _id: { $in: unknown[] } }) {
    const doomed = new Set(filter._id.$in)
    const kept = this.docs.filter((doc) => !doomed.has(doc._id))
    const deletedCount = this.docs.length - kept.length
    this.docs.splice(0, this.docs.length, ...kept)
    return { deletedCount }
  }

  async createIndex(_keys: Record<string, 1 | -1>, options: { name: string }) {
    this.indexes.push(options.name)
    return options.name
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
      duplicates: 0,
    })
    expect(collection.docs).toEqual(before)
  })

  it('keeps the practiced copy of a duplicate and drops the rest', async () => {
    const practiced = { _id: 'old', userId: 'me', expression: 'not to mention', timesPracticed: 6 }
    const fresh = { _id: 'new', userId: 'me', expression: 'Not to mention' }
    collection = new FakeCollection([fresh, practiced])

    await expect(migrateExpressions(collection, 'me', { dryRun: false })).resolves.toMatchObject({ duplicates: 1 })
    expect(collection.docs).toEqual([practiced])
  })

  it('keeps the oldest when no copy of a duplicate was ever practiced', async () => {
    const older = { _id: 'a', userId: 'me', expression: 'by nature', createdAt: new Date('2025-08-16') }
    const newer = { _id: 'b', userId: 'me', expression: 'by nature', createdAt: new Date('2026-01-23') }
    collection = new FakeCollection([newer, older])

    await migrateExpressions(collection, 'me', { dryRun: false })

    expect(collection.docs).toEqual([older])
  })

  it('leaves another owner\u2019s duplicates alone', async () => {
    const mine = { _id: 'a', userId: 'me', expression: 'by nature' }
    const theirs = [
      { _id: 'b', userId: 'someone-else', expression: 'hit the sack' },
      { _id: 'c', userId: 'someone-else', expression: 'hit the sack' },
    ]
    collection = new FakeCollection([mine, ...theirs])

    await expect(migrateExpressions(collection, 'me', { dryRun: false })).resolves.toMatchObject({ duplicates: 0 })
    expect(collection.docs).toHaveLength(3)
  })

  it('builds the unique index that stops the next duplicate', async () => {
    await migrateExpressions(collection, 'me', { dryRun: false })

    expect(collection.indexes).toEqual([DUPLICATE_INDEX.name])
  })

  it('counts duplicates without deleting or indexing on a dry run', async () => {
    collection = new FakeCollection([
      { _id: 'a', userId: 'me', expression: 'by nature' },
      { _id: 'b', userId: 'me', expression: 'by nature' },
    ])

    await expect(migrateExpressions(collection, 'me', { dryRun: true })).resolves.toMatchObject({ duplicates: 1 })
    expect(collection.docs).toHaveLength(2)
    expect(collection.indexes).toEqual([])
  })

  it('is a no-op when re-run', async () => {
    await migrateExpressions(collection, 'me', { dryRun: false })
    const after = structuredClone(collection.docs)

    await expect(migrateExpressions(collection, 'me', { dryRun: false })).resolves.toEqual({
      ownership: 0,
      tags: 0,
      examples: 0,
      duplicates: 0,
    })
    expect(collection.docs).toEqual(after)
  })
})
