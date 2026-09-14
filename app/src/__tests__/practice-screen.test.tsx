import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import type { Expression, Scenario } from '@contracts'
import Practice from '../../app/practice'
import { apiGet, apiPost } from '../api/client'

jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  router: { push: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({}),
}))
jest.mock('expo-crypto', () => ({ getRandomValues: jest.fn() }))
jest.mock('../api/client', () => ({ ApiError: class extends Error {}, apiGet: jest.fn(), apiPost: jest.fn() }))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>
const mockedApiPost = apiPost as jest.MockedFunction<typeof apiPost>

const expression = (id: string): Expression => ({
  id,
  userId: 'me',
  expression: `phrase ${id}`,
  type: 'idiom',
  meaning: 'a meaning',
  examples: [],
  tags: [],
  frequency: 'common',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
})

const settings = { chatTargets: 5, gapsTargets: 4, describeTargets: 1, smuggleTargets: 3, defaultStyle: 'informal' }

const vocabulary = Array.from({ length: 5 }, (_, index) => expression(`e${index}`))

const scenario: Scenario = {
  id: 's1',
  userId: 'me',
  name: 'Scrum standup',
  context: 'a scrum standup with my team',
  style: 'formal',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
}

const picks = (path: string) => ({
  items: vocabulary.slice(0, Number(new URLSearchParams(path.split('?')[1]).get('limit'))),
})

const rows = () => screen.queryAllByText(/^phrase e/)

const picked = () => mockedApiGet.mock.calls.map(([path]) => path).filter((path) => path.startsWith('/expressions/pick'))

const context = () => screen.getByPlaceholderText(/What is the situation/)

let queryClient: QueryClient

const renderPractice = async () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <Practice />
    </QueryClientProvider>,
  )
}

describe('Practice', () => {
  beforeEach(() => {
    mockedApiGet.mockReset()
    mockedApiPost.mockReset()
    mockedApiGet.mockImplementation(async (path: string) => {
      if (path === '/settings') return settings
      if (path === '/scenarios') return { items: [scenario] }
      if (path.startsWith('/expressions/pick')) return picks(path)
      return { items: vocabulary }
    })
  })

  it('picks as many phrases as the chat setting asks for', async () => {
    await renderPractice()

    await waitFor(() => expect(rows()).toHaveLength(5))
    expect(picked()).toEqual(['/expressions/pick?limit=5'])
  })

  it('re-picks for the mode the user switched to', async () => {
    await renderPractice()
    await waitFor(() => expect(rows()).toHaveLength(5))

    await fireEvent.press(screen.getByText('Gaps'))

    await waitFor(() => expect(rows()).toHaveLength(4))
    expect(picked()).toEqual(['/expressions/pick?limit=5', '/expressions/pick?limit=4'])
  })

  it('keeps the chat draft while another mode re-picks its targets', async () => {
    await renderPractice()
    await waitFor(() => expect(rows()).toHaveLength(5))
    await fireEvent.changeText(context(), 'a scrum standup')
    await fireEvent.press(screen.getByText('formal'))

    await fireEvent.press(screen.getByText('Gaps'))
    await waitFor(() => expect(rows()).toHaveLength(4))
    await fireEvent.press(screen.getByText('Chat'))

    await waitFor(() => expect(rows()).toHaveLength(5))
    expect(context().props.value).toBe('a scrum standup')
    expect(screen.getByText('formal').parent?.props.accessibilityState).toEqual({ selected: true })
  })

  it('fills the draft from a saved scenario and starts the chat with it', async () => {
    mockedApiPost.mockResolvedValue({ id: 't1', type: 'chat' })
    await renderPractice()
    await waitFor(() => expect(rows()).toHaveLength(5))

    await fireEvent.press(await screen.findByText('Scrum standup'))

    expect(context().props.value).toBe('a scrum standup with my team')
    expect(screen.getByText('formal').parent?.props.accessibilityState).toEqual({ selected: true })

    await fireEvent.press(screen.getByText('Start chat'))

    await waitFor(() => expect(mockedApiPost).toHaveBeenCalled())
    expect(mockedApiPost.mock.calls[0]?.[1]).toMatchObject({ type: 'chat', scenarioId: 's1' })
  })

  it('goes back to free text once the context is edited', async () => {
    mockedApiPost.mockResolvedValue({ id: 't1', type: 'chat' })
    await renderPractice()
    await waitFor(() => expect(rows()).toHaveLength(5))
    await fireEvent.press(await screen.findByText('Scrum standup'))

    await fireEvent.changeText(context(), 'a retro instead')
    await fireEvent.press(screen.getByText('Start chat'))

    await waitFor(() => expect(mockedApiPost).toHaveBeenCalled())
    expect(mockedApiPost.mock.calls[0]?.[1]).toMatchObject({
      type: 'chat',
      context: 'a retro instead',
      style: 'formal',
    })
    expect(mockedApiPost.mock.calls[0]?.[1]).not.toHaveProperty('scenarioId')
  })

  it('drops a preset that is no longer saved and falls back to its text', async () => {
    mockedApiPost.mockResolvedValue({ id: 't1', type: 'chat' })
    await renderPractice()
    await waitFor(() => expect(rows()).toHaveLength(5))
    await fireEvent.press(await screen.findByText('Scrum standup'))

    await act(async () => {
      queryClient.setQueryData(['scenarios'], { items: [] })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await fireEvent.press(screen.getByText('Start chat'))

    await waitFor(() => expect(mockedApiPost).toHaveBeenCalled())
    expect(mockedApiPost.mock.calls[0]?.[1]).toMatchObject({
      type: 'chat',
      context: 'a scrum standup with my team',
      style: 'formal',
    })
    expect(mockedApiPost.mock.calls[0]?.[1]).not.toHaveProperty('scenarioId')
  })

  it('follows an edit made on the manage screen', async () => {
    await renderPractice()
    await waitFor(() => expect(rows()).toHaveLength(5))
    await fireEvent.press(await screen.findByText('Scrum standup'))

    await act(async () => {
      queryClient.setQueryData(['scenarios'], { items: [{ ...scenario, context: 'a retro', style: 'informal' }] })
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(context().props.value).toBe('a retro')
    expect(screen.getByText('informal').parent?.props.accessibilityState).toEqual({ selected: true })
  })

  it('re-picks only when the mode actually changes', async () => {
    await renderPractice()
    await waitFor(() => expect(rows()).toHaveLength(5))

    await fireEvent.press(screen.getByText('Chat'))

    await waitFor(() => expect(picked()).toEqual(['/expressions/pick?limit=5']))
  })
})
