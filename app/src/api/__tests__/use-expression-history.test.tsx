import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import type { ExpressionHistoryResponse } from '@contracts'
import { apiGet } from '../client'
import { useExpressionHistory } from '../use-expression-history'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const history: ExpressionHistoryResponse = {
  items: [
    {
      trainingId: 't2',
      type: 'gaps',
      status: 'COMPLETED',
      scoreWritten: 8,
      before: { score: 6, timesPracticed: 2, nextTrainingAt: new Date('2026-01-01T00:00:00.000Z') },
      after: { score: 7, timesPracticed: 3, nextTrainingAt: new Date('2026-01-08T00:00:00.000Z') },
      at: new Date('2026-01-03T00:00:00.000Z'),
    },
  ],
}

describe('useExpressionHistory', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiGet.mockResolvedValue(history)
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('loads the SRS writes for that expression', async () => {
    const { result } = await renderHook(() => useExpressionHistory('e1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(history)
    expect(mockedApiGet.mock.calls.map(([path]) => path)).toEqual(['/expressions/e1/history'])
  })

  it('asks for nothing until it has an id', async () => {
    const { result } = await renderHook(() => useExpressionHistory(undefined), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockedApiGet).not.toHaveBeenCalled()
  })
})
