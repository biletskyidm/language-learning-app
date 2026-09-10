import { describe, expect, it } from 'vitest'
import { averageScore, nextTrainingAt } from '../src/srs/scheduler'

const NOW = new Date('2026-01-01T00:00:00.000Z')
const DAY_MS = 86_400_000
const daysAfter = (days: number) => new Date(NOW.getTime() + days * DAY_MS)

describe('nextTrainingAt', () => {
  it('sends a phrase that was never practiced to the epoch, so the picker treats it as due', () => {
    expect(nextTrainingAt(0, undefined, 8)).toEqual(new Date(0))
  })

  it.each([
    [1, 1],
    [2, 3],
    [3, 7],
    [4, 14],
    [5, 30],
    [6, 60],
    [7, 120],
  ])('climbs the ladder: practice %i lands %i days out', (timesPracticed, days) => {
    expect(nextTrainingAt(timesPracticed, NOW, 8)).toEqual(daysAfter(days))
  })

  it('brings a phrase scored 3 or less back immediately', () => {
    expect(nextTrainingAt(3, NOW, 3)).toEqual(NOW)
  })

  it('halves the interval for a phrase scored 4 to 6', () => {
    expect(nextTrainingAt(3, NOW, 5)).toEqual(daysAfter(3.5))
  })

  it('keeps the base interval for a phrase scored 7 or 8', () => {
    expect(nextTrainingAt(3, NOW, 7)).toEqual(daysAfter(7))
  })

  it('stretches the interval by half again for a phrase scored 9 or more', () => {
    expect(nextTrainingAt(3, NOW, 9)).toEqual(daysAfter(10.5))
  })
})

describe('averageScore', () => {
  it('takes the new score whole on the first practice', () => {
    expect(averageScore(0, 8, 1)).toBe(8)
  })

  it('folds the new score into the running average', () => {
    expect(averageScore(8, 6, 4)).toBe(7.5)
  })
})
