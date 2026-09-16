import {
  DESCRIBE_PASS_SCORE,
  SMUGGLE_PASS_SCORE,
  type DescribeRound,
  type GapsRound,
  type SmuggleRound,
} from '@contracts'

export type JudgedRound =
  | { type: 'gaps'; round: GapsRound }
  | { type: 'describe'; round: DescribeRound }
  | { type: 'smuggle'; round: SmuggleRound }

/** The one line that says how a round went. A round nobody answered has none. */
export const roundVerdictLine = (judged: JudgedRound): string | undefined => {
  if (judged.type === 'gaps') {
    const perBlank = judged.round.verdict?.perBlank

    return perBlank && `${perBlank.filter(({ correct }) => correct).length} of ${perBlank.length} in the right place`
  }

  if (judged.type === 'describe') {
    const verdict = judged.round.verdict

    return verdict && `${verdict.score} / 10 — ${verdict.score >= DESCRIBE_PASS_SCORE ? 'solid' : 'shaky'}`
  }

  const results = judged.round.verdict?.results

  return results && `${results.filter(({ score }) => score >= SMUGGLE_PASS_SCORE).length} of ${results.length} landed`
}
