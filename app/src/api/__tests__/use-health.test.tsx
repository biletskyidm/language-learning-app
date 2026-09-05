import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react-native'
import { apiGet } from '../client'
import { useHealth } from '../use-health'

jest.mock('../client', () => ({ apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useHealth', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  })

  afterEach(() => queryClient.clear())

  it('exposes a healthy API as status ok', async () => {
    mockedApiGet.mockResolvedValue({ status: 'ok', db: 'ok' })

    const { result } = await renderHook(() => useHealth(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ status: 'ok', db: 'ok' })
  })

  it('surfaces an unreachable API as an error', async () => {
    mockedApiGet.mockRejectedValue(new Error('offline'))

    const { result } = await renderHook(() => useHealth(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
