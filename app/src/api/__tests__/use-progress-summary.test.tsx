import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { apiGet } from '../client'
import { useProgressSummary } from '../use-progress-summary'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useProgressSummary', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it("loads the counts and the week in the device's timezone", async () => {
    const week = [1, 2, 0, 0, 0, 0, 0]
    mockedApiGet.mockResolvedValue({ dueNow: 3, unpracticed: 12, week })

    const { result } = await renderHook(() => useProgressSummary(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiGet.mock.calls.map(([path]) => path)).toEqual([
      `/progress/summary?tzOffset=${new Date().getTimezoneOffset()}`,
    ])
    expect(result.current.data).toEqual({ dueNow: 3, unpracticed: 12, week })
  })

  it('waits until it is enabled', async () => {
    const { result } = await renderHook(() => useProgressSummary(false), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(mockedApiGet).not.toHaveBeenCalled()
  })
})
