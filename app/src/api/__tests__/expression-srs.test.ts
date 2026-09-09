import type { Expression } from '@contracts'
import { relativeDays, shortDate, srsSummary } from '../expression-srs'

const now = new Date('2026-02-01T12:00:00.000Z')

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

describe('srsSummary', () => {
  it('names the frequency tier of an unpracticed expression in words', () => {
    expect(srsSummary(expression({ frequency: 'very_common' }), now)).toBe('New · very common')
    expect(srsSummary(expression({ frequency: 'formal/academic' }), now)).toBe('New · formal/academic')
  })

  it('shows score, times trained and the due date of a practiced expression', () => {
    const summary = srsSummary(
      expression({ score: 7.25, timesPracticed: 3, nextTrainingAt: new Date('2026-02-06T12:00:00.000Z') }),
      now,
    )

    expect(summary).toBe('Score 7.3 · Trained 3× · Due Feb 6')
  })

  it('dates a past due day like any other', () => {
    const summary = srsSummary(
      expression({ score: 4, timesPracticed: 2, nextTrainingAt: new Date('2026-01-20T12:00:00.000Z') }),
      now,
    )

    expect(summary).toBe('Score 4.0 · Trained 2× · Due Jan 20')
  })

  it('counts a zero score as practiced', () => {
    expect(srsSummary(expression({ score: 0 }), now)).toBe('Score 0.0 · Trained 0×')
  })
})

describe('shortDate', () => {
  it('leaves the current year out and keeps another one', () => {
    expect(shortDate(new Date('2026-08-24T00:00:00.000Z'), now)).toBe('Aug 24')
    expect(shortDate(new Date('2027-08-24T00:00:00.000Z'), now)).toBe('Aug 24, 2027')
  })
})

describe('relativeDays', () => {
  it('words the days around today', () => {
    expect(relativeDays(new Date('2026-02-01T18:00:00.000Z'), now)).toBe('today')
    expect(relativeDays(new Date('2026-02-02T12:00:00.000Z'), now)).toBe('tomorrow')
    expect(relativeDays(new Date('2026-01-31T12:00:00.000Z'), now)).toBe('yesterday')
    expect(relativeDays(new Date('2026-01-25T12:00:00.000Z'), now)).toBe('7 days ago')
  })
})
