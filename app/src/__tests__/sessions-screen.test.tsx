import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { ActionSheetIOS } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import Sessions from '../../app/trainings/index'
import { apiGet, apiPost } from '../api/client'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null, Toolbar: Object.assign(() => null, { Button: () => null }) },
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}))
jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))
jest.mock('../api/client', () => ({ ApiError: class extends Error {}, apiGet: jest.fn(), apiPost: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

const trainingFetches = () =>
  mockedApiGet.mock.calls.map(([path]) => path).filter((path) => path.startsWith('/trainings'))

const active = {
  id: 't1',
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context: 'a scrum standup',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const renderSessions = async (params: { status?: string }, items: unknown[] = []) => {
  jest.mocked(useLocalSearchParams).mockReturnValue(params)
  mockedApiGet.mockImplementation(async (path: string) => (path.startsWith('/trainings') ? { items } : {}))
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <Sessions />
    </QueryClientProvider>,
  )
}

describe('Sessions', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    jest.mocked(apiPost).mockReset()
  })

  it('starts on the status passed in the route', async () => {
    await renderSessions({ status: 'ACTIVE' })

    expect(await screen.findByText('No sessions here yet')).toBeTruthy()
    expect(trainingFetches()).toEqual(['/trainings?status=ACTIVE'])
    expect(screen.getByRole('button', { name: 'Active', selected: true })).toBeTruthy()
  })

  it.each([{}, { status: 'NOPE' }])('shows every status for %j', async (params) => {
    await renderSessions(params)

    expect(await screen.findByText('No sessions here yet')).toBeTruthy()
    expect(trainingFetches()).toEqual(['/trainings'])
  })

  it('offers no Gaps filter', async () => {
    await renderSessions({})

    expect(await screen.findByText('Describe-it')).toBeTruthy()
    expect(screen.queryByText('Gaps')).toBeNull()
  })

  it.each([
    ['End session', '/trainings/t1/complete'],
    ['Cancel session', '/trainings/t1/cancel'],
  ])('hides the row menu while %s is in flight', async (label, path) => {
    jest.mocked(apiPost).mockReturnValue(new Promise(() => undefined))
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(({ options }, onPick) =>
      onPick(options.indexOf(label)),
    )
    await renderSessions({}, [active])

    await fireEvent.press(await screen.findByLabelText('Session menu'))

    expect(jest.mocked(apiPost).mock.calls[0]?.[0]).toBe(path)
    await waitFor(() => expect(screen.queryByLabelText('Session menu')).toBeNull())
  })

  it('keeps every ending row hidden when a second row is ended before the first settles', async () => {
    jest.mocked(apiPost).mockReturnValue(new Promise(() => undefined))
    jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation(({ options }, onPick) =>
      onPick(options.indexOf('End session')),
    )
    await renderSessions({}, [active, { ...active, id: 't2', context: 'a retro' }])

    const [first] = await screen.findAllByLabelText('Session menu')
    await fireEvent.press(first!)
    await waitFor(() => expect(screen.getAllByLabelText('Session menu')).toHaveLength(1))
    await fireEvent.press(screen.getByLabelText('Session menu'))

    await waitFor(() => expect(screen.queryByLabelText('Session menu')).toBeNull())
    expect(jest.mocked(apiPost).mock.calls.map(([path]) => path)).toEqual([
      '/trainings/t1/complete',
      '/trainings/t2/complete',
    ])
  })
})
