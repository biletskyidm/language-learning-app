import { describe, expect, it } from 'vitest'
import { progressSummarySchema } from '../src/progress'

const base = { dueNow: 1, unpracticed: 2, week: [0, 0, 0, 0, 0, 0, 0], weakest: [] }

const full = {
  ...base,
  total: 5,
  active: { count: 0, latest: [] },
  scoreTrend: Array.from({ length: 30 }, (_, i) => (i < 10 ? null : 6.5)),
  chatSkills: {
    sessions: 1,
    averages: {
      contextCorrectness: 7,
      grammarAndSyntax: 6,
      vocabularyDiversity: 5,
      sentenceComplexity: 4,
      sentenceNaturalness: 8,
    },
  },
}

describe('progressSummarySchema', () => {
  it('parses the dashboard fields', () => {
    expect(progressSummarySchema.parse(full)).toEqual(full)
  })

  it('accepts chat skills without averages when no chat was completed', () => {
    expect(progressSummarySchema.safeParse({ ...full, chatSkills: { sessions: 0 } }).success).toBe(true)
  })

  it('rejects a response from before the dashboard fields', () => {
    expect(progressSummarySchema.safeParse(base).success).toBe(false)
  })

  it('rejects a trend that is not 30 days long', () => {
    expect(progressSummarySchema.safeParse({ ...full, scoreTrend: [null] }).success).toBe(false)
  })
})
