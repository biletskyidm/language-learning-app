import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react-native'
import { useLocalSearchParams } from 'expo-router'
import Sessions from '../../app/trainings/index'
import { apiGet } from '../api/client'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}))
jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))
jest.mock('../api/client', () => ({ ApiError: class extends Error {}, apiGet: jest.fn(), apiPost: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

const renderSessions = async (params: { status?: string }) => {
  jest.mocked(useLocalSearchParams).mockReturnValue(params)
  mockedApiGet.mockResolvedValue({ items: [] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <Sessions />
    </QueryClientProvider>,
  )
}

describe('Sessions', () => {
  beforeEach(() => mockedApiGet.mockReset())

  it('starts on the status passed in the route', async () => {
    await renderSessions({ status: 'ACTIVE' })

    expect(await screen.findByText('No sessions here yet')).toBeTruthy()
    expect(mockedApiGet.mock.calls.map(([path]) => path)).toEqual(['/trainings?status=ACTIVE'])
    expect(screen.getByRole('button', { name: 'Active', selected: true })).toBeTruthy()
  })

  it.each([{}, { status: 'NOPE' }])('shows every status for %j', async (params) => {
    await renderSessions(params)

    expect(await screen.findByText('No sessions here yet')).toBeTruthy()
    expect(mockedApiGet.mock.calls.map(([path]) => path)).toEqual(['/trainings'])
  })
})
