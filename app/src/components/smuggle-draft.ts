import { useState } from 'react'
import { SMUGGLE_MAX_LENGTH, SMUGGLE_MIN_LENGTH, type SmuggleRound } from '@contracts'

export type SmugglePhase = 'idle' | 'writing' | 'judged'

export type SmuggleDraft = {
  phase: SmugglePhase
  message: string
  write: (text: string) => void
  ready: boolean
  /** Keyed by expression, so a chip knows whether its phrase landed. */
  landed: Map<string, boolean>
}

/** Nothing to write until a round arrives; a judged round shows what was sent, not a fresh box. */
export const useSmuggleDraft = (round?: SmuggleRound): SmuggleDraft => {
  const [writing, setWriting] = useState<{ index: number; message: string }>()

  const submitted = round?.answer?.message
  const message = submitted ?? (round && writing?.index === round.index ? writing.message : '')
  const phase: SmugglePhase = !round ? 'idle' : round.verdict ? 'judged' : 'writing'
  const length = message.trim().length

  return {
    phase,
    message,
    write: (text) => {
      if (round && phase === 'writing') setWriting({ index: round.index, message: text })
    },
    ready: length >= SMUGGLE_MIN_LENGTH && length <= SMUGGLE_MAX_LENGTH,
    landed: new Map(round?.verdict?.results.map(({ expression, ok }) => [expression, ok])),
  }
}
