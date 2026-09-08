import { describe, expect, it } from 'vitest'
import { ObjectId } from 'mongodb'
import { idFilter, listFilter, listPipeline, pickPipeline, updateOperations } from '../src/expressions/mongo-repository'

const NOW = new Date('2026-03-01T00:00:00.000Z')

const query = (overrides: Parameters<typeof listFilter>[1] | object = {}) =>
  ({ sort: 'createdAt', dir: 'desc', due: false, now: NOW, ...overrides }) as Parameters<typeof listFilter>[1]

describe('listFilter', () => {
  it('scopes every query to the caller', () => {
    expect(listFilter('me', query())).toEqual({ userId: 'me' })
  })

  it('matches the expression or the meaning case-insensitively', () => {
    expect(listFilter('me', query({ search: 'ice' }))).toEqual({
      userId: 'me',
      $or: [
        { expression: { $regex: 'ice', $options: 'i' } },
        { meaning: { $regex: 'ice', $options: 'i' } },
      ],
    })
  })

  it('escapes regex metacharacters so a search stays a literal substring', () => {
    const filter = listFilter('me', query({ search: 'a.b*c(' }))
    const pattern = filter.$or?.[0]?.expression.$regex ?? ''

    expect(() => new RegExp(pattern)).not.toThrow()
    expect(new RegExp(pattern).test('xa.b*c(y')).toBe(true)
    expect(new RegExp(pattern).test('axbxcx')).toBe(false)
  })

  it('ignores a blank search', () => {
    expect(listFilter('me', query({ search: '   ' }))).toEqual({ userId: 'me' })
  })

  it('matches a tag against the tags array and an exact frequency', () => {
    expect(listFilter('me', query({ tag: 'work', frequency: 'common' }))).toEqual({
      userId: 'me',
      tags: 'work',
      frequency: 'common',
    })
  })

  it('turns the due flag into a next-training cutoff at the injected time', () => {
    expect(listFilter('me', query({ due: true }))).toEqual({ userId: 'me', nextTrainingAt: { $lte: NOW } })
  })
})

describe('listPipeline', () => {
  const sortStage = (stages: ReturnType<typeof listPipeline>) =>
    stages.find((stage) => '$sort' in stage)?.$sort

  it('sorts by creation date without a null-last pass', () => {
    const stages = listPipeline('me', query({ sort: 'createdAt', dir: 'desc' }))

    expect(stages.some((stage) => '$addFields' in stage)).toBe(false)
    expect(sortStage(stages)).toEqual({ createdAt: -1, _id: 1 })
  })

  it('ranks missing scores last whatever the direction', () => {
    for (const dir of ['asc', 'desc'] as const) {
      const stages = listPipeline('me', query({ sort: 'score', dir }))

      expect(sortStage(stages)).toEqual({ _missing: 1, score: dir === 'asc' ? 1 : -1, _id: 1 })
    }
  })

  it('ranks unscheduled expressions last when sorting by next due date', () => {
    expect(sortStage(listPipeline('me', query({ sort: 'nextTrainingAt', dir: 'asc' })))).toEqual({
      _missing: 1,
      nextTrainingAt: 1,
      _id: 1,
    })
  })

  it('counts a never-practiced expression as zero times practiced', () => {
    const stages = listPipeline('me', query({ sort: 'timesPracticed', dir: 'desc' }))

    expect(stages).toContainEqual({ $addFields: { _sortKey: { $ifNull: ['$timesPracticed', 0] } } })
    expect(sortStage(stages)).toEqual({ _sortKey: -1, _id: 1 })
  })
})

describe('idFilter', () => {
  it('scopes the lookup to the caller and the object id', () => {
    expect(idFilter('me', '65a1b2c3d4e5f60718293a4b')).toEqual({
      userId: 'me',
      _id: new ObjectId('65a1b2c3d4e5f60718293a4b'),
    })
  })

  it('refuses a malformed id so it never reaches the driver', () => {
    expect(idFilter('me', 'not-an-object-id')).toBeUndefined()
  })
})

describe('updateOperations', () => {
  it('sets only the fields the patch names', () => {
    expect(updateOperations({ meaning: 'to get things going', tags: ['work'] })).toEqual({
      $set: { meaning: 'to get things going', tags: ['work'] },
    })
  })

  it('unsets a field the patch clears with a null', () => {
    expect(updateOperations({ partOfSpeech: null })).toEqual({ $unset: { partOfSpeech: '' } })
  })

  it('combines a set and an unset', () => {
    expect(updateOperations({ expression: 'break the ice', partOfSpeech: null })).toEqual({
      $set: { expression: 'break the ice' },
      $unset: { partOfSpeech: '' },
    })
  })

  it('has nothing to write for an empty patch, which Mongo would reject', () => {
    expect(updateOperations({})).toBeUndefined()
  })
})

describe('pickPipeline', () => {
  const pipeline = pickPipeline('me', { limit: 5, now: NOW })
  const stage = (key: string) => pipeline.find((s) => key in s)?.[key]

  it('matches only the caller’s due or unpracticed expressions', () => {
    expect(stage('$match')).toEqual({
      userId: 'me',
      $or: [
        { score: { $exists: true }, nextTrainingAt: { $lte: NOW } },
        { score: { $exists: false }, frequency: 'very_common' },
        { score: { $exists: false }, frequency: 'common' },
        { score: { $exists: false }, frequency: 'moderate' },
        { score: { $exists: false }, frequency: 'uncommon' },
        { score: { $exists: false }, frequency: 'formal/academic' },
      ],
    })
  })

  it('ranks a due expression by score presence, so a zero score is not mistaken for a new one', () => {
    const [due] = stage('$addFields')._priority.$switch.branches

    expect(due).toEqual({
      case: { $and: [{ $ne: [{ $type: '$score' }, 'missing'] }, { $lte: ['$nextTrainingAt', NOW] }] },
      then: 1,
    })
  })

  it('ranks the unpracticed tiers from very common down to formal/academic', () => {
    const tiers = stage('$addFields')._priority.$switch.branches.slice(1)

    expect(tiers.map((b: { case: { $eq: string[] }; then: number }) => [b.case.$eq[1], b.then])).toEqual([
      ['very_common', 2],
      ['common', 3],
      ['moderate', 4],
      ['uncommon', 5],
      ['formal/academic', 6],
    ])
  })

  it('sorts by priority with deterministic tie-breakers and applies the limit', () => {
    expect(stage('$sort')).toEqual({ _priority: 1, nextTrainingAt: 1, createdAt: 1, _id: 1 })
    expect(stage('$limit')).toBe(5)
    expect(stage('$unset')).toBe('_priority')
  })
})
