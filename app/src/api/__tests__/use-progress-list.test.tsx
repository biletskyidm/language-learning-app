import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { apiGet } from '../client'
import { useProgressList } from '../use-progress-list'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const lastPath = () => mockedApiGet.mock.calls.at(-1)?.[0]

describe('useProgressList', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiGet.mockResolvedValue({ items: [] })
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('starts weakest first', async () => {
    const { result } = await renderHook(() => useProgressList(), { wrapper })

    await waitFor(() => expect(result.current.expressions.isSuccess).toBe(true))
    expect(result.current.sort).toBe('weakest')
    expect(lastPath()).toBe('/expressions?sort=score&dir=asc')
  })

  it('refetches soonest due first, then most practiced first, as the sort changes', async () => {
    const { result } = await renderHook(() => useProgressList(), { wrapper })
    await waitFor(() => expect(result.current.expressions.isSuccess).toBe(true))

    await act(() => result.current.setSort('due'))
    await waitFor(() => expect(lastPath()).toBe('/expressions?sort=nextTrainingAt&dir=asc'))

    await act(() => result.current.setSort('practiced'))
    await waitFor(() => expect(lastPath()).toBe('/expressions?sort=timesPracticed'))
  })
})
