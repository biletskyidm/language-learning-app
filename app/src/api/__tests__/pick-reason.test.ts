import type { Expression } from '@contracts'
import { pickReason } from '../pick-reason'

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

describe('pickReason', () => {
  it('calls a practiced expression due, since the picker only returns due ones', () => {
    expect(pickReason(expression({ score: 6 }))).toBe('due')
  })

  it('counts a zero score as practiced', () => {
    expect(pickReason(expression({ score: 0 }))).toBe('due')
  })

  it('names the frequency tier of an unpracticed expression in words', () => {
    expect(pickReason(expression({ frequency: 'very_common' }))).toBe('new · very common')
    expect(pickReason(expression({ frequency: 'formal/academic' }))).toBe('new · formal/academic')
  })
})
