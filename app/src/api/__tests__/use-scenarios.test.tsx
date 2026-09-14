import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import type { Scenario } from '@contracts'
import { apiDelete, apiGet, apiPatch, apiPost } from '../client'
import {
  useCreateScenario,
  useDeleteScenario,
  useScenarios,
  useUpdateScenario,
} from '../use-scenarios'

jest.mock('../client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
  apiDelete: jest.fn(),
}))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>
const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>
const mockedApiPatch = apiPatch as jest.MockedFunction<typeof apiPatch>
const mockedApiDelete = apiDelete as jest.MockedFunction<typeof apiDelete>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const scenario: Scenario = {
  id: 's1',
  userId: 'me',
  name: 'Scrum standup',
  context: 'a standup',
  style: 'informal',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

describe('scenario hooks', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiPost.mockReset()
    mockedApiPatch.mockReset()
    mockedApiDelete.mockReset()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
    })
  })

  afterEach(() => queryClient.clear())

  it('reads the saved scenarios', async () => {
    mockedApiGet.mockResolvedValue({ items: [scenario] })

    const { result } = await renderHook(() => useScenarios(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.items).toEqual([scenario])
    expect(mockedApiGet).toHaveBeenCalledWith('/scenarios', expect.anything())
  })

  it('creates a scenario and re-reads the list', async () => {
    mockedApiGet.mockResolvedValue({ items: [scenario] })
    mockedApiPost.mockResolvedValue(scenario)
    await renderHook(() => useScenarios(), { wrapper })
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalled())

    const { result } = await renderHook(() => useCreateScenario(), { wrapper })
    await act(async () => {
      result.current.mutate({ name: 'Doctor', context: 'at the doctor', style: 'formal' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPost).toHaveBeenCalledWith(
      '/scenarios',
      { name: 'Doctor', context: 'at the doctor', style: 'formal' },
      expect.anything(),
    )
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(2))
  })

  it('patches only the fields it was given', async () => {
    mockedApiPatch.mockResolvedValue({ ...scenario, name: 'Renamed' })

    const { result } = await renderHook(() => useUpdateScenario(), { wrapper })
    await act(async () => {
      result.current.mutate({ id: 's1', name: 'Renamed' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPatch).toHaveBeenCalledWith('/scenarios/s1', { name: 'Renamed' }, expect.anything())
  })

  it('deletes a scenario and re-reads the list', async () => {
    mockedApiGet.mockResolvedValue({ items: [scenario] })
    mockedApiDelete.mockResolvedValue(undefined)
    await renderHook(() => useScenarios(), { wrapper })
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalled())

    const { result } = await renderHook(() => useDeleteScenario(), { wrapper })
    await act(async () => {
      result.current.mutate('s1')
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiDelete).toHaveBeenCalledWith('/scenarios/s1')
    await waitFor(() => expect(mockedApiGet).toHaveBeenCalledTimes(2))
  })
})
