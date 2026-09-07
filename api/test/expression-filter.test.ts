import { describe, expect, it } from 'vitest'
import { listFilter, listPipeline } from '../src/expressions/mongo-repository'

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
