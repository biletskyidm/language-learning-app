import { useState } from 'react'
import type { GapsRound } from '@contracts'

export type GapsPhase = 'idle' | 'playing' | 'checked'

export type GapsBoard = {
  phase: GapsPhase
  /** One entry per blank, in the order the blanks appear. */
  fills: (string | null)[]
  place: (phrase: string) => void
  clear: (blank: number) => void
  placed: (phrase: string) => boolean
  ready: boolean
}

const empty = (blanks: number) => new Array<string | null>(blanks).fill(null)

/** Nothing to play until a round arrives; a checked round shows what was submitted, not a fresh board. */
export const useGapsBoard = (round?: GapsRound): GapsBoard => {
  const [placing, setPlacing] = useState<{ index: number; fills: (string | null)[] }>()

  const blanks = round ? round.material.parts.length - 1 : 0
  const submitted = round?.answer?.fills
  const fills = submitted ?? (round && placing?.index === round.index ? placing.fills : empty(blanks))

  const phase: GapsPhase = !round ? 'idle' : round.verdict ? 'checked' : 'playing'

  const write = (next: (string | null)[]) => {
    if (round && phase === 'playing') setPlacing({ index: round.index, fills: next })
  }

  return {
    phase,
    fills,
    place: (phrase) => {
      const blank = fills.indexOf(null)
      if (blank === -1) return

      write(fills.map((current, at) => (at === blank ? phrase : current)))
    },
    clear: (blank) => write(fills.map((current, at) => (at === blank ? null : current))),
    placed: (phrase) => fills.includes(phrase),
    ready: blanks > 0 && fills.every((fill) => fill !== null),
  }
}
