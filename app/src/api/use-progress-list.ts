import { useState } from 'react'
import { DEFAULT_FILTERS, type ExpressionFilters } from './expression-filters'
import { useExpressions } from './use-expressions'

export type ProgressSort = 'weakest' | 'due' | 'practiced'

const SORTS: Record<ProgressSort, Pick<ExpressionFilters, 'sort' | 'dir'>> = {
  weakest: { sort: 'score', dir: 'asc' },
  due: { sort: 'nextTrainingAt', dir: 'asc' },
  practiced: { sort: 'timesPracticed', dir: 'desc' },
}

export const useProgressList = () => {
  const [sort, setSort] = useState<ProgressSort>('weakest')
  const expressions = useExpressions({ ...DEFAULT_FILTERS, ...SORTS[sort] })

  return { sort, setSort, expressions }
}
