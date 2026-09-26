import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { ActionSheetIOS } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { DEFAULT_SETTINGS, type ProgressSummary, type TrainingSummary } from '@contracts'
import Home from '../../app/index'
import { apiGet } from '../api/client'

jest.mock('expo-router', () => ({
  Redirect: () => null,
  Stack: { Screen: () => null, Toolbar: Object.assign(() => null, { Button: () => null }) },
  router: { push: jest.fn() },
  useFocusEffect: (effect: () => void) => jest.requireActual<typeof React>('react').useEffect(effect, [effect]),
}))
jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))
jest.mock('../api/use-credentials', () => ({
  useCredentials: () => ({ isPending: false, data: { baseUrl: 'http://api', secret: 's' } }),
}))
jest.mock('../api/client', () => ({ UnauthorizedError: class extends Error {}, apiGet: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>
const showSheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions')

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

const session = (id: string, context: string): TrainingSummary => ({
  id,
  userId: 'me',
  type: 'chat',
  status: 'ACTIVE',
  context,
  style: 'informal',
  targets: [],
  createdAt: new Date('2026-01-02T00:00:00.000Z'),
})

const SKILLS = {
  contextCorrectness: 7,
  grammarAndSyntax: 6,
  vocabularyDiversity: 5,
  sentenceComplexity: 4,
  sentenceNaturalness: 8,
}

const SUMMARY: ProgressSummary = {
  dueNow: 3,
  unpracticed: 2,
  total: 5,
  week: [4, 0, 2, 0, 0, 0, 0],
  weakest: [weak('w1', 'run late', 2.5), weak('w2', 'break the ice', 6)],
  active: { count: 4, latest: [session('a1', 'a standup'), session('a2', 'a retro')] },
  scoreTrend: [...Array<null>(20).fill(null), 4, 4, 4.5, 5, 5, 5, 5.5, 6, 6, 6.2],
  chatSkills: { sessions: 1, averages: SKILLS },
}

const renderHome = async (summary: Partial<ProgressSummary> = {}) => {
  mockedApiGet.mockImplementation(async (path: string) => {
    if (path === '/settings') return { ...DEFAULT_SETTINGS, chatTargets: 6, describeTargets: 1 }
    return { ...SUMMARY, ...summary }
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
    showSheet.mockReset().mockImplementation(() => undefined)
    jest.mocked(router.push).mockReset()
  })

  it('shows placeholders until the summary arrives', async () => {
    await renderHome()

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
    expect(screen.queryByText('Weakest phrases')).toBeNull()

    expect(await screen.findByText('Weakest phrases')).toBeTruthy()
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0)
  })

  it('shows due and never-practiced counts out of the whole vocabulary', async () => {
    await renderHome()

    expect(await screen.findByLabelText('Due today: 3 of 5')).toBeTruthy()
    expect(screen.getByLabelText('Never practiced: 2 of 5')).toBeTruthy()
    expect(screen.getByText('3 / 5')).toBeTruthy()
    expect(screen.getByText('2 / 5')).toBeTruthy()
  })

  it('opens the vocabulary filtered to due phrases', async () => {
    await renderHome()

    await fireEvent.press(await screen.findByLabelText('Due today: 3 of 5'))

    expect(router.push).toHaveBeenCalledWith({ pathname: '/expressions', params: { due: 'true' } })
  })

  it('charts the expressions trained each day of the week', async () => {
    await renderHome()

    expect(await screen.findByLabelText('Mon: 4')).toBeTruthy()
    expect(screen.getByLabelText('Wed: 2')).toBeTruthy()
  })

  it('counts every active session but lists only the two newest', async () => {
    await renderHome()

    expect(await screen.findByText('Active sessions (4)')).toBeTruthy()
    expect(screen.getByText('a standup')).toBeTruthy()
    expect(screen.getByText('a retro')).toBeTruthy()
    expect(screen.queryByLabelText('Session menu')).toBeNull()
  })

  it('opens the sessions filtered to active from the active card', async () => {
    await renderHome()

    await fireEvent.press(await screen.findByText('Active sessions (4)'))

    expect(router.push).toHaveBeenCalledWith({ pathname: '/trainings', params: { status: 'ACTIVE' } })
  })

  it('hides the active and chat skills cards when there is nothing in them', async () => {
    await renderHome({ active: { count: 0, latest: [] }, chatSkills: { sessions: 0 } })

    expect(await screen.findByText('Weakest phrases')).toBeTruthy()
    expect(screen.queryByText(/Active sessions/)).toBeNull()
    expect(screen.queryByText(/Chat skills/)).toBeNull()
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

  it("headlines today's average score and its change over the month", async () => {
    await renderHome()

    expect(await screen.findByText('6.2')).toBeTruthy()
    expect(screen.getByText(/▲ 2\.2 since /)).toBeTruthy()
  })

  it('explains an empty score chart', async () => {
    await renderHome({ scoreTrend: Array<null>(30).fill(null) })

    expect(await screen.findByText('No practice in the last 30 days')).toBeTruthy()
  })

  it('averages chat skills over completed sessions', async () => {
    await renderHome()

    expect(await screen.findByText('Chat skills · 1 session')).toBeTruthy()
    expect(screen.getByText('Naturalness')).toBeTruthy()
    expect(screen.getByLabelText('Score 8.0 of 10')).toBeTruthy()
  })

  it('offers every practice mode but gaps, with the phrases each will use', async () => {
    await renderHome()

    await screen.findByText('Weakest phrases')
    await fireEvent.press(screen.getByRole('button', { name: /Practice/ }))

    const [[{ title, options }]] = showSheet.mock.calls
    expect(title).toBe('Start practice')
    expect(options).toEqual(['💬  Chat · 6 phrases', '🗣️  Describe it · 1 phrase', '🎒  Smuggle · 3 phrases', 'Cancel'])
  })

  it('opens practice on the mode picked in the sheet', async () => {
    await renderHome()

    await fireEvent.press(await screen.findByRole('button', { name: /Practice/ }))
    const [[{ options }, onPick]] = showSheet.mock.calls
    onPick(options.findIndex((option) => option.includes('Describe it')))
    onPick(options.indexOf('Cancel'))

    expect(router.push).toHaveBeenCalledTimes(1)
    expect(router.push).toHaveBeenCalledWith({ pathname: '/practice', params: { mode: 'describe' } })
  })
})
