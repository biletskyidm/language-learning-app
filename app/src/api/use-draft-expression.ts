import { useMutation } from '@tanstack/react-query'
import { expressionDraftSchema } from '@contracts'
import { apiPost } from './client'

export const useDraftExpression = () =>
  useMutation({
    mutationFn: (text: string) => apiPost('/expressions/from-text', { text }, expressionDraftSchema),
  })
