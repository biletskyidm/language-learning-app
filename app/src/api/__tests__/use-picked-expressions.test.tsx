import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { apiGet } from '../client'
import { usePickedExpressions } from '../use-picked-expressions'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const items = [
  {
    id: 'e1',
    userId: 'me',
    expression: 'break the ice',
    type: 'idiom' as const,
    meaning: 'to get a conversation started',
    examples: [],
    tags: [],
    frequency: 'common' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    score: 6,
    nextTrainingAt: new Date('2026-01-02T00:00:00.000Z'),
  },
]

describe('usePickedExpressions', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiGet.mockResolvedValue({ items })
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('asks the backend what to practice next', async () => {
    const { result } = await renderHook(() => usePickedExpressions(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toEqual(items)
    expect(mockedApiGet.mock.calls.map(([path]) => path)).toEqual(['/expressions/pick'])
  })

  it('surfaces a failed pick', async () => {
    mockedApiGet.mockRejectedValue(new Error('down'))

    const { result } = await renderHook(() => usePickedExpressions(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
