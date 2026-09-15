import type { Db } from 'mongodb'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SCENARIOS } from '@contracts'
import { MongoScenarioRepository, SEED_INDEX } from '../src/scenarios/mongo-repository'
import { NOW } from './deps'

type Call = { keys: unknown; options: unknown }

const fakeDb = (bulkWrite: () => Promise<unknown>) => {
  const indexes: Call[] = []
  const collection = {
    createIndex: async (keys: unknown, options: unknown) => {
      indexes.push({ keys, options })
      return SEED_INDEX.name
    },
    bulkWrite,
    find: () => ({ sort: () => ({ toArray: async () => [] }) }),
  }

  return { db: { collection: () => collection } as unknown as Db, indexes }
}

describe('seeding the scenario defaults', () => {
  it('backs the upserts with a unique index the user cannot collide with', async () => {
    const writes: unknown[] = []
    const { db, indexes } = fakeDb(async () => {
      writes.push('done')
      return {}
    })

    await new MongoScenarioRepository(db).seedDefaults('me', DEFAULT_SCENARIOS, NOW)

    expect(indexes).toEqual([{ keys: SEED_INDEX.keys, options: { ...SEED_INDEX, unique: true } }])
    expect(writes).toHaveLength(1)
  })

  it('lets a concurrent seeder win the duplicate key', async () => {
    const { db } = fakeDb(async () => {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 })
    })

    await expect(new MongoScenarioRepository(db).seedDefaults('me', DEFAULT_SCENARIOS, NOW)).resolves.toEqual([])
  })

  it('still surfaces a write failure that is not a duplicate key', async () => {
    const { db } = fakeDb(async () => {
      throw Object.assign(new Error('no primary'), { code: 10107 })
    })

    await expect(new MongoScenarioRepository(db).seedDefaults('me', DEFAULT_SCENARIOS, NOW)).rejects.toThrow(
      'no primary',
    )
  })
})
