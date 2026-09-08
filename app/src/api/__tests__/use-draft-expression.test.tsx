import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { ExpressionDraft } from '@contracts'
import { apiPost } from '../client'
import { useDraftExpression } from '../use-draft-expression'

jest.mock('../client', () => ({ apiPost: jest.fn() }))

const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>

const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } })

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const drafted: ExpressionDraft = {
  type: 'idiom',
  meaning: 'to do something in the easiest, cheapest way',
  examples: ['They cut corners to ship on time.'],
  tags: ['work'],
  frequency: 'common',
}

describe('useDraftExpression', () => {
  beforeEach(() => mockedApiPost.mockReset())

  it('asks the API to draft the typed text and hands the draft back', async () => {
    mockedApiPost.mockResolvedValue(drafted)

    const { result } = await renderHook(() => useDraftExpression(), { wrapper })
    await act(async () => {
      result.current.mutate('cut corners')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith('/expressions/from-text', { text: 'cut corners' }, expect.anything())
    expect(result.current.data).toEqual(drafted)
  })
})
