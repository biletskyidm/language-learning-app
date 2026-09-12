import { useState } from 'react'
import { DESCRIBE_MAX_LENGTH, DESCRIBE_MIN_LENGTH, type DescribeRound } from '@contracts'

export type DescribePhase = 'idle' | 'writing' | 'judged'

export type DescribeDraft = {
  phase: DescribePhase
  description: string
  write: (text: string) => void
  ready: boolean
}

/** Nothing to write until a round arrives; a judged round shows what was submitted, not a fresh box. */
export const useDescribeDraft = (round?: DescribeRound): DescribeDraft => {
  const [writing, setWriting] = useState<{ index: number; description: string }>()

  const submitted = round?.answer?.description
  const description = submitted ?? (round && writing?.index === round.index ? writing.description : '')
  const phase: DescribePhase = !round ? 'idle' : round.verdict ? 'judged' : 'writing'
  const length = description.trim().length

  return {
    phase,
    description,
    write: (text) => {
      if (round && phase === 'writing') setWriting({ index: round.index, description: text })
    },
    ready: length >= DESCRIBE_MIN_LENGTH && length <= DESCRIBE_MAX_LENGTH,
  }
}
