import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import Home from '../../app/index'
import { apiGet } from '../api/client'

jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: { Screen: () => null },
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof React>('react').useEffect(effect, [effect]),
}))
jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))
jest.mock('../api/use-credentials', () => ({
  useCredentials: () => ({ isPending: false, data: { baseUrl: 'http://api', secret: 's' } }),
}))
jest.mock('../api/client', () => ({ UnauthorizedError: class extends Error {}, apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

const weak = (id: string, text: string, score: number) => ({
  id,
  userId: 'me',
  expression: text,
  type: 'idiom' as const,
  meaning: 'a meaning',
  examples: [],
  tags: [],
  frequency: 'common' as const,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  score,
  timesPracticed: 2,
  lastTimePracticedAt: new Date('2026-01-01T00:00:00.000Z'),
  nextTrainingAt: new Date('2026-01-08T00:00:00.000Z'),
})

const METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } }

const renderHome = async () => {
  mockedApiGet.mockImplementation(async (path: string) => {
    if (path === '/health') return { status: 'ok', db: 'ok' }
    return {
      dueNow: 7,
      unpracticed: 42,
      week: [4, 0, 2, 0, 0, 0, 0],
      weakest: [weak('w1', 'run late', 2.5), weak('w2', 'break the ice', 6)],
    }
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider initialMetrics={METRICS}>
        <Home />
      </SafeAreaProvider>
    </QueryClientProvider>,
  )
}

describe('Home', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    jest.mocked(router.push).mockReset()
  })

  it('shows how many phrases are due and how many were never practiced', async () => {
    await renderHome()

    expect(await screen.findByText('7 due today')).toBeTruthy()
    expect(screen.getByText('42 never practiced')).toBeTruthy()
  })

  it('opens the vocabulary filtered to due phrases', async () => {
    await renderHome()

    await fireEvent.press(await screen.findByText('7 due today'))

    expect(router.push).toHaveBeenCalledWith({ pathname: '/expressions', params: { due: 'true' } })
  })

  it('charts the expressions trained each day of the week', async () => {
    await renderHome()

    expect(await screen.findByLabelText('Mon: 4')).toBeTruthy()
    expect(screen.getByLabelText('Wed: 2')).toBeTruthy()
    expect(screen.queryByText('Active sessions')).toBeNull()
  })

  it('lists the weakest phrases with their score', async () => {
    await renderHome()

    expect(await screen.findByText('run late')).toBeTruthy()
    expect(screen.getByText('break the ice')).toBeTruthy()
    expect(screen.getByLabelText('Score 2.5 of 10')).toBeTruthy()
  })

  it('starts a session on the weakest phrase it is tapped on', async () => {
    await renderHome()

    await fireEvent.press(await screen.findByText('run late'))

    expect(router.push).toHaveBeenCalledWith({ pathname: '/practice', params: { expressionId: 'w1' } })
  })

  it.each([
    ['New chat', 'chat'],
    ['Gaps', 'gaps'],
    ['Describe', 'describe'],
    ['Smuggle', 'smuggle'],
  ])('starts %s from the start row', async (label, mode) => {
    await renderHome()

    await fireEvent.press(await screen.findByRole('button', { name: label }))

    expect(router.push).toHaveBeenCalledWith({ pathname: '/practice', params: { mode } })
  })
})
