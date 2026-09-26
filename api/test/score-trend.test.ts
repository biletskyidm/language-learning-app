import { describe, expect, it } from 'vitest'
import type { ScoredExpression } from '../src/expressions/repository'
import { scoreTrend } from '../src/progress/score-trend'
import type { ScoreEffect } from '../src/trainings/repository'

const at = (day: number, hour = 12) => new Date(Date.UTC(2026, 2, day, hour))
const ends = [at(2, 0), at(3, 0), at(4, 0), at(5, 0)]

const phrase = (id: string, createdAt: Date, score?: number): ScoredExpression => ({ id, createdAt, score })

const effect = (expressionId: string, when: Date, after: number, before?: number): ScoreEffect => ({
  expressionId,
  at: when,
  before: { score: before },
  after: { score: after },
})

describe('scoreTrend', () => {
  it('has one value per day end and leaves days before any score empty', () => {
    const trend = scoreTrend([phrase('e1', at(1), 6)], [effect('e1', at(3), 6)], ends)

    expect(trend).toEqual([null, null, 6, 6])
  })

  it("applies an effect's score from its own day on", () => {
    const trend = scoreTrend([phrase('e1', at(1), 8)], [effect('e1', at(2), 4, 3), effect('e1', at(4), 8, 4)], ends)

    expect(trend).toEqual([3, 4, 4, 8])
  })

  it("uses the first effect's before score for days ahead of it", () => {
    const trend = scoreTrend(
      [phrase('e1', at(1), 9), phrase('e2', at(1), 5)],
      [effect('e1', at(3), 9, 3)],
      ends,
    )

    expect(trend).toEqual([4, 4, 7, 7])
  })

  it('counts a scored phrase with no effects on every day since its creation', () => {
    const trend = scoreTrend([phrase('mcp', at(2, 6), 7), phrase('old', at(1), 3)], [], ends)

    expect(trend).toEqual([3, 5, 5, 5])
  })

  it('leaves out never-scored phrases', () => {
    const trend = scoreTrend([phrase('fresh', at(1)), phrase('first', at(1), 5)], [effect('first', at(3), 5)], ends)

    expect(trend).toEqual([null, null, 5, 5])
  })
})
