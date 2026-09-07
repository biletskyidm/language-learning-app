import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { apiGet } from '../client'
import { useExpression } from '../use-expression'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const item = {
  id: 'e1',
  userId: 'me',
  expression: 'break the ice',
  type: 'idiom' as const,
  meaning: 'to get a conversation started',
  examples: [],
  tags: [],
  frequency: 'common' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('useExpression', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiGet.mockResolvedValue(item)
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('loads the expression by id', async () => {
    const { result } = await renderHook(() => useExpression('e1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(item)
    expect(mockedApiGet.mock.calls.map(([path]) => path)).toEqual(['/expressions/e1'])
  })

  it('surfaces a missing expression as an error', async () => {
    mockedApiGet.mockRejectedValue(new Error('GET /expressions/gone failed with 404'))

    const { result } = await renderHook(() => useExpression('gone'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
