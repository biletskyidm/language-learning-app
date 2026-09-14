import React, { type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { DEFAULT_SETTINGS, type Settings } from '@contracts'
import { apiGet, apiPut } from '../client'
import { SETTINGS_KEY, useSettings, useUpdateSettings } from '../use-settings'

jest.mock('../client', () => ({ apiGet: jest.fn(), apiPut: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>
const mockedApiPut = apiPut as jest.MockedFunction<typeof apiPut>

let queryClient: QueryClient

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

const saved: Settings = { ...DEFAULT_SETTINGS, chatTargets: 4 }
const wanted: Settings = { ...saved, chatTargets: 8, defaultStyle: 'formal' }

const cached = () => queryClient.getQueryData<Settings>([SETTINGS_KEY])

const submit = async (next: Settings) => {
  const { result } = await renderHook(() => useUpdateSettings(), { wrapper })
  await act(async () => {
    result.current.mutate(next)
  })

  return result
}

describe('useSettings', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiPut.mockReset()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false, gcTime: 0 } },
    })
  })

  afterEach(() => queryClient.clear())

  it('reads the saved settings', async () => {
    mockedApiGet.mockResolvedValue(saved)

    const { result } = await renderHook(() => useSettings(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(saved)
    expect(mockedApiGet).toHaveBeenCalledWith('/settings', expect.anything())
  })
})

describe('useUpdateSettings', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiPut.mockReset()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false, gcTime: 0 } },
    })
    queryClient.setQueryData([SETTINGS_KEY], saved)
  })

  afterEach(() => queryClient.clear())

  it('sends the whole settings document', async () => {
    mockedApiPut.mockResolvedValue(wanted)

    const result = await submit(wanted)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(mockedApiPut).toHaveBeenCalledWith('/settings', wanted, expect.anything())
  })

  it('shows the new values before the API answers', async () => {
    let answer: (settings: Settings) => void = () => {}
    mockedApiPut.mockReturnValue(new Promise<Settings>((resolve) => (answer = resolve)))

    const result = await submit(wanted)

    expect(cached()).toEqual(wanted)
    await act(async () => answer(wanted))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
  })

  it('puts the old values back when the API refuses', async () => {
    mockedApiPut.mockRejectedValue(new Error('PUT /settings failed with 400'))

    const result = await submit(wanted)

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(cached()).toEqual(saved)
  })

  it('does not let a slow earlier save overwrite a later one', async () => {
    const first: Settings = { ...saved, chatTargets: 6 }
    const second: Settings = { ...saved, chatTargets: 7 }
    const answers: ((settings: Settings) => void)[] = []
    mockedApiPut.mockImplementation(() => new Promise<Settings>((resolve) => answers.push(resolve)))
    mockedApiGet.mockResolvedValue(second)

    const { result } = await renderHook(() => useUpdateSettings(), { wrapper })
    await act(async () => {
      result.current.mutate(first)
      result.current.mutate(second)
    })

    await act(async () => {
      answers[1]?.(second)
      answers[0]?.(first)
    })

    await waitFor(() => expect(cached()).toEqual(second))
  })

  it('keeps what the API actually saved', async () => {
    const clamped: Settings = { ...wanted, chatTargets: 20 }
    mockedApiPut.mockResolvedValue(clamped)

    const result = await submit(wanted)

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(cached()).toEqual(clamped)
  })
})
