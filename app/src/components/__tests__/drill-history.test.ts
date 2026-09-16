import type { DescribeRound, GapsRound, SmuggleRound, TrainingTarget } from '@contracts'
import { roundVerdictLine } from '../drill-history'

const TARGETS: TrainingTarget[] = [
  { expressionId: 'e1', expression: 'break the ice', meaning: 'to get a conversation started' },
  { expressionId: 'e2', expression: 'touch base', meaning: 'to make brief contact' },
]

const gaps = (verdict?: GapsRound['verdict']): GapsRound => ({
  index: 0,
  targets: TARGETS,
  material: { parts: ['He tried to ', ' before he went to ', ' again.'], bank: ['touch base', 'break the ice'] },
  verdict,
})

const describe_ = (verdict?: DescribeRound['verdict']): DescribeRound => ({
  index: 0,
  targets: TARGETS,
  material: { targetExpressionId: 'e1', expression: 'break the ice' },
  verdict,
})

const smuggle = (verdict?: SmuggleRound['verdict']): SmuggleRound => ({
  index: 0,
  targets: TARGETS,
  material: { targets: TARGETS },
  verdict,
})

describe('roundVerdictLine', () => {
  it('counts the blanks a gaps round got right', () => {
    const round = gaps({
      perBlank: [
        { expected: 'break the ice', given: 'break the ice', correct: true },
        { expected: 'touch base', given: 'break the ice', correct: false },
      ],
    })

    expect(roundVerdictLine({ type: 'gaps', round })).toBe('1 of 2 in the right place')
  })

  it('bands a describe round by the passing score', () => {
    expect(roundVerdictLine({ type: 'describe', round: describe_({ score: 7, feedback: 'Clear.' }) })).toBe(
      '7 / 10 — solid',
    )
    expect(roundVerdictLine({ type: 'describe', round: describe_({ score: 6, feedback: 'Vague.' }) })).toBe(
      '6 / 10 — shaky',
    )
  })

  it('counts the phrases a smuggle round landed', () => {
    const round = smuggle({
      results: [
        { expression: 'break the ice', score: 9, note: 'Natural.' },
        { expression: 'touch base', score: 4, note: 'Forced.' },
      ],
      reply: 'Sounds like a good start.',
    })

    expect(roundVerdictLine({ type: 'smuggle', round })).toBe('1 of 2 landed')
  })

  it.each([
    { type: 'gaps' as const, round: gaps() },
    { type: 'describe' as const, round: describe_() },
    { type: 'smuggle' as const, round: smuggle() },
  ])('leaves an unanswered $type round without a line', (judged) => {
    expect(roundVerdictLine(judged)).toBeUndefined()
  })
})
