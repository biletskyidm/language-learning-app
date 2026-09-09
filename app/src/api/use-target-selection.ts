import { useCallback, useEffect, useState } from 'react'
import type { Expression } from '@contracts'

export const MAX_TARGETS = 20

export type TargetSelection = {
  targets: Expression[]
  remove: (index: number) => void
  add: (expression: Expression) => void
}

const has = (targets: Expression[], expression: Expression) =>
  targets.some((target) => target.id === expression.id)

export const useTargetSelection = (initial: Expression[], vocabulary?: Expression[]): TargetSelection => {
  const [targets, setTargets] = useState(initial)

  useEffect(() => {
    if (!vocabulary) return
    const existing = new Set(vocabulary.map((item) => item.id))
    setTargets((current) =>
      current.every((target) => existing.has(target.id))
        ? current
        : current.filter((target) => existing.has(target.id)),
    )
  }, [vocabulary])

  const remove = useCallback((index: number) => {
    setTargets((current) => {
      if (!current[index] || current.length === 1) return current
      return current.filter((_, i) => i !== index)
    })
  }, [])

  const add = useCallback((expression: Expression) => {
    setTargets((current) => {
      if (current.length >= MAX_TARGETS || has(current, expression)) return current
      return [...current, expression]
    })
  }, [])

  return { targets, remove, add }
}
