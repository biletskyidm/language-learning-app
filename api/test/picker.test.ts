import { describe, expect, it } from 'vitest'
import type { Expression, Frequency } from '@contracts'
import { priorityOf } from '../src/expressions/picker'

const NOW = new Date('2026-03-01T00:00:00.000Z')

const expression = (overrides: Partial<Expression> = {}): Expression => ({
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom',
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
})

describe('priorityOf', () => {
  it('puts a practiced expression that is due first', () => {
    const due = expression({ score: 7, nextTrainingAt: new Date('2026-02-01T00:00:00.000Z') })

    expect(priorityOf(due, NOW)).toBe(1)
  })

  it('treats an expression due exactly now as due', () => {
    expect(priorityOf(expression({ score: 7, nextTrainingAt: NOW }), NOW)).toBe(1)
  })

  it.each([
    ['very_common', 2],
    ['common', 3],
    ['moderate', 4],
    ['uncommon', 5],
    ['formal/academic', 6],
  ] as [Frequency, number][])('ranks an unpracticed %s expression at %i', (frequency, priority) => {
    expect(priorityOf(expression({ frequency }), NOW)).toBe(priority)
  })

  it('excludes a practiced expression that is not due yet', () => {
    const later = expression({ score: 7, nextTrainingAt: new Date('2026-04-01T00:00:00.000Z') })

    expect(priorityOf(later, NOW)).toBe(99)
  })

  it('excludes a practiced expression with no next training date', () => {
    expect(priorityOf(expression({ score: 7 }), NOW)).toBe(99)
  })

  it('counts a zero score as practiced rather than as a new expression', () => {
    const due = expression({ score: 0, frequency: 'very_common', nextTrainingAt: new Date('2026-02-01T00:00:00.000Z') })
    const notDue = expression({ score: 0, frequency: 'very_common', nextTrainingAt: new Date('2026-04-01T00:00:00.000Z') })

    expect(priorityOf(due, NOW)).toBe(1)
    expect(priorityOf(notDue, NOW)).toBe(99)
  })
})
